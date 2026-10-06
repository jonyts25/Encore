import AVFoundation
import ExpoModulesCore
import UIKit

extension String: Error {}

private struct RecordingResult {
  let uri: String
  let duration: Double
}

final class EncoreCameraView: ExpoView {
  let onCameraReady = EventDispatcher()
  let onCameraError = EventDispatcher()
  let onRecordingStarted = EventDispatcher()
  let onRecordingFinished = EventDispatcher()
  let onRecordingError = EventDispatcher()
  let onZoomChanged = EventDispatcher()
  let onAvailableCamerasChanged = EventDispatcher()
  let onTorchChanged = EventDispatcher()
  let onCameraSwitched = EventDispatcher()

  private let previewView = EncoreCameraPreviewView()
  private let sessionQueue = DispatchQueue(label: "com.encore.camera.session", qos: .userInitiated)
  private var captureSession: AVCaptureSession?
  private var videoDevice: AVCaptureDevice?
  private var selectedCameraId: String?
  private var movieFileOutput: AVCaptureMovieFileOutput?
  private var isConfigured = false
  private var shouldBeRunning = false
  private var isRecording = false
  private var recordingStartedAt: Date?
  private var currentRecordingURL: URL?
  private var maxRecordingDuration: Double?
  private var externalStartRecordingPromise: Promise?
  private var isRecordingStartPending = false
  private var stopRecordingPromise: Promise?
  private var currentZoomFactor: CGFloat = 1
  private var pinchStartZoom: CGFloat = 1
  private var focusResetWorkItem: DispatchWorkItem?
  private var desiredTorchEnabled = false
  private var currentFormatSelection: EncoreCameraFormatSelection?
  private var activeStabilizationMode = "off"
  private let hardwareButtons = EncoreCameraHardwareButtons()
  private let controlsCoordinator = EncoreCameraControlsCoordinator()
  private let lifecycleMonitor = EncoreCameraLifecycleMonitor()
  private var sessionWasRunningBeforeBackground = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    isUserInteractionEnabled = true

    previewView.translatesAutoresizingMaskIntoConstraints = false
    previewView.isUserInteractionEnabled = true
    previewView.previewLayer.videoGravity = .resizeAspectFill
    addSubview(previewView)

    NSLayoutConstraint.activate([
      previewView.topAnchor.constraint(equalTo: topAnchor),
      previewView.bottomAnchor.constraint(equalTo: bottomAnchor),
      previewView.leadingAnchor.constraint(equalTo: leadingAnchor),
      previewView.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])

    let pinch = UIPinchGestureRecognizer(target: self, action: #selector(handlePinch(_:)))
    pinch.delegate = self
    previewView.addGestureRecognizer(pinch)

    let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
    tap.delegate = self
    previewView.addGestureRecognizer(tap)
  }

  deinit {
    lifecycleMonitor.stop()
    shouldBeRunning = false
    isRecordingStartPending = false
  }

  func setActive(_ active: Bool) {
    shouldBeRunning = active
    if active {
      lifecycleMonitor.delegate = self
      lifecycleMonitor.start()
      configureHardwareButtons()
      startSession()
    } else {
      lifecycleMonitor.stop()
      hardwareButtons.setEnabled(false)
      hardwareButtons.detach(from: previewView)
      if isRecording {
        stopRecordingInternal { _ in
          self.stopSession()
        }
      } else {
        stopSession()
      }
    }
  }

  func getIsRecording() -> Bool {
    isRecording
  }

  func getZoomState() -> [String: Double] {
    currentZoomRange().asPayload()
  }

  func getAvailableCameras() -> [[String: String]] {
    EncoreCameraDiscovery.discoverCameras().map { $0.asDictionary() }
  }

  func getCameraState() -> [String: Any] {
    buildCameraStatePayload()
  }

  func getCapabilities() -> [String: Any] {
    EncoreCameraCapabilities.detect(device: videoDevice, session: captureSession)
  }

  func getSupportedFormats() -> [[String: Any]] {
    guard let device = videoDevice else { return [] }
    return EncoreCameraFormat.supportedFormats(for: device)
  }

  func getStabilizationState() -> [String: Any] {
    [
      "activeMode": activeStabilizationMode,
      "availableModes": movieFileOutput
        .flatMap { $0.connection(with: .video) }
        .map { EncoreCameraStabilization.availableModes(for: $0) } ?? ["off"],
    ]
  }

