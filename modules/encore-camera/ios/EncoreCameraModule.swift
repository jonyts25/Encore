import ExpoModulesCore

struct EncoreRecordingOptions: Record {
  @Field var maxDuration: Double?
}

public class EncoreCameraModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EncoreCamera")

    AsyncFunction("saveToPhotos") { (fileURL: String, promise: Promise) in
      EncoreCameraPhotos.saveToPhotos(fileURL: fileURL, promise: promise)
    }

    AsyncFunction("getCameraMode") {
      EncoreCameraModeCoordinator.shared.mode.rawValue
    }

    AsyncFunction("setCameraMode") { (mode: String, promise: Promise) in
      guard let nextMode = EncoreCameraMode(rawValue: mode) else {
        promise.rejectEncore("ERR_CAMERA_MODE", "Unsupported camera mode: \(mode)")
        return
      }

      do {
        try EncoreCameraModeCoordinator.shared.setMode(nextMode)
        promise.resolve(["mode": nextMode.rawValue])
      } catch {
        promise.rejectEncore("ERR_CAMERA_MODE", error.localizedDescription)
      }
    }

    AsyncFunction("getMultiCamSupport") {
      EncoreMultiCamDiscovery.supportPayload()
    }

    AsyncFunction("startMultiCamPreview") { (promise: Promise) in
      do {
        if EncoreCameraModeCoordinator.shared.mode != .multiCamPreview {
          try EncoreCameraModeCoordinator.shared.setMode(.multiCamPreview)
        }
        EncoreMultiCamSessionManager.shared.startPreview(promise: promise)
      } catch {
        promise.rejectEncore("ERR_CAMERA_MODE", error.localizedDescription)
      }
    }

    AsyncFunction("stopMultiCamPreview") {
      EncoreMultiCamSessionManager.shared.stopPreview()
      if EncoreCameraModeCoordinator.shared.mode == .multiCamPreview {
        try? EncoreCameraModeCoordinator.shared.setMode(.single)
      }
    }

    AsyncFunction("startMultiCamRecording") { (promise: Promise) in
      do {
        if EncoreCameraModeCoordinator.shared.mode != .multiCamRecord {
          try EncoreCameraModeCoordinator.shared.setMode(.multiCamRecord)
        }
        EncoreMultiCamSessionManager.shared.startRecording(promise: promise)
      } catch {
        promise.rejectEncore("ERR_MULTICAM_RECORD", error.localizedDescription)
      }
    }

    AsyncFunction("stopMultiCamRecording") { (promise: Promise) in
      EncoreMultiCamSessionManager.shared.stopRecording(promise: promise)
    }

    View(EncoreCameraView.self) {
      Prop("active") { (view: EncoreCameraView, active: Bool?) in
        let isActive = active ?? false
        if isActive && EncoreCameraModeCoordinator.shared.mode != .single {
          view.setActive(false)
          return
        }
        view.setActive(isActive)
      }

      Events(
        "onCameraReady",
        "onCameraError",
        "onRecordingStarted",
        "onRecordingFinished",
        "onRecordingError",
        "onZoomChanged",
        "onAvailableCamerasChanged",
        "onTorchChanged",
        "onCameraSwitched"
      )

      AsyncFunction("getTorchState") { (view: EncoreCameraView) -> [String: Bool] in
        view.getTorchState()
      }

      AsyncFunction("setTorch") { (view: EncoreCameraView, enabled: Bool, promise: Promise) in
        view.setTorch(enabled: enabled, promise: promise)
      }

      AsyncFunction("getAvailableCameras") { (view: EncoreCameraView) -> [[String: String]] in
        view.getAvailableCameras()
      }

      AsyncFunction("getCameraState") { (view: EncoreCameraView) -> [String: Any] in
        view.getCameraState()
      }

      AsyncFunction("selectCamera") { (view: EncoreCameraView, cameraId: String, promise: Promise) in
        view.selectCamera(id: cameraId, promise: promise)
      }

      AsyncFunction("switchCamera") { (view: EncoreCameraView, promise: Promise) in
        view.switchCamera(promise: promise)
      }

      AsyncFunction("getCapabilities") { (view: EncoreCameraView) -> [String: Any] in
        view.getCapabilities()
      }

      AsyncFunction("getSupportedFormats") { (view: EncoreCameraView) -> [[String: Any]] in
        view.getSupportedFormats()
      }

      AsyncFunction("setFormat") { (view: EncoreCameraView, options: [String: Double], promise: Promise) in
        guard let width = options["width"],
              let height = options["height"],
              let fps = options["fps"] else {
          promise.rejectEncore("ERR_FORMAT", "width, height, and fps are required")
          return
        }
        view.setFormat(width: width, height: height, fps: fps, promise: promise)
      }

      AsyncFunction("getStabilizationState") { (view: EncoreCameraView) -> [String: Any] in
        view.getStabilizationState()
      }

      AsyncFunction("setZoom") { (view: EncoreCameraView, factor: Double, promise: Promise) in
        view.setZoom(factor: factor, promise: promise)
      }

      AsyncFunction("getZoomState") { (view: EncoreCameraView) -> [String: Double] in
        view.getZoomState()
      }

      AsyncFunction("startRecording") { (view: EncoreCameraView, options: EncoreRecordingOptions?, promise: Promise) in
        view.startRecording(maxDuration: options?.maxDuration, promise: promise)
      }

      AsyncFunction("stopRecording") { (view: EncoreCameraView, promise: Promise) in
        view.stopRecording(promise: promise)
      }

      AsyncFunction("isRecording") { (view: EncoreCameraView) -> Bool in
        view.getIsRecording()
      }
    }

    View(EncoreMultiCamBackPreviewView.self) {
      Prop("active") { (view: EncoreMultiCamBackPreviewView, active: Bool?) in
        view.setActive(active ?? false)
      }
    }

    View(EncoreMultiCamFrontPreviewView.self) {
      Prop("active") { (view: EncoreMultiCamFrontPreviewView, active: Bool?) in
        view.setActive(active ?? false)
      }
    }
  }
}
