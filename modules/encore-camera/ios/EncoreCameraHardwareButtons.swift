import AVFoundation
import AVKit
import UIKit

final class EncoreCameraHardwareButtons {
  private var interaction: AnyObject?

  static var isSupported: Bool {
    if #available(iOS 17.2, *) {
      return true
    }
    return false
  }

  func attach(to view: UIView, isActive: @escaping () -> Bool, onPrimaryPress: @escaping () -> Void) {
    detach(from: view)

    guard Self.isSupported else { return }

    if #available(iOS 17.2, *) {
      let captureInteraction = AVCaptureEventInteraction { event in
        guard isActive(), event.phase == .ended else { return }
        onPrimaryPress()
      }
      captureInteraction.isEnabled = true
      view.addInteraction(captureInteraction)
      interaction = captureInteraction
    }
  }

  func setEnabled(_ enabled: Bool) {
    if #available(iOS 17.2, *), let captureInteraction = interaction as? AVCaptureEventInteraction {
      captureInteraction.isEnabled = enabled
    }
  }

  func detach(from view: UIView) {
    if #available(iOS 17.2, *), let captureInteraction = interaction as? AVCaptureEventInteraction {
      view.removeInteraction(captureInteraction)
    }
    interaction = nil
  }
}
