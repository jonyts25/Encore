import AVFoundation

@available(iOS 18.0, *)
private final class EncoreCameraControlsDelegate: NSObject, AVCaptureSessionControlsDelegate {
  func sessionControlsDidBecomeActive(_ session: AVCaptureSession) {}
  func sessionControlsWillEnterFullscreenAppearance(_ session: AVCaptureSession) {}
  func sessionControlsWillExitFullscreenAppearance(_ session: AVCaptureSession) {}
  func sessionControlsDidBecomeInactive(_ session: AVCaptureSession) {}
}

final class EncoreCameraControlsCoordinator {
  private var zoomSlider: AnyObject?
  private var controlsDelegate: AnyObject?
  private let controlsQueue = DispatchQueue(label: "com.encore.camera.controls")

  static var isSupported: Bool {
    if #available(iOS 18.0, *) {
      return true
    }
    return false
  }

  func configure(
    session: AVCaptureSession,
    device: AVCaptureDevice,
    onZoomChanged: @escaping (CGFloat) -> Void
  ) -> Bool {
    clear(session: session)

    guard Self.isSupported else { return false }

    if #available(iOS 18.0, *) {
      guard session.supportsControls else { return false }

      session.beginConfiguration()
      defer { session.commitConfiguration() }

      let slider = AVCaptureSystemZoomSlider(device: device) { zoomFactor in
        onZoomChanged(zoomFactor)
      }

      guard session.canAddControl(slider) else { return false }
      session.addControl(slider)
      zoomSlider = slider
      let delegate = EncoreCameraControlsDelegate()
      controlsDelegate = delegate
      session.setControlsDelegate(delegate, queue: controlsQueue)
      return true
    }

    return false
  }

  func clear(session: AVCaptureSession) {
    guard Self.isSupported else { return }

    if #available(iOS 18.0, *) {
      session.beginConfiguration()
      for control in session.controls {
        session.removeControl(control)
      }
      session.commitConfiguration()
    }

    zoomSlider = nil
  }
}