  func setFormat(width: Double, height: Double, fps: Double, promise: Promise) {
    sessionQueue.async { [weak self] in
      guard let self else { return }

      if self.isSwitchBlockedDuringRecording() {
        self.rejectOnMain(
          promise,
          code: "ERR_FORMAT",
          message: "Cannot change format while recording is in progress"
        )
        return
      }

      guard let device = self.videoDevice, let session = self.captureSession else {
        self.rejectOnMain(promise, code: "ERR_FORMAT", message: "Camera session is not available")
        return
      }

      let selection = EncoreCameraFormatSelection(
        width: Int32(width.rounded()),
        height: Int32(height.rounded()),
        fps: fps
      )

      do {
        let applied = try EncoreCameraFormat.apply(selection: selection, to: device, session: session)
        self.currentFormatSelection = applied
        self.currentZoomFactor = device.videoZoomFactor
        self.refreshConnectionsAfterFormatChange()
        self.configureSystemControls(session: session, device: device)

        let payload: [String: Any] = [
          "success": true,
          "width": Int(applied.width),
          "height": Int(applied.height),
          "fps": applied.fps,
          "stabilizationMode": self.activeStabilizationMode,
        ]
        DispatchQueue.main.async {
          promise.resolve(payload)
        }
      } catch let error as EncoreCameraFormatError {
        DispatchQueue.main.async {
          promise.resolve(error.payload)
        }
      } catch {
        self.rejectOnMain(promise, code: "ERR_FORMAT", message: error.localizedDescription)
      }
    }
  }

  func getTorchState() -> [String: Bool] {
    EncoreCameraTorchState.from(device: videoDevice).asPayload()
  }

  func setTorch(enabled: Bool, promise: Promise) {
    sessionQueue.async { [weak self] in
      guard let self else { return }

      guard let device = self.videoDevice else {
        self.rejectOnMain(promise, code: "ERR_TORCH", message: "Camera device is not available")
        return
      }

      do {
        self.desiredTorchEnabled = enabled
        let state = try EncoreCameraTorch.setEnabled(enabled, on: device)
        self.dispatchTorchChanged(state, promise: promise)
      } catch {
        let nsError = error as NSError
        self.rejectOnMain(
          promise,
          code: nsError.domain == "EncoreCamera" ? "ERR_TORCH_NOT_SUPPORTED" : "ERR_TORCH",
          message: error.localizedDescription
        )
      }
    }
  }

  func switchCamera(promise: Promise) {
    sessionQueue.async { [weak self] in
      guard let self else { return }

      if self.isSwitchBlockedDuringRecording() {
        self.rejectOnMain(
          promise,
          code: "ERR_CAMERA_SWITCH",
          message: "Cannot switch cameras while recording is in progress"
        )
        return
      }

      let targetPosition: AVCaptureDevice.Position
      if let current = self.videoDevice?.position, current != .unspecified {
        targetPosition = current == .back ? .front : .back
      } else {
        targetPosition = .front
      }

      guard let device = EncoreCameraDiscovery.preferredSingleCamera(for: targetPosition) else {
        self.rejectOnMain(
          promise,
          code: "ERR_CAMERA_NOT_FOUND",
          message: "No camera available for the requested position"
        )
        return
      }

      self.selectedCameraId = device.uniqueID

      guard let session = self.captureSession else {
        let payload = self.buildCameraStatePayload()
        DispatchQueue.main.async {
          self.dispatchCameraSwitchEvents(payload: payload)
          promise.resolve(payload)
        }
        return
      }

      do {
        let payload = try self.applyVideoDeviceSwitch(to: device, session: session, preserveZoom: true)
        DispatchQueue.main.async {
          self.dispatchCameraSwitchEvents(payload: payload)
          promise.resolve(payload)
        }
      } catch {
        self.rejectOnMain(promise, code: "ERR_CAMERA_SWITCH", message: error.localizedDescription)
      }
    }
  }

  func selectCamera(id: String, promise: Promise) {
    sessionQueue.async { [weak self] in
      guard let self else { return }

      guard EncoreCameraDiscovery.device(for: id) != nil else {
        self.rejectOnMain(promise, code: "ERR_CAMERA_NOT_FOUND", message: "Camera not found")
        return
      }

      if self.isSwitchBlockedDuringRecording() {
        self.rejectOnMain(
          promise,
          code: "ERR_CAMERA_SWITCH",
          message: "Cannot switch cameras while recording is in progress"
        )
        return
      }

      self.selectedCameraId = id

      guard let session = self.captureSession else {
        let payload = self.buildCameraStatePayload()
        DispatchQueue.main.async {
          self.dispatchCameraSwitchEvents(payload: payload)
          promise.resolve(payload)
        }
        return
      }

      guard let device = EncoreCameraDiscovery.device(for: id) else {
        self.rejectOnMain(promise, code: "ERR_CAMERA_NOT_FOUND", message: "Camera not found")
        return
      }

      do {
        let payload = try self.applyVideoDeviceSwitch(to: device, session: session, preserveZoom: true)
        DispatchQueue.main.async {
          self.dispatchCameraSwitchEvents(payload: payload)
          promise.resolve(payload)
        }
      } catch {
        self.rejectOnMain(promise, code: "ERR_CAMERA_SWITCH", message: error.localizedDescription)
      }
    }
  }

