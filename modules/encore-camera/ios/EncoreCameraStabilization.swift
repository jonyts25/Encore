import AVFoundation

enum EncoreCameraStabilization {
  private static let preferredStableModes: [AVCaptureVideoStabilizationMode] = [
    .cinematicExtended,
    .cinematic,
    .standard,
    .auto,
  ]

  @discardableResult
  static func applyBestAvailable(to connection: AVCaptureConnection) -> String {
    guard connection.isVideoStabilizationSupported else {
      connection.preferredVideoStabilizationMode = .off
      return "off"
    }

    for mode in preferredStableModes where isModeSupported(mode, on: connection) {
      connection.preferredVideoStabilizationMode = mode
      return modeLabel(mode)
    }

    connection.preferredVideoStabilizationMode = .off
    return "off"
  }

  static func activeModeLabel(for connection: AVCaptureConnection?) -> String {
    guard let connection else { return "off" }

    if #available(iOS 17.0, *) {
      return modeLabel(connection.activeVideoStabilizationMode)
    }

    return modeLabel(connection.preferredVideoStabilizationMode)
  }

  static func preferredModeLabel(for device: AVCaptureDevice, connection: AVCaptureConnection?) -> String {
    if let connection {
      return activeModeLabel(for: connection)
    }
    return "off"
  }

  static func availableModes(for connection: AVCaptureConnection) -> [String] {
    guard connection.isVideoStabilizationSupported else { return ["off"] }
    var modes = preferredStableModes
      .filter { isModeSupported($0, on: connection) }
      .map(modeLabel)
    if modes.isEmpty {
      modes = ["auto"]
    }
    return modes
  }

  private static func isModeSupported(_ mode: AVCaptureVideoStabilizationMode, on connection: AVCaptureConnection) -> Bool {
    guard connection.isVideoStabilizationSupported else { return false }

    for port in connection.inputPorts {
      if let deviceInput = port.input as? AVCaptureDeviceInput {
        return deviceInput.device.activeFormat.isVideoStabilizationModeSupported(mode)
      }
    }

    return false
  }

  static func modeLabel(_ mode: AVCaptureVideoStabilizationMode) -> String {
    switch mode {
    case .off: return "off"
    case .standard: return "standard"
    case .cinematic: return "cinematic"
    case .cinematicExtended: return "cinematicExtended"
    case .auto: return "auto"
    @unknown default: return "unknown"
    }
  }
}
