import AVFoundation
import UIKit

enum EncoreCameraFocus {
  static func focusAndExpose(at devicePoint: CGPoint, device: AVCaptureDevice) throws {
    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    if device.isFocusPointOfInterestSupported && device.isFocusModeSupported(.autoFocus) {
      device.focusPointOfInterest = devicePoint
      device.focusMode = .autoFocus
    }

    if device.isExposurePointOfInterestSupported && device.isExposureModeSupported(.autoExpose) {
      device.exposurePointOfInterest = devicePoint
      device.exposureMode = .autoExpose
    }
  }

  static func resetContinuous(on device: AVCaptureDevice) throws {
    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    if device.isFocusPointOfInterestSupported {
      device.focusPointOfInterest = CGPoint(x: 0.5, y: 0.5)
    }

    if device.isExposurePointOfInterestSupported {
      device.exposurePointOfInterest = CGPoint(x: 0.5, y: 0.5)
    }

    if device.isFocusModeSupported(.continuousAutoFocus) {
      device.focusMode = .continuousAutoFocus
    }

    if device.isExposureModeSupported(.continuousAutoExposure) {
      device.exposureMode = .continuousAutoExposure
    }
  }
}