  func setZoom(factor: Double, promise: Promise) {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard let device = self.videoDevice else {
        self.rejectOnMain(promise, code: "ERR_ZOOM", message: "Camera device is not available")
        return
      }

      do {
        let range = self.currentZoomRange(for: device)
        let deviceFactor = CGFloat(factor) / EncoreCameraZoomRange.displayMultiplier(for: device)
        let updated = try EncoreCameraZoomApplier.apply(factor: deviceFactor, to: device, range: range)
        self.currentZoomFactor = updated.current
        self.dispatchZoomChanged(updated, promise: promise)
      } catch {
        self.rejectOnMain(promise, code: "ERR_ZOOM", message: error.localizedDescription)
      }
    }
  }

  func startRecording(maxDuration: Double?, promise: Promise) {
    sessionQueue.async { [weak self] in
      self?.beginRecording(maxDuration: maxDuration, externalPromise: promise)
    }
  }

  private func beginRecording(maxDuration: Double?, externalPromise: Promise?) {
    guard shouldBeRunning, captureSession != nil else {
      if let externalPromise {
        rejectOnMain(externalPromise, message: "Camera session is not running")
      }
      return
    }

    guard !isRecording, !isRecordingStartPending else {
      if let externalPromise {
        rejectOnMain(externalPromise, message: "Recording is already in progress")
      }
      return
    }

    isRecordingStartPending = true
    externalStartRecordingPromise = externalPromise
    maxRecordingDuration = maxDuration

    ensureMicrophoneAuthorized { [weak self] granted in
        guard let self else { return }
        guard granted else {
          self.rejectStartRecording(message: "Microphone permission denied")
          return
        }

        self.sessionQueue.async {
          guard let session = self.captureSession else {
            self.rejectStartRecording(message: "Camera session is not available")
            return
          }

          do {
            try self.configureAudioSession()
            try self.ensureMovieOutput(on: session)
            guard let movieOutput = self.movieFileOutput else {
              self.rejectStartRecording(message: "Unable to configure movie output")
              return
            }

            if let maxDuration = self.maxRecordingDuration, maxDuration > 0 {
              movieOutput.maxRecordedDuration = CMTime(
                seconds: maxDuration,
                preferredTimescale: 600
              )
            } else {
              movieOutput.maxRecordedDuration = .invalid
            }

            self.updateMovieOutputOrientation(movieOutput)

            let fileURL = self.makeTemporaryRecordingURL()
            self.currentRecordingURL = fileURL

            if session.isRunning {
              movieOutput.startRecording(to: fileURL, recordingDelegate: self)
            } else {
              session.startRunning()
              movieOutput.startRecording(to: fileURL, recordingDelegate: self)
            }
          } catch {
            self.rejectStartRecording(message: error.localizedDescription)
          }
        }
      }
  }

  func stopRecording(promise: Promise) {
    sessionQueue.async { [weak self] in
      guard let self else { return }

      guard self.isRecording || (self.movieFileOutput?.isRecording == true) else {
        if self.isRecordingStartPending {
          self.rejectOnMain(promise, message: "Recording is still starting")
        } else {
          self.rejectOnMain(promise, message: "No recording in progress")
        }
        return
      }

      self.stopRecordingPromise = promise
      self.stopRecordingInternal { _ in }
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    updatePreviewOrientation()
    sessionQueue.async { [weak self] in
      guard let self, let movieOutput = self.movieFileOutput else { return }
      self.updateMovieOutputOrientation(movieOutput)
    }
  }

  private func startSession() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      sessionQueue.async { [weak self] in
        self?.configureAndStartIfNeeded()
      }
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard let self else { return }
        if granted {
          self.sessionQueue.async {
            self.configureAndStartIfNeeded()
          }
        } else {
          self.dispatchError("Camera permission denied")
        }
      }
    case .denied, .restricted:
      dispatchError("Camera permission denied")
    @unknown default:
      dispatchError("Camera permission unavailable")
    }
  }

  private func configureAndStartIfNeeded() {
    guard shouldBeRunning else { return }

    let session: AVCaptureSession
    let isNewSession: Bool
    if let existing = captureSession {
      session = existing
      isNewSession = false
    } else {
      guard let configured = configureSession() else { return }
      session = configured
      captureSession = configured
      isNewSession = true
    }

    guard !session.isRunning else {
      dispatchReadyIfNeeded()
      return
    }

    session.startRunning()
    if isNewSession, let device = videoDevice {
      applyDefaultZoom(on: device)
    }
    dispatchReadyIfNeeded()
  }

  private func configureSession() -> AVCaptureSession? {
    let session = AVCaptureSession()
    session.beginConfiguration()
    session.sessionPreset = .high

    guard let device = resolveInitialCameraDevice() else {
      session.commitConfiguration()
      dispatchError("No compatible camera available")
      return nil
    }

    videoDevice = device
    selectedCameraId = device.uniqueID
    currentZoomFactor = device.videoZoomFactor

    do {
      try EncoreCameraFormat.applyDefaultConcertFormat(to: device, session: session)
      syncCurrentFormatSelection(from: device)
      try configureInitialFocusAndExposure(on: device)
      let input = try AVCaptureDeviceInput(device: device)
      guard session.canAddInput(input) else {
        session.commitConfiguration()
        dispatchError("Unable to add camera input")
        return nil
      }
      session.addInput(input)
    } catch {
      session.commitConfiguration()
      dispatchError(error.localizedDescription)
      return nil
    }

    session.commitConfiguration()
    applyDefaultZoom(on: device)
    configureSystemControls(session: session, device: device)

    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.previewView.previewLayer.session = session
      self.updatePreviewOrientation()
    }

    isConfigured = true
    lifecycleMonitor.observeCaptureSession(session)
    return session
  }

  private func ensureMovieOutput(on session: AVCaptureSession) throws {
    if let movieFileOutput {
      updateMovieOutputOrientation(movieFileOutput)
      return
    }

    session.beginConfiguration()
    defer { session.commitConfiguration() }

    if let audioDevice = AVCaptureDevice.default(for: .audio) {
      let existingAudioInputs = session.inputs.compactMap { $0 as? AVCaptureDeviceInput }
        .filter { $0.device.hasMediaType(.audio) }

      if existingAudioInputs.isEmpty {
        let audioInput = try AVCaptureDeviceInput(device: audioDevice)
        guard session.canAddInput(audioInput) else {
          throw NSError(
            domain: "EncoreCamera",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Unable to add microphone input"]
          )
        }
        session.addInput(audioInput)
      }
    } else {
      throw NSError(
        domain: "EncoreCamera",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "Microphone not available"]
      )
    }

    let movieOutput = AVCaptureMovieFileOutput()
    guard session.canAddOutput(movieOutput) else {
      throw NSError(
        domain: "EncoreCamera",
        code: 3,
        userInfo: [NSLocalizedDescriptionKey: "Unable to add movie output"]
      )
    }
    session.addOutput(movieOutput)
    movieFileOutput = movieOutput
    updateMovieOutputOrientation(movieOutput)
  }

  private func configureAudioSession() throws {
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(
      .playAndRecord,
      mode: .videoRecording,
      options: [.defaultToSpeaker, .allowBluetooth]
    )
    try audioSession.setActive(true)
  }

  private func ensureMicrophoneAuthorized(completion: @escaping (Bool) -> Void) {
    switch AVCaptureDevice.authorizationStatus(for: .audio) {
    case .authorized:
      completion(true)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .audio, completionHandler: completion)
    case .denied, .restricted:
      completion(false)
    @unknown default:
      completion(false)
    }
  }

  private func makeTemporaryRecordingURL() -> URL {
    FileManager.default.temporaryDirectory
      .appendingPathComponent("encore-recording-\(UUID().uuidString).mov")
  }

  private func stopRecordingInternal(completion: @escaping (Result<RecordingResult, String>) -> Void) {
    guard let movieOutput = movieFileOutput, movieOutput.isRecording else {
      completion(.failure("No recording in progress"))
      return
    }

    if stopRecordingPromise == nil {
      // Internal stop (e.g. view deactivated) without an external promise.
      stopRecordingInternalCompletion = completion
    }

    movieOutput.stopRecording()
  }

  private var stopRecordingInternalCompletion: ((Result<RecordingResult, String>) -> Void)?

  private func stopSession() {
    lifecycleMonitor.stop()

    sessionQueue.async { [weak self] in
      guard let self else { return }

      if self.isRecording || (self.movieFileOutput?.isRecording == true) {
        self.stopRecordingInternal { _ in }
      }

      if let session = self.captureSession {
        self.controlsCoordinator.clear(session: session)
        session.stopRunning()
      }

      self.isConfigured = false
      self.isRecording = false
      self.isRecordingStartPending = false
      self.captureSession = nil
      self.movieFileOutput = nil
      self.videoDevice = nil
      self.selectedCameraId = nil
      self.currentZoomFactor = 1
      self.currentFormatSelection = nil
      self.activeStabilizationMode = "off"
      self.externalStartRecordingPromise = nil
      self.stopRecordingPromise = nil
      self.stopRecordingInternalCompletion = nil
      self.currentRecordingURL = nil
      self.recordingStartedAt = nil

      DispatchQueue.main.async {
        self.previewView.previewLayer.session = nil
        self.focusResetWorkItem?.cancel()
        self.focusResetWorkItem = nil
        self.hardwareButtons.detach(from: self.previewView)
      }
    }
  }

  private func configureHardwareButtons() {
    hardwareButtons.attach(to: previewView, isActive: { [weak self] in
      self?.shouldBeRunning == true
    }, onPrimaryPress: { [weak self] in
      self?.handleHardwareCapturePress()
    })
  }

  private func handleHardwareCapturePress() {
    sessionQueue.async { [weak self] in
      guard let self, self.shouldBeRunning else { return }

      if self.isRecording || (self.movieFileOutput?.isRecording == true) {
        if self.stopRecordingPromise == nil {
          self.stopRecordingInternal { _ in }
        }
        return
      }

      guard !self.isRecordingStartPending else { return }
      self.beginRecording(maxDuration: nil, externalPromise: nil)
    }
  }

  private func configureSystemControls(session: AVCaptureSession, device: AVCaptureDevice) {
    controlsCoordinator.configure(session: session, device: device) { [weak self] zoomFactor in
      guard let self else { return }
      self.sessionQueue.async {
        self.currentZoomFactor = zoomFactor
        let range = self.currentZoomRange(for: device)
        DispatchQueue.main.async {
          self.onZoomChanged(range.asPayload())
        }
      }
    }
  }

  private func refreshConnectionsAfterFormatChange() {
    updatePreviewOrientation()
    if let previewConnection = previewView.previewLayer.connection {
      activeStabilizationMode = EncoreCameraStabilization.applyBestAvailable(to: previewConnection)
    }
    if let movieOutput = movieFileOutput {
      updateMovieOutputOrientation(movieOutput)
    }
  }

  @objc private func handlePinch(_ gesture: UIPinchGestureRecognizer) {
    switch gesture.state {
    case .began:
      pinchStartZoom = currentZoomFactor
    case .changed:
      let targetZoom = pinchStartZoom * gesture.scale
      sessionQueue.async { [weak self] in
        guard let self, let device = self.videoDevice else { return }
        do {
          let range = self.currentZoomRange(for: device)
          let updated = try EncoreCameraZoomApplier.apply(factor: targetZoom, to: device, range: range)
          self.currentZoomFactor = updated.current
          self.dispatchZoomChanged(updated)
        } catch {
          // Ignore transient pinch failures.
        }
      }
    default:
      break
    }
  }

  @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
    guard gesture.state == .ended else { return }

    let layerPoint = gesture.location(in: previewView)
    let devicePoint = previewView.previewLayer.captureDevicePointConverted(fromLayerPoint: layerPoint)

    sessionQueue.async { [weak self] in
      guard let self, let device = self.videoDevice else { return }

      do {
        try EncoreCameraFocus.focusAndExpose(at: devicePoint, device: device)
        self.scheduleContinuousFocusReset()
      } catch {
        // Ignore transient focus failures.
      }
    }
  }

  private func configureInitialFocusAndExposure(on device: AVCaptureDevice) throws {
    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    if device.isFocusModeSupported(.continuousAutoFocus) {
      device.focusMode = .continuousAutoFocus
    }

    if device.isExposureModeSupported(.continuousAutoExposure) {
      device.exposureMode = .continuousAutoExposure
    }
  }

  /// Sets the zoom that shows as 1× on screen (the wide lens on multi-lens devices).
  private func applyDefaultZoom(on device: AVCaptureDevice) {
    do {
      let range = EncoreCameraZoomRange.from(device: device, currentZoom: device.videoZoomFactor)
      let updated = try EncoreCameraZoomApplier.apply(
        factor: EncoreCameraZoomRange.defaultZoomFactor(for: device),
        to: device,
        range: range
      )
      currentZoomFactor = updated.current
    } catch {
      currentZoomFactor = device.videoZoomFactor
    }
  }

  private func currentZoomRange(for device: AVCaptureDevice? = nil) -> EncoreCameraZoomRange {
    let resolvedDevice = device ?? videoDevice
    guard let resolvedDevice else {
      return EncoreCameraZoomRange(
        current: currentZoomFactor,
        usableMin: 1,
        usableMax: 1,
        technicalMin: 1,
        technicalMax: 1
      )
    }

    return EncoreCameraZoomRange.from(device: resolvedDevice, currentZoom: currentZoomFactor)
  }

  private func dispatchZoomChanged(_ range: EncoreCameraZoomRange, promise: Promise? = nil) {
    let payload = range.asPayload()
    DispatchQueue.main.async { [weak self] in
      self?.onZoomChanged(payload)
      promise?.resolve(payload)
    }
  }

  private func scheduleContinuousFocusReset() {
    focusResetWorkItem?.cancel()

    let workItem = DispatchWorkItem { [weak self] in
      guard let self else { return }
      self.sessionQueue.async {
        guard let device = self.videoDevice else { return }
        do {
          try EncoreCameraFocus.resetContinuous(on: device)
        } catch {
          // Ignore transient reset failures.
        }
      }
    }

    focusResetWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: workItem)
  }

  private func updatePreviewOrientation() {
    guard let connection = previewView.previewLayer.connection else { return }
    if connection.isVideoOrientationSupported {
      connection.videoOrientation = .portrait
    }
    activeStabilizationMode = EncoreCameraStabilization.applyBestAvailable(to: connection)
  }

  private func updateMovieOutputOrientation(_ movieOutput: AVCaptureMovieFileOutput) {
    guard let connection = movieOutput.connection(with: .video) else { return }
    if connection.isVideoOrientationSupported {
      connection.videoOrientation = .portrait
    }
    activeStabilizationMode = EncoreCameraStabilization.applyBestAvailable(to: connection)
  }

  private func resolveRecordingDuration(for url: URL) -> Double {
    let asset = AVURLAsset(url: url)
    let seconds = CMTimeGetSeconds(asset.duration)
    if seconds.isFinite, seconds > 0 {
      return seconds
    }
    if let startedAt = recordingStartedAt {
      return Date().timeIntervalSince(startedAt)
    }
    return 0
  }

  private func syncCurrentFormatSelection(from device: AVCaptureDevice) {
    let dimensions = CMVideoFormatDescriptionGetDimensions(device.activeFormat.formatDescription)
    let frameDuration = CMTimeGetSeconds(device.activeVideoMaxFrameDuration)
    let fps = frameDuration > 0 ? 1.0 / frameDuration : 30
    currentFormatSelection = EncoreCameraFormatSelection(
      width: dimensions.width,
      height: dimensions.height,
      fps: fps
    )
  }

  private func resolveInitialCameraDevice() -> AVCaptureDevice? {
    if let selectedCameraId,
       let selected = EncoreCameraDiscovery.device(for: selectedCameraId) {
      return selected
    }
    return EncoreCameraDiscovery.preferredDefaultCamera()
  }

  private func isSwitchBlockedDuringRecording() -> Bool {
    isRecording || (movieFileOutput?.isRecording == true) || isRecordingStartPending
  }

  private func activeCameraPositionKey() -> String {
    guard let device = videoDevice else { return "unspecified" }
    switch device.position {
    case .back: return "back"
    case .front: return "front"
    default: return "unspecified"
    }
  }

  private func applyVideoDeviceSwitch(
    to device: AVCaptureDevice,
    session: AVCaptureSession,
    preserveZoom: Bool
  ) throws -> [String: Any] {
    try switchVideoInput(to: device, session: session)
    videoDevice = device
    selectedCameraId = device.uniqueID

    if let format = currentFormatSelection,
       EncoreCameraFormat.findFormat(on: device, matching: format) != nil {
      _ = try EncoreCameraFormat.apply(selection: format, to: device, session: session)
    } else {
      try EncoreCameraFormat.applyDefaultConcertFormat(to: device, session: session)
    }
    syncCurrentFormatSelection(from: device)

    try configureInitialFocusAndExposure(on: device)

    applyDefaultZoom(on: device)

    if desiredTorchEnabled && EncoreCameraTorch.isSupported(on: device) {
      _ = try EncoreCameraTorch.setEnabled(true, on: device)
    } else {
      desiredTorchEnabled = false
      try EncoreCameraTorch.turnOffIfNeeded(on: device)
    }

    if let movieOutput = movieFileOutput {
      updateMovieOutputOrientation(movieOutput)
    }

    configureSystemControls(session: session, device: device)
    return buildCameraStatePayload()
  }

  private func dispatchCameraSwitchEvents(payload: [String: Any]) {
    if let device = videoDevice {
      onZoomChanged(currentZoomRange(for: device).asPayload())
    }
    onAvailableCamerasChanged([
      "availableCameras": payload["availableCameras"] as Any,
      "selectedCameraId": payload["selectedCameraId"] as Any,
    ])
    onTorchChanged(torchPayload())
    onCameraSwitched([
      "activeCameraPosition": payload["activeCameraPosition"] as Any,
      "selectedCameraId": payload["selectedCameraId"] as Any,
    ])
  }

  private func switchVideoInput(to device: AVCaptureDevice, session: AVCaptureSession) throws {
    let newInput = try AVCaptureDeviceInput(device: device)

    session.beginConfiguration()
    defer { session.commitConfiguration() }

    for input in session.inputs {
      if let deviceInput = input as? AVCaptureDeviceInput,
         deviceInput.device.hasMediaType(.video) {
        session.removeInput(deviceInput)
      }
    }

    guard session.canAddInput(newInput) else {
      throw NSError(
        domain: "EncoreCamera",
        code: 10,
        userInfo: [NSLocalizedDescriptionKey: "Unable to switch to the selected camera"]
      )
    }

    session.addInput(newInput)
  }

  private func buildCameraStatePayload() -> [String: Any] {
    var payload: [String: Any] = currentZoomRange().asPayload()
    payload["availableCameras"] = getAvailableCameras()
    payload["selectedCameraId"] = selectedCameraId
    payload["lensZoomFactors"] = videoDevice.map { EncoreCameraZoomRange.lensDisplayFactors(for: $0) } ?? [1.0]
    payload.merge(torchPayload()) { _, new in new }
    payload["activeCameraPosition"] = activeCameraPositionKey()
    payload["capabilities"] = getCapabilities()
    if let currentFormatSelection {
      payload["activeFormat"] = [
        "width": Int(currentFormatSelection.width),
        "height": Int(currentFormatSelection.height),
        "fps": currentFormatSelection.fps,
      ]
    }
    payload["activeStabilizationMode"] = activeStabilizationMode
    return payload
  }

  private func torchPayload() -> [String: Bool] {
    EncoreCameraTorchState.from(device: videoDevice).asPayload()
  }

  private func dispatchTorchChanged(_ state: EncoreCameraTorchState, promise: Promise? = nil) {
    let payload = state.asPayload()
    DispatchQueue.main.async { [weak self] in
      self?.onTorchChanged(payload)
      promise?.resolve(payload)
    }
  }

  private func dispatchReadyIfNeeded() {
    guard shouldBeRunning else { return }
    let payload = buildCameraStatePayload()
    let zoomPayload = currentZoomRange().asPayload()
    let torchPayload = torchPayload()
    DispatchQueue.main.async { [weak self] in
      self?.onCameraReady(payload)
      self?.onZoomChanged(zoomPayload)
      self?.onAvailableCamerasChanged([
        "availableCameras": payload["availableCameras"] as Any,
        "selectedCameraId": payload["selectedCameraId"] as Any,
      ])
      self?.onTorchChanged(torchPayload)
    }
  }

  private func dispatchError(_ message: String) {
    DispatchQueue.main.async { [weak self] in
      self?.onCameraError(["message": message])
    }
  }

  private func dispatchRecordingError(_ message: String) {
    DispatchQueue.main.async { [weak self] in
      self?.onRecordingError(["message": message])
    }
  }

  private func rejectOnMain(_ promise: Promise, code: String = "ERR_RECORDING", message: String) {
    DispatchQueue.main.async {
      promise.rejectEncore(code, message)
    }
  }

  private func rejectStartRecording(message: String) {
    let promise = externalStartRecordingPromise
    isRecordingStartPending = false
    externalStartRecordingPromise = nil
    maxRecordingDuration = nil
    currentRecordingURL = nil

    if let promise {
      rejectOnMain(promise, message: message)
    }
    dispatchRecordingError(message)
  }

  private func finishStartRecording() {
    let promise = externalStartRecordingPromise
    isRecordingStartPending = false
    externalStartRecordingPromise = nil
    DispatchQueue.main.async { [weak self] in
      self?.onRecordingStarted([:])
      promise?.resolve([:])
    }
  }

  private func finishStopRecording(result: RecordingResult) {
    let payload: [String: Any] = [
      "uri": result.uri,
      "duration": result.duration,
    ]

    if let promise = stopRecordingPromise {
      stopRecordingPromise = nil
      DispatchQueue.main.async { [weak self] in
        self?.onRecordingFinished(payload)
        promise.resolve(payload)
      }
    } else {
      DispatchQueue.main.async { [weak self] in
        self?.onRecordingFinished(payload)
      }
    }

    stopRecordingInternalCompletion?(.success(result))
    stopRecordingInternalCompletion = nil
  }

  private func failStopRecording(message: String) {
    if let promise = stopRecordingPromise {
      stopRecordingPromise = nil
      rejectOnMain(promise, message: message)
    }
    dispatchRecordingError(message)
    stopRecordingInternalCompletion?(.failure(message))
    stopRecordingInternalCompletion = nil
  }
}

