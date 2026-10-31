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

  static func setExposureBias(_ value: Float, device: AVCaptureDevice) throws {
    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    let clamped = min(max(value, device.minExposureTargetBias), device.maxExposureTargetBias)
    device.setExposureTargetBias(clamped, completionHandler: nil)
  }

  static func setFocusExposureLock(_ locked: Bool, device: AVCaptureDevice) throws {
    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    if locked {
      if device.isFocusModeSupported(.locked) {
        device.focusMode = .locked
      }
      if device.isExposureModeSupported(.locked) {
        device.exposureMode = .locked
      }
      return
    }

    if device.isFocusModeSupported(.continuousAutoFocus) {
      device.focusMode = .continuousAutoFocus
    } else if device.isFocusModeSupported(.autoFocus) {
      device.focusMode = .autoFocus
    }

    if device.isExposureModeSupported(.continuousAutoExposure) {
      device.exposureMode = .continuousAutoExposure
    } else if device.isExposureModeSupported(.autoExpose) {
      device.exposureMode = .autoExpose
    }
  }
}
