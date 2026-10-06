import AVFoundation
import ExpoModulesCore
import UIKit

struct EncoreMultiCamPreviewState {
  let backFormat: EncoreCameraFormatSelection
  let frontFormat: EncoreCameraFormatSelection
  let hardwareCost: Float
  let systemPressureCost: Float
}

struct EncoreMultiCamRecordingResult {
  let backVideoURL: String
  let frontVideoURL: String
  let duration: Double
  let startTimestamp: String
  let metadata: [String: Any]
}

final class EncoreMultiCamSessionManager: NSObject {
  static let shared = EncoreMultiCamSessionManager()

  private let queue = DispatchQueue(label: "com.encore.multicam.session", qos: .userInitiated)

  private var session: AVCaptureMultiCamSession?
  private var backDevice: AVCaptureDevice?
  private var frontDevice: AVCaptureDevice?
  private var backPreviewLayer: AVCaptureVideoPreviewLayer?
  private var frontPreviewLayer: AVCaptureVideoPreviewLayer?
  private var backMovieOutput: AVCaptureMovieFileOutput?
  private var frontMovieOutput: AVCaptureMovieFileOutput?
  private var audioInput: AVCaptureDeviceInput?

  private var previewState: EncoreMultiCamPreviewState?
  private var isRecording = false
  private var recordingStartedAt: Date?
  private var recordingStartISO8601: String?
  private var backRecordingURL: URL?
  private var frontRecordingURL: URL?
  private var stopRecordingPromise: Promise?
  private var pendingBackFinished = false
  private var pendingFrontFinished = false
  private var recordingDuration: Double = 0
  private var recordingMetadata: [String: Any] = [:]
  private var recordingErrorMessage: String?
  private let lifecycleMonitor = EncoreCameraLifecycleMonitor()
  private var previewWasRunningBeforeBackground = false

  private override init() {
    super.init()
    lifecycleMonitor.delegate = self
  }

  func startPreview(promise: Promise) {
    queue.async {
      do {
        let state = try self.configurePreviewSession()
        self.session?.startRunning()
        self.previewState = state
        DispatchQueue.main.async {
          promise.resolve(self.previewPayload(state: state))
        }
      } catch let error as EncoreMultiCamSessionError {
        DispatchQueue.main.async {
          promise.rejectEncore(error.code, error.message)
        }
      } catch {
        DispatchQueue.main.async {
          promise.rejectEncore("ERR_MULTICAM", error.localizedDescription)
        }
      }
    }
  }

  func stopPreview() {
    queue.async {
      self.lifecycleMonitor.stop()
      if self.isRecording {
        self.backMovieOutput?.stopRecording()
        self.frontMovieOutput?.stopRecording()
        self.isRecording = false
      }
      self.tearDownRecordingOutputs()
      self.session?.stopRunning()
      self.detachPreviewLayers()
      self.session = nil
      self.backDevice = nil
      self.frontDevice = nil
      self.previewState = nil
      self.stopRecordingPromise = nil
      self.recordingErrorMessage = nil
    }
  }

  func stopAll() {
    queue.async {
      if self.isRecording {
        self.backMovieOutput?.stopRecording()
        self.frontMovieOutput?.stopRecording()
      }
      self.stopPreview()
      self.isRecording = false
    }
  }

  func stopRecordingIfNeeded() {
    queue.async {
      guard self.isRecording else { return }
      self.backMovieOutput?.stopRecording()
      self.frontMovieOutput?.stopRecording()
    }
  }

  func attachBackPreviewLayer(_ layer: AVCaptureVideoPreviewLayer) {
    queue.async {
      self.backPreviewLayer = layer
      layer.videoGravity = .resizeAspectFill
      if let session = self.session, let connection = self.backPreviewConnection(in: session, layer: layer) {
        if connection.isVideoOrientationSupported {
          connection.videoOrientation = .portrait
        }
      }
    }
  }

  func attachFrontPreviewLayer(_ layer: AVCaptureVideoPreviewLayer) {
    queue.async {
      self.frontPreviewLayer = layer
      layer.videoGravity = .resizeAspectFill
      if let session = self.session, let connection = self.frontPreviewConnection(in: session, layer: layer) {
        if connection.isVideoOrientationSupported {
          connection.videoOrientation = .portrait
        }
        if connection.isVideoMirroringSupported {
          connection.automaticallyAdjustsVideoMirroring = false
          connection.isVideoMirrored = true
        }
      }
    }
  }

