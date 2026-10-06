import AVFoundation

struct EncoreCameraTorchState: Equatable {
  let supported: Bool
  let enabled: Bool

  func asPayload() -> [String: Bool] {
    [
      "torchSupported": supported,
      "torchEnabled": enabled,
    ]
  }

  static func from(device: AVCaptureDevice?) -> EncoreCameraTorchState {
    guard let device, EncoreCameraTorch.isSupported(on: device) else {
      return EncoreCameraTorchState(supported: false, enabled: false)
    }

    return EncoreCameraTorchState(
      supported: true,
      enabled: device.torchMode == .on
    )
  }
}

enum EncoreCameraTorch {
  static func isSupported(on device: AVCaptureDevice) -> Bool {
    device.hasTorch && device.isTorchModeSupported(.on)
  }

  static func setEnabled(_ enabled: Bool, on device: AVCaptureDevice) throws -> EncoreCameraTorchState {
    if enabled {
      guard isSupported(on: device) else {
        throw NSError(
          domain: "EncoreCamera",
          code: 20,
          userInfo: [NSLocalizedDescriptionKey: "Torch is not supported on the active camera"]
        )
      }
    } else if !device.hasTorch {
      return EncoreCameraTorchState(supported: false, enabled: false)
    }

    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    if enabled {
      let level = min(AVCaptureDevice.maxAvailableTorchLevel, 1)
      try device.setTorchModeOn(level: level)
    } else if device.isTorchModeSupported(.off) {
      device.torchMode = .off
    }

    return EncoreCameraTorchState.from(device: device)
  }

  static func turnOffIfNeeded(on device: AVCaptureDevice) throws {
    guard device.hasTorch, device.torchMode == .on else { return }
    _ = try setEnabled(false, on: device)
  }
}