extension EncoreCameraView: EncoreCameraLifecycleDelegate {
  func encoreCameraDidEnterBackground() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      self.sessionWasRunningBeforeBackground = self.captureSession?.isRunning == true

      if self.isRecording || (self.movieFileOutput?.isRecording == true) {
        self.stopRecordingInternal { _ in }
      }

      self.captureSession?.stopRunning()
    }
  }

  func encoreCameraWillEnterForeground() {
    sessionQueue.async { [weak self] in
      guard let self, self.shouldBeRunning else { return }

      if self.sessionWasRunningBeforeBackground {
        self.captureSession?.startRunning()
      } else {
        self.configureAndStartIfNeeded()
      }
    }
  }

  func encoreCameraAudioSessionInterruptionBegan() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      if self.isRecording || (self.movieFileOutput?.isRecording == true) {
        self.stopRecordingInternal { _ in }
      }
    }
  }

  func encoreCameraAudioSessionInterruptionEnded(shouldResume: Bool) {
    guard shouldResume, shouldBeRunning else { return }
    sessionQueue.async { [weak self] in
      self?.configureAndStartIfNeeded()
    }
  }

  func encoreCameraCaptureSessionRuntimeError(_ error: Error) {
    dispatchError(error.localizedDescription)
    sessionQueue.async { [weak self] in
      guard let self, self.shouldBeRunning else { return }
      if self.captureSession?.isRunning == false {
        self.captureSession?.startRunning()
      }
    }
  }

  func encoreCameraCaptureSessionWasInterrupted(reason: String) {
    dispatchError("Camera interrupted: \(reason)")
    if reason.contains("audioDeviceInUse") || reason.contains("videoDeviceInUse") {
      sessionQueue.async { [weak self] in
        guard let self else { return }
        if self.isRecording || (self.movieFileOutput?.isRecording == true) {
          self.stopRecordingInternal { _ in }
        }
      }
    }
  }

  func encoreCameraCaptureSessionInterruptionEnded() {
    sessionQueue.async { [weak self] in
      guard let self, self.shouldBeRunning else { return }
      self.configureAndStartIfNeeded()
    }
  }

  func encoreCameraDeviceWasDisconnected(_ device: AVCaptureDevice) {
    dispatchError("Camera disconnected: \(device.localizedName)")
    sessionQueue.async { [weak self] in
      guard let self, self.shouldBeRunning else { return }

      if self.isRecording || (self.movieFileOutput?.isRecording == true) {
        self.stopRecordingInternal { _ in }
      }

      self.isConfigured = false
      if let session = self.captureSession {
        self.controlsCoordinator.clear(session: session)
        session.stopRunning()
      }
      self.captureSession = nil
      self.movieFileOutput = nil
      self.videoDevice = nil
      self.configureAndStartIfNeeded()
    }
  }
}