  func detachBackPreviewLayer(_ layer: AVCaptureVideoPreviewLayer) {
    queue.async {
      if self.backPreviewLayer === layer {
        self.backPreviewLayer = nil
        layer.session = nil
      }
    }
  }

  func detachFrontPreviewLayer(_ layer: AVCaptureVideoPreviewLayer) {
    queue.async {
      if self.frontPreviewLayer === layer {
        self.frontPreviewLayer = nil
        layer.session = nil
      }
    }
  }

  func startRecording(promise: Promise) {
    queue.async {
      guard let session = self.session, self.previewState != nil else {
        DispatchQueue.main.async {
          promise.rejectEncore("ERR_MULTICAM_RECORD", "MultiCam preview must be running before recording")
        }
        return
      }

      guard !self.isRecording else {
        DispatchQueue.main.async {
          promise.rejectEncore("ERR_MULTICAM_RECORD", "MultiCam recording is already in progress")
        }
        return
      }

      do {
        try self.configureRecordingOutputs(on: session)
        try self.configureAudioSession()

        let startDate = Date()
        self.recordingStartedAt = startDate
        self.recordingStartISO8601 = ISO8601DateFormatter().string(from: startDate)
        self.backRecordingURL = self.makeTemporaryRecordingURL(prefix: "encore-multicam-back")
        self.frontRecordingURL = self.makeTemporaryRecordingURL(prefix: "encore-multicam-front")
        self.recordingMetadata = self.buildRecordingMetadata()
        self.pendingBackFinished = false
        self.pendingFrontFinished = false
        self.recordingErrorMessage = nil

        guard let backURL = self.backRecordingURL, let frontURL = self.frontRecordingURL,
              let backMovieOutput = self.backMovieOutput,
              let frontMovieOutput = self.frontMovieOutput else {
          throw EncoreMultiCamSessionError.recordingSetupFailed
        }

        backMovieOutput.startRecording(to: backURL, recordingDelegate: self)
        frontMovieOutput.startRecording(to: frontURL, recordingDelegate: self)
        self.isRecording = true

        DispatchQueue.main.async {
          promise.resolve([
            "started": true,
            "startTimestamp": self.recordingStartISO8601 as Any,
          ])
        }
      } catch {
        DispatchQueue.main.async {
          promise.rejectEncore(
            "ERR_MULTICAM_RECORD",
            (error as? EncoreMultiCamSessionError)?.message ?? error.localizedDescription
          )
        }
      }
    }
  }

  func stopRecording(promise: Promise) {
    queue.async {
      guard self.isRecording else {
        DispatchQueue.main.async {
          promise.rejectEncore("ERR_MULTICAM_RECORD", "No MultiCam recording in progress")
        }
        return
      }

      self.stopRecordingPromise = promise
      self.backMovieOutput?.stopRecording()
      self.frontMovieOutput?.stopRecording()
    }
  }

