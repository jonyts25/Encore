import AVFoundation

struct EncoreCameraDescriptor: Equatable {
  let id: String
  let position: String
  let deviceType: String
  let displayName: String
  let suggestedZoomLabel: String

  func asDictionary() -> [String: String] {
    [
      "id": id,
      "position": position,
      "deviceType": deviceType,
      "displayName": displayName,
      "suggestedZoomLabel": suggestedZoomLabel,
    ]
  }
}

enum EncoreCameraDiscovery {
  static func discoverCameras() -> [EncoreCameraDescriptor] {
    let session = AVCaptureDevice.DiscoverySession(
      deviceTypes: supportedDeviceTypes(),
      mediaType: .video,
      position: .unspecified
    )

    let devices = session.devices.sorted(by: sortDevices)
    let backReference = referenceDevice(for: .back, among: devices)
    let frontReference = referenceDevice(for: .front, among: devices)

    return devices.map { device in
      let reference = device.position == .front ? frontReference : backReference
      return EncoreCameraDescriptor(
        id: device.uniqueID,
        position: positionKey(device.position),
        deviceType: deviceTypeKey(device.deviceType),
        displayName: displayName(for: device),
        suggestedZoomLabel: suggestedZoomLabel(for: device, reference: reference)
      )
    }
  }

  static func device(for id: String) -> AVCaptureDevice? {
    AVCaptureDevice(uniqueID: id)
  }

  static func preferredCamera(for position: AVCaptureDevice.Position) -> AVCaptureDevice? {
    let devices = AVCaptureDevice.DiscoverySession(
      deviceTypes: supportedDeviceTypes(),
      mediaType: .video,
      position: position
    ).devices.sorted(by: sortDevices)

    if position == .back {
      if let wide = devices.first(where: { $0.deviceType == .builtInWideAngleCamera }) {
        return wide
      }
      if let virtual = devices.first(where: {
        $0.deviceType == .builtInTripleCamera || $0.deviceType == .builtInDualWideCamera
      }) {
        return virtual
      }
    }

    if position == .front {
      if let trueDepth = devices.first(where: { $0.deviceType == .builtInTrueDepthCamera }) {
        return trueDepth
      }
      if let wide = devices.first(where: { $0.deviceType == .builtInWideAngleCamera }) {
        return wide
      }
    }

    return devices.first
  }

  static func preferredDefaultCamera() -> AVCaptureDevice? {
    preferredSingleCamera(for: .back)
  }

  /// Camera for the single-camera LIVE mode. On the back it prefers the virtual multi-lens
  /// device so zoom switches lenses automatically, like the system Camera app.
  static func preferredSingleCamera(for position: AVCaptureDevice.Position) -> AVCaptureDevice? {
    guard position == .back else {
      return preferredCamera(for: position)
    }

    let preferredTypes: [AVCaptureDevice.DeviceType] = [
      .builtInTripleCamera,
      .builtInDualWideCamera,
      .builtInDualCamera,
      .builtInWideAngleCamera,
    ]

    for type in preferredTypes {
      if let device = AVCaptureDevice.default(type, for: .video, position: .back) {
        return device
      }
    }

    return preferredCamera(for: .back)
  }

  private static func supportedDeviceTypes() -> [AVCaptureDevice.DeviceType] {
    var types: [AVCaptureDevice.DeviceType] = [
      .builtInWideAngleCamera,
      .builtInUltraWideCamera,
      .builtInTelephotoCamera,
      .builtInDualCamera,
      .builtInDualWideCamera,
      .builtInTripleCamera,
      .builtInTrueDepthCamera,
    ]

    if #available(iOS 15.4, *) {
      types.append(.builtInLiDARDepthCamera)
    }

