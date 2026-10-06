import AVFoundation
import CoreMedia

struct EncoreCameraFormatSelection: Equatable {
  let width: Int32
  let height: Int32
  let fps: Double

  var key: String {
    "\(width)x\(height)@\(Int(fps.rounded()))"
  }
}

enum EncoreCameraFormat {
  static let concertDefault = EncoreCameraFormatSelection(width: 1920, height: 1080, fps: 30)

  static func supportedFormats(for device: AVCaptureDevice) -> [[String: Any]] {
    var grouped: [String: (width: Int32, height: Int32, fps: Set<Int>)] = [:]

    for format in device.formats {
      let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
      let width = dimensions.width
      let height = dimensions.height

      for range in format.videoSupportedFrameRateRanges {
        let minFps = Int(ceil(range.minFrameRate))
        let maxFps = Int(floor(range.maxFrameRate))
        guard maxFps > 0 else { continue }

        let key = "\(width)x\(height)"
        var entry = grouped[key] ?? (width: width, height: height, fps: [])
        for fps in minFps...maxFps {
          entry.fps.insert(fps)
        }
        grouped[key] = entry
      }
    }

    return grouped.values
      .sorted {
        if $0.width != $1.width { return $0.width > $1.width }
        return $0.height > $1.height
      }
      .map { entry in
        [
          "width": Int(entry.width),
          "height": Int(entry.height),
          "fpsOptions": entry.fps.sorted().map { Double($0) },
        ] as [String: Any]
      }
  }

  static func supportedResolutions(on device: AVCaptureDevice) -> [[String: Int]] {
    var seen = Set<String>()
    var resolutions: [[String: Int]] = []

    for format in device.formats {
      let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
      let key = "\(dimensions.width)x\(dimensions.height)"
      guard seen.insert(key).inserted else { continue }
      resolutions.append([
        "width": Int(dimensions.width),
        "height": Int(dimensions.height),
      ])
    }

    return resolutions.sorted {
      if $0["width", default: 0] != $1["width", default: 0] {
        return $0["width", default: 0] > $1["width", default: 0]
      }
      return $0["height", default: 0] > $1["height", default: 0]
    }
  }

  static func supports60fps(on device: AVCaptureDevice) -> Bool {
    device.formats.contains { format in
      format.videoSupportedFrameRateRanges.contains { $0.maxFrameRate >= 59 }
    }
  }

  static func apply(
    selection: EncoreCameraFormatSelection,
    to device: AVCaptureDevice,
    session: AVCaptureSession
  ) throws -> EncoreCameraFormatSelection {
    guard let format = findFormat(on: device, matching: selection) else {
      throw EncoreCameraFormatError.unsupported(
        requested: selection,
        available: supportedFormats(for: device)
      )
    }

    session.beginConfiguration()
    defer { session.commitConfiguration() }

    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    device.activeFormat = format
    let frameDuration = CMTime(value: 1, timescale: Int32(selection.fps.rounded()))
    device.activeVideoMinFrameDuration = frameDuration
    device.activeVideoMaxFrameDuration = frameDuration

    return selection
  }

  static func applyDefaultConcertFormat(to device: AVCaptureDevice, session: AVCaptureSession) throws {
    if findFormat(on: device, matching: concertDefault) != nil {
      _ = try apply(selection: concertDefault, to: device, session: session)
      return
    }

    if let fallback = findNearest1080p30(on: device) {
      _ = try apply(selection: fallback, to: device, session: session)
    }
  }

  static func findFormat(on device: AVCaptureDevice, matching selection: EncoreCameraFormatSelection) -> AVCaptureDevice.Format? {
    device.formats.first { format in
      let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
      guard dimensions.width == selection.width, dimensions.height == selection.height else {
        return false
      }

      return format.videoSupportedFrameRateRanges.contains { range in
        selection.fps >= range.minFrameRate && selection.fps <= range.maxFrameRate
      }
    }
  }

  private static func findNearest1080p30(on device: AVCaptureDevice) -> EncoreCameraFormatSelection? {
    let targetFps = 30.0
    let candidates = device.formats.compactMap { format -> EncoreCameraFormatSelection? in
      let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
      guard dimensions.height >= 720 else { return nil }
      guard format.videoSupportedFrameRateRanges.contains(where: {
        targetFps >= $0.minFrameRate && targetFps <= $0.maxFrameRate
      }) else {
        return nil
      }
      return EncoreCameraFormatSelection(width: dimensions.width, height: dimensions.height, fps: targetFps)
    }

    return candidates.sorted {
      abs(Int($0.height) - 1080) < abs(Int($1.height) - 1080)
    }.first
  }
}

enum EncoreCameraFormatError: Error {
  case unsupported(requested: EncoreCameraFormatSelection, available: [[String: Any]])

  var payload: [String: Any] {
    switch self {
    case .unsupported(let requested, let available):
      return [
        "success": false,
        "code": "ERR_FORMAT_NOT_SUPPORTED",
        "message": "Requested format \(requested.key) is not supported on the active camera",
        "requested": [
          "width": Int(requested.width),
          "height": Int(requested.height),
          "fps": requested.fps,
        ],
        "availableFormats": available,
      ]
    }
  }
}