  private func configurePreviewSession() throws -> EncoreMultiCamPreviewState {
    guard EncoreMultiCamDiscovery.isSupported() else {
      throw EncoreMultiCamSessionError.notSupported
    }

    guard backPreviewLayer != nil, frontPreviewLayer != nil else {
      throw EncoreMultiCamSessionError.previewLayersNotAttached
    }

    guard let backDevice = EncoreCameraDiscovery.preferredCamera(for: .back),
          let frontDevice = EncoreCameraDiscovery.preferredCamera(for: .front) else {
      throw EncoreMultiCamSessionError.devicesUnavailable
    }

    guard let candidate = EncoreMultiCamDiscovery.discoverFormatCandidates().first else {
      throw EncoreMultiCamSessionError.noSupportedCombination(
        suggested: EncoreMultiCamDiscovery.discoverFormatCandidates().map { $0.label }
      )
    }

    tearDownRecordingOutputs()
    session?.stopRunning()
    detachPreviewLayers()

    let session = AVCaptureMultiCamSession()
    session.beginConfiguration()
    defer { session.commitConfiguration() }

    try applyFormat(candidate.back, to: backDevice)
    try applyFormat(candidate.front, to: frontDevice)

    let backInput = try AVCaptureDeviceInput(device: backDevice)
    let frontInput = try AVCaptureDeviceInput(device: frontDevice)

    guard session.canAddInput(backInput), session.canAddInput(frontInput) else {
      throw EncoreMultiCamSessionError.inputRejected
    }

    session.addInputWithNoConnections(backInput)
    session.addInputWithNoConnections(frontInput)

    let backLayer = backPreviewLayer ?? AVCaptureVideoPreviewLayer()
    let frontLayer = frontPreviewLayer ?? AVCaptureVideoPreviewLayer()

    guard let backPort = backInput.ports.first(where: { $0.mediaType == .video }),
          let frontPort = frontInput.ports.first(where: { $0.mediaType == .video }) else {
      throw EncoreMultiCamSessionError.previewPortsUnavailable
    }

    backLayer.setSessionWithNoConnection(session)
    frontLayer.setSessionWithNoConnection(session)

    let backConnection = AVCaptureConnection(inputPort: backPort, videoPreviewLayer: backLayer)
    let frontConnection = AVCaptureConnection(inputPort: frontPort, videoPreviewLayer: frontLayer)

    guard session.canAddConnection(backConnection), session.canAddConnection(frontConnection) else {
      throw EncoreMultiCamSessionError.previewConnectionRejected
    }

    session.addConnection(backConnection)
    session.addConnection(frontConnection)

    let hardwareCost = session.hardwareCost
    let systemPressureCost = session.systemPressureCost

    if hardwareCost > 1.0 || systemPressureCost > 1.0 {
      throw EncoreMultiCamSessionError.tooExpensive(
        hardwareCost: hardwareCost,
        systemPressureCost: systemPressureCost,
        suggestedFormats: EncoreMultiCamDiscovery.discoverFormatCandidates().dropFirst().prefix(3).map { $0.label }
      )
    }

    self.session = session
    self.backDevice = backDevice
    self.frontDevice = frontDevice
    self.backPreviewLayer = backLayer
    self.frontPreviewLayer = frontLayer

    lifecycleMonitor.start()
    lifecycleMonitor.observeCaptureSession(session)

    return EncoreMultiCamPreviewState(
      backFormat: candidate.back,
      frontFormat: candidate.front,
      hardwareCost: hardwareCost,
      systemPressureCost: systemPressureCost
    )
  }

  private func configureRecordingOutputs(on session: AVCaptureMultiCamSession) throws {
    tearDownRecordingOutputs()

    session.beginConfiguration()
    defer { session.commitConfiguration() }

    do {
      try addRecordingOutputs(to: session)
    } catch {
      // Leave the session as it was so the preview keeps running and a retry starts clean.
      for output in [backMovieOutput, frontMovieOutput].compactMap({ $0 }) {
        session.removeOutput(output)
      }
      backMovieOutput = nil
      frontMovieOutput = nil
      throw error
    }
  }