    return types
  }

  private static func referenceDevice(for position: AVCaptureDevice.Position, among devices: [AVCaptureDevice]) -> AVCaptureDevice? {
    devices.first(where: { $0.position == position && $0.deviceType == .builtInWideAngleCamera })
      ?? devices.first(where: { $0.position == position && $0.deviceType == .builtInTrueDepthCamera })
      ?? devices.first(where: { $0.position == position })
  }

  private static func sortDevices(_ lhs: AVCaptureDevice, _ rhs: AVCaptureDevice) -> Bool {
    let positionOrder = positionSortValue(lhs.position) - positionSortValue(rhs.position)
    if positionOrder != 0 {
      return positionOrder < 0
    }

    let lhsVirtual = isVirtualComposite(lhs.deviceType)
    let rhsVirtual = isVirtualComposite(rhs.deviceType)
    if lhsVirtual != rhsVirtual {
      return !lhsVirtual && rhsVirtual
    }

    return fieldOfView(for: lhs) > fieldOfView(for: rhs)
  }

  private static func positionSortValue(_ position: AVCaptureDevice.Position) -> Int {
    switch position {
    case .back: return 0
    case .front: return 1
    default: return 2
    }
  }

  private static func isVirtualComposite(_ type: AVCaptureDevice.DeviceType) -> Bool {
    switch type {
    case .builtInDualCamera, .builtInDualWideCamera, .builtInTripleCamera:
      return true
    default:
      return false
    }
  }

  private static func fieldOfView(for device: AVCaptureDevice) -> Float {
    device.activeFormat.videoFieldOfView
  }

  private static func suggestedZoomLabel(for device: AVCaptureDevice, reference: AVCaptureDevice?) -> String {
    if isVirtualComposite(device.deviceType) {
      let minZoom = Double(device.minAvailableVideoZoomFactor)
      let maxZoom = Double(
        min(device.maxAvailableVideoZoomFactor, EncoreCameraZoomRange.usableMaximum(for: device))
      )

      if abs(maxZoom - minZoom) < 0.05 {
        return EncoreCameraZoomFormatting.label(for: minZoom)
      }

      return "\(EncoreCameraZoomFormatting.label(for: minZoom))–\(EncoreCameraZoomFormatting.label(for: maxZoom))"
    }

    guard let reference else {
      return EncoreCameraZoomFormatting.label(for: 1)
    }

    let referenceFOV = fieldOfView(for: reference)
    let deviceFOV = fieldOfView(for: device)

    guard referenceFOV > 0, deviceFOV > 0 else {
      return EncoreCameraZoomFormatting.label(for: 1)
    }

    let ratio = Double(referenceFOV / deviceFOV)
    return EncoreCameraZoomFormatting.label(for: ratio)
  }

  private static func displayName(for device: AVCaptureDevice) -> String {
    switch device.deviceType {
    case .builtInUltraWideCamera:
      return device.position == .front ? "Front Ultra Wide" : "Ultra Wide"
    case .builtInWideAngleCamera:
      return device.position == .front ? "Front Wide" : "Wide"
    case .builtInTelephotoCamera:
      return "Telephoto"
    case .builtInDualCamera:
      return "Dual Camera"
    case .builtInDualWideCamera:
      return "Dual Wide Camera"
    case .builtInTripleCamera:
      return "Triple Camera"
    case .builtInTrueDepthCamera:
      return "TrueDepth"
    case .builtInLiDARDepthCamera:
      return "LiDAR Camera"
    default:
      return device.localizedName
    }
  }

  private static func deviceTypeKey(_ type: AVCaptureDevice.DeviceType) -> String {
    switch type {
    case .builtInUltraWideCamera: return "ultraWide"
    case .builtInWideAngleCamera: return "wide"
    case .builtInTelephotoCamera: return "telephoto"
    case .builtInDualCamera: return "dual"
    case .builtInDualWideCamera: return "dualWide"
    case .builtInTripleCamera: return "triple"
    case .builtInTrueDepthCamera: return "trueDepth"
    case .builtInLiDARDepthCamera: return "lidarDepth"
    default: return type.rawValue
    }
  }

  private static func positionKey(_ position: AVCaptureDevice.Position) -> String {
    switch position {
    case .back: return "back"
    case .front: return "front"
    default: return "unspecified"
    }
  }
}

enum EncoreCameraZoomFormatting {
  static func label(for factor: Double) -> String {
    guard factor.isFinite, factor > 0 else {
      return "—"
    }

    if factor >= 10 {
      return "\(Int(factor.rounded()))×"
    }

    let rounded = (factor * 10).rounded() / 10
    if abs(rounded - rounded.rounded()) < 0.05 {
      return "\(Int(rounded.rounded()))×"
    }

    return String(format: "%.1f×", rounded)
  }
}
