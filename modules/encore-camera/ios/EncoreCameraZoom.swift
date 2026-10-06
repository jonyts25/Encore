import AVFoundation
import UIKit

struct EncoreCameraZoomRange {
  let current: CGFloat
  let usableMin: CGFloat
  let usableMax: CGFloat
  let technicalMin: CGFloat
  let technicalMax: CGFloat
  /// Converts device zoom factors into the values shown to the user (0.5×, 1×, 5×).
  var displayMultiplier: CGFloat = 1

  /// Clamps a device zoom factor to the usable range.
  func clamped(_ factor: CGFloat) -> CGFloat {
    min(max(factor, usableMin), usableMax)
  }

  /// Every value is expressed in display units (what the user sees), not device factors.
  func asPayload() -> [String: Double] {
    [
      "currentZoom": Double(current * displayMultiplier),
      "minZoom": Double(usableMin * displayMultiplier),
      "maxZoom": Double(usableMax * displayMultiplier),
      "technicalMinZoom": Double(technicalMin * displayMultiplier),
      "technicalMaxZoom": Double(technicalMax * displayMultiplier),
    ]
  }

  /// On virtual devices that include the ultra wide lens, device factor 1.0 is the ultra wide
  /// and the wide lens starts at the first switch-over factor, so 1× on screen = 1 / multiplier.
  static func displayMultiplier(for device: AVCaptureDevice) -> CGFloat {
    guard device.isVirtualDevice,
          device.constituentDevices.contains(where: { $0.deviceType == .builtInUltraWideCamera }),
          let firstSwitchOver = device.virtualDeviceSwitchOverVideoZoomFactors.first else {
      return 1
    }

    let factor = CGFloat(truncating: firstSwitchOver)
    return factor > 0 ? 1 / factor : 1
  }

  /// Device zoom factor that corresponds to 1× on screen.
  static func defaultZoomFactor(for device: AVCaptureDevice) -> CGFloat {
    1 / displayMultiplier(for: device)
  }

  /// Display zoom at which each physical lens starts, e.g. [0.5, 1, 5].
  static func lensDisplayFactors(for device: AVCaptureDevice) -> [Double] {
    let multiplier = displayMultiplier(for: device)
    let switchOvers = device.virtualDeviceSwitchOverVideoZoomFactors.map { CGFloat(truncating: $0) }
    let deviceFactors = [device.minAvailableVideoZoomFactor] + switchOvers
    return deviceFactors.map { Double($0 * multiplier) }
  }

  static func usableMaximum(for device: AVCaptureDevice) -> CGFloat {
    usableMaximumZoom(
      for: device,
      technicalMin: device.minAvailableVideoZoomFactor,
      technicalMax: device.maxAvailableVideoZoomFactor
    )
  }

  static func from(device: AVCaptureDevice, currentZoom: CGFloat) -> EncoreCameraZoomRange {
    let technicalMin = device.minAvailableVideoZoomFactor
    let technicalMax = device.maxAvailableVideoZoomFactor
    let usableMax = usableMaximum(for: device)
    let clampedCurrent = min(max(currentZoom, technicalMin), technicalMax)

    return EncoreCameraZoomRange(
      current: clampedCurrent,
      usableMin: technicalMin,
      usableMax: usableMax,
      technicalMin: technicalMin,
      technicalMax: technicalMax,
      displayMultiplier: displayMultiplier(for: device)
    )
  }

  /// Usable maximum in device factors: at least 5× on screen, up to twice the longest lens,
  /// never more than 10× on screen.
  private static func usableMaximumZoom(
    for device: AVCaptureDevice,
    technicalMin: CGFloat,
    technicalMax: CGFloat
  ) -> CGFloat {
    let multiplier = displayMultiplier(for: device)
    let switchOvers = device.virtualDeviceSwitchOverVideoZoomFactors.map { CGFloat(truncating: $0) }
    let lastOptical = switchOvers.max() ?? technicalMin
    let desired = max(lastOptical * 2, 5 / multiplier)
    let cap = 10 / multiplier

    return min(technicalMax, min(desired, cap))
  }
}

enum EncoreCameraZoomApplier {
  static func apply(
    factor: CGFloat,
    to device: AVCaptureDevice,
    range: EncoreCameraZoomRange
  ) throws -> EncoreCameraZoomRange {
    let clamped = range.clamped(factor)

    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    device.videoZoomFactor = clamped
    return EncoreCameraZoomRange.from(device: device, currentZoom: clamped)
  }
}