  private func addRecordingOutputs(to session: AVCaptureMultiCamSession) throws {
    let deviceInputs = session.inputs.compactMap { $0 as? AVCaptureDeviceInput }

    // The audio input belongs to one session, so look it up there instead of trusting the cached one.
    var resolvedAudioInput = deviceInputs.first(where: { $0.device.hasMediaType(.audio) })
    if resolvedAudioInput == nil, let audioDevice = AVCaptureDevice.default(for: .audio) {
      let input = try AVCaptureDeviceInput(device: audioDevice)
      if session.canAddInput(input) {
        session.addInputWithNoConnections(input)
        resolvedAudioInput = input
      }
    }
    audioInput = resolvedAudioInput

    guard let backInput = deviceInputs.first(where: { $0.device.position == .back }),
          let frontInput = deviceInputs.first(where: { $0.device.position == .front }),
          let backPort = backInput.ports.first(where: { $0.mediaType == .video }),
          let frontPort = frontInput.ports.first(where: { $0.mediaType == .video }) else {
      throw EncoreMultiCamSessionError.recordingStepFailed("camera inputs or video ports not found")
    }

    let backMovie = AVCaptureMovieFileOutput()
    guard session.canAddOutput(backMovie) else {
      throw EncoreMultiCamSessionError.recordingStepFailed("cannot add back movie output")
    }
    session.addOutputWithNoConnections(backMovie)
    backMovieOutput = backMovie

    let frontMovie = AVCaptureMovieFileOutput()
    guard session.canAddOutput(frontMovie) else {
      throw EncoreMultiCamSessionError.recordingStepFailed("cannot add front movie output")
    }
    session.addOutputWithNoConnections(frontMovie)
    frontMovieOutput = frontMovie

    let backConnection = AVCaptureConnection(inputPorts: [backPort], output: backMovie)
    guard session.canAddConnection(backConnection) else {
      throw EncoreMultiCamSessionError.recordingStepFailed("cannot connect back camera to its movie output")
    }
    session.addConnection(backConnection)

    let frontConnection = AVCaptureConnection(inputPorts: [frontPort], output: frontMovie)
    guard session.canAddConnection(frontConnection) else {
      throw EncoreMultiCamSessionError.recordingStepFailed("cannot connect front camera to its movie output")
    }
    session.addConnection(frontConnection)

    if backConnection.isVideoOrientationSupported {
      backConnection.videoOrientation = .portrait
    }
    if frontConnection.isVideoOrientationSupported {
      frontConnection.videoOrientation = .portrait
    }

    EncoreCameraStabilization.applyBestAvailable(to: backConnection)
    EncoreCameraStabilization.applyBestAvailable(to: frontConnection)

    if let audioPort = resolvedAudioInput?.ports.first(where: { $0.mediaType == .audio }) {
      for movieOutput in [backMovie, frontMovie] {
        let audioConnection = AVCaptureConnection(inputPorts: [audioPort], output: movieOutput)
        if session.canAddConnection(audioConnection) {
          session.addConnection(audioConnection)
        }
      }
    }
  }

  private func tearDownRecordingOutputs() {
    guard let session else {
      backMovieOutput = nil
      frontMovieOutput = nil
      return
    }

    session.beginConfiguration()
    for output in [backMovieOutput, frontMovieOutput].compactMap({ $0 }) {
      session.removeOutput(output)
    }
    session.commitConfiguration()
    backMovieOutput = nil
    frontMovieOutput = nil
  }