extension EncoreCameraView: UIGestureRecognizerDelegate {
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    true
  }
}

extension EncoreCameraView: AVCaptureFileOutputRecordingDelegate {
  func fileOutput(
    _ output: AVCaptureFileOutput,
    didStartRecordingTo fileURL: URL,
    from connections: [AVCaptureConnection]
  ) {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      self.isRecording = true
      self.recordingStartedAt = Date()
      self.finishStartRecording()
    }
  }

  func fileOutput(
    _ output: AVCaptureFileOutput,
    didFinishRecordingTo outputFileURL: URL,
    from connections: [AVCaptureConnection],
    error: Error?
  ) {
    sessionQueue.async { [weak self] in
      guard let self else { return }

      self.isRecording = false
      self.recordingStartedAt = nil
      self.currentRecordingURL = nil
      self.maxRecordingDuration = nil

      if let error {
        let nsError = error as NSError
        let finishedSuccessfully = nsError.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool ?? false
        if !finishedSuccessfully {
          self.failStopRecording(message: error.localizedDescription)
          return
        }
      }

      if let validationError = EncoreCameraRecordingValidator.validateRecordingFile(at: outputFileURL) {
        self.failStopRecording(message: validationError)
        return
      }

      let duration = self.resolveRecordingDuration(for: outputFileURL)
      let result = RecordingResult(uri: outputFileURL.absoluteString, duration: duration)
      self.finishStopRecording(result: result)
    }
  }
}