  private func applyFormat(_ selection: EncoreCameraFormatSelection, to device: AVCaptureDevice) throws {
    guard let format = EncoreCameraFormat.findFormat(on: device, matching: selection) else {
      throw EncoreMultiCamSessionError.formatUnavailable(selection)
    }

    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    device.activeFormat = format
    let frameDuration = CMTime(value: 1, timescale: Int32(selection.fps.rounded()))
    device.activeVideoMinFrameDuration = frameDuration
    device.activeVideoMaxFrameDuration = frameDuration
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

  private func previewPayload(state: EncoreMultiCamPreviewState) -> [String: Any] {
    [
      "mode": EncoreCameraModeCoordinator.shared.mode.rawValue,
      "hardwareCost": Double(state.hardwareCost),
      "systemPressureCost": Double(state.systemPressureCost),
      "backFormat": formatPayload(state.backFormat),
      "frontFormat": formatPayload(state.frontFormat),
    ]
  }

  private func formatPayload(_ format: EncoreCameraFormatSelection) -> [String: Any] {
    [
      "width": Int(format.width),
      "height": Int(format.height),
      "fps": format.fps,
    ]
  }

  private func buildRecordingMetadata() -> [String: Any] {
    var metadata: [String: Any] = [
      "thermalState": thermalStateLabel(ProcessInfo.processInfo.thermalState),
      "hardwareCost": Double(session?.hardwareCost ?? 0),
      "systemPressureCost": Double(session?.systemPressureCost ?? 0),
    ]

    if let previewState {
      metadata["backFormat"] = formatPayload(previewState.backFormat)
      metadata["frontFormat"] = formatPayload(previewState.frontFormat)
    }

    if let backDevice {
      metadata["backSystemPressure"] = systemPressureLabel(backDevice.systemPressureState.level)
    }
    if let frontDevice {
      metadata["frontSystemPressure"] = systemPressureLabel(frontDevice.systemPressureState.level)
    }

    return metadata
  }

  private func thermalStateLabel(_ state: ProcessInfo.ThermalState) -> String {
    switch state {
    case .nominal: return "nominal"
    case .fair: return "fair"
    case .serious: return "serious"
    case .critical: return "critical"
    @unknown default: return "unknown"
    }
  }

  private func systemPressureLabel(_ level: AVCaptureDevice.SystemPressureState.Level) -> String {
    switch level {
    case .nominal: return "nominal"
    case .fair: return "fair"
    case .serious: return "serious"
    case .critical: return "critical"
    case .shutdown: return "shutdown"
    default: return "unknown"
    }
  }

  private func makeTemporaryRecordingURL(prefix: String) -> URL {
    FileManager.default.temporaryDirectory
      .appendingPathComponent("\(prefix)-\(UUID().uuidString).mov")
  }

  private func detachPreviewLayers() {
    backPreviewLayer?.session = nil
    frontPreviewLayer?.session = nil
  }

  private func backPreviewConnection(in session: AVCaptureMultiCamSession, layer: AVCaptureVideoPreviewLayer) -> AVCaptureConnection? {
    session.connections.first { $0.videoPreviewLayer === layer }
  }

  private func frontPreviewConnection(in session: AVCaptureMultiCamSession, layer: AVCaptureVideoPreviewLayer) -> AVCaptureConnection? {
    session.connections.first { $0.videoPreviewLayer === layer }
  }

  private func resolveRecordingFinish() {
    guard pendingBackFinished && pendingFrontFinished else { return }

    isRecording = false

    if let errorMessage = recordingErrorMessage {
      if let promise = stopRecordingPromise {
        stopRecordingPromise = nil
        DispatchQueue.main.async {
          promise.rejectEncore("ERR_MULTICAM_RECORD", errorMessage)
        }
      }
      return
    }

    guard let backURL = backRecordingURL, let frontURL = frontRecordingURL else { return }

    if let backValidation = EncoreCameraRecordingValidator.validateRecordingFile(at: backURL) {
      recordingErrorMessage = "Back camera recording failed: \(backValidation)"
    } else if let frontValidation = EncoreCameraRecordingValidator.validateRecordingFile(at: frontURL) {
      recordingErrorMessage = "Front camera recording failed: \(frontValidation)"
    }

    if let errorMessage = recordingErrorMessage {
      if let promise = stopRecordingPromise {
        stopRecordingPromise = nil
        DispatchQueue.main.async {
          promise.rejectEncore("ERR_MULTICAM_RECORD", errorMessage)
        }
      }
      return
    }

    let result: [String: Any] = [
      "backVideoURL": backURL.absoluteString,
      "frontVideoURL": frontURL.absoluteString,
      "duration": recordingDuration,
      "startTimestamp": recordingStartISO8601 as Any,
      "metadata": recordingMetadata,
    ]

    if let promise = stopRecordingPromise {
      stopRecordingPromise = nil
      DispatchQueue.main.async {
        promise.resolve(result)
      }
    }
  }
}

extension EncoreMultiCamSessionManager: AVCaptureFileOutputRecordingDelegate {
  func fileOutput(
    _ output: AVCaptureFileOutput,
    didStartRecordingTo fileURL: URL,
    from connections: [AVCaptureConnection]
  ) {}

  func fileOutput(
    _ output: AVCaptureFileOutput,
    didFinishRecordingTo outputFileURL: URL,
    from connections: [AVCaptureConnection],
    error: Error?
  ) {
    queue.async {
      if let error {
        let nsError = error as NSError
        let finishedSuccessfully = nsError.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool ?? false
        if !finishedSuccessfully {
          self.recordingErrorMessage = error.localizedDescription
        }
      }

      let asset = AVURLAsset(url: outputFileURL)
      let seconds = CMTimeGetSeconds(asset.duration)
      if seconds.isFinite, seconds > 0 {
        self.recordingDuration = max(self.recordingDuration, seconds)
      } else if let startedAt = self.recordingStartedAt {
        self.recordingDuration = max(self.recordingDuration, Date().timeIntervalSince(startedAt))
      }

      if output === self.backMovieOutput {
        self.pendingBackFinished = true
      } else if output === self.frontMovieOutput {
        self.pendingFrontFinished = true
      }

      self.resolveRecordingFinish()
    }
  }
}

extension EncoreMultiCamSessionManager: EncoreCameraLifecycleDelegate {
  func encoreCameraDidEnterBackground() {
    queue.async {
      self.previewWasRunningBeforeBackground = self.session?.isRunning == true
      if self.isRecording {
        self.backMovieOutput?.stopRecording()
        self.frontMovieOutput?.stopRecording()
      }
      self.session?.stopRunning()
    }
  }

  func encoreCameraWillEnterForeground() {
    queue.async {
      guard self.previewState != nil else { return }
      if self.previewWasRunningBeforeBackground {
        self.session?.startRunning()
      }
    }
  }

  func encoreCameraAudioSessionInterruptionBegan() {
    queue.async {
      guard self.isRecording else { return }
      self.backMovieOutput?.stopRecording()
      self.frontMovieOutput?.stopRecording()
    }
  }

  func encoreCameraAudioSessionInterruptionEnded(shouldResume: Bool) {
    guard shouldResume else { return }
    queue.async {
      guard self.previewState != nil else { return }
      if self.session?.isRunning == false {
        self.session?.startRunning()
      }
    }
  }

  func encoreCameraCaptureSessionRuntimeError(_ error: Error) {
    queue.async {
      if self.session?.isRunning == false, self.previewState != nil {
        self.session?.startRunning()
      }
    }
  }

  func encoreCameraCaptureSessionWasInterrupted(reason: String) {
    queue.async {
      if reason.contains("audioDeviceInUse") || reason.contains("videoDeviceInUse"), self.isRecording {
        self.backMovieOutput?.stopRecording()
        self.frontMovieOutput?.stopRecording()
      }
    }
  }

  func encoreCameraCaptureSessionInterruptionEnded() {
    queue.async {
      guard self.previewState != nil else { return }
      if self.session?.isRunning == false {
        self.session?.startRunning()
      }
    }
  }

  func encoreCameraDeviceWasDisconnected(_ device: AVCaptureDevice) {
    queue.async {
      guard self.previewState != nil else { return }
      if self.isRecording {
        self.backMovieOutput?.stopRecording()
        self.frontMovieOutput?.stopRecording()
      }
      self.stopPreview()
    }
  }
}

enum EncoreMultiCamSessionError: Error {
  case notSupported
  case previewLayersNotAttached
  case devicesUnavailable
  case noSupportedCombination(suggested: [String])
  case inputRejected
  case previewPortsUnavailable
  case previewConnectionRejected
  case tooExpensive(hardwareCost: Float, systemPressureCost: Float, suggestedFormats: [String])
  case formatUnavailable(EncoreCameraFormatSelection)
  case recordingSetupFailed
  case recordingStepFailed(String)

  var code: String {
    "ERR_MULTICAM"
  }

  var message: String {
    switch self {
    case .notSupported:
      return "MultiCam is not supported on this device"
    case .previewLayersNotAttached:
      return "MultiCam preview layers are not attached yet. Activate both preview views before starting MultiCam."
    case .devicesUnavailable:
      return "Back and front cameras are not both available"
    case .noSupportedCombination:
      return "No supported MultiCam format combination was found"
    case .inputRejected:
      return "Unable to add MultiCam camera inputs"
    case .previewPortsUnavailable:
      return "Unable to access MultiCam preview ports"
    case .previewConnectionRejected:
      return "Unable to connect MultiCam preview layers"
    case .tooExpensive(let hardwareCost, let systemPressureCost, let suggestedFormats):
      return "MultiCam combination exceeds hardware budget (hardwareCost=\(hardwareCost), systemPressureCost=\(systemPressureCost)). Try: \(suggestedFormats.joined(separator: ", "))"
    case .formatUnavailable(let selection):
      return "Format \(selection.width)x\(selection.height)@\(Int(selection.fps)) is unavailable"
    case .recordingSetupFailed:
      return "Unable to configure MultiCam recording outputs"
    case .recordingStepFailed(let step):
      return "Unable to configure MultiCam recording: \(step)"
    }
  }

  var payload: [String: Any] {
    switch self {
    case .tooExpensive(let hardwareCost, let systemPressureCost, let suggestedFormats):
      return [
        "hardwareCost": Double(hardwareCost),
        "systemPressureCost": Double(systemPressureCost),
        "suggestedFormats": suggestedFormats,
        "availableCombinations": EncoreMultiCamDiscovery.supportPayload()["supportedCombinations"] as Any,
      ]
    case .noSupportedCombination:
      return EncoreMultiCamDiscovery.supportPayload()
    default:
      return EncoreMultiCamDiscovery.supportPayload()
    }
  }
}
