import ExpoModulesCore
import UIKit

final class EncoreMultiCamBackPreviewView: ExpoView {
  private let previewView = EncoreCameraPreviewView()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    isUserInteractionEnabled = false

    previewView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(previewView)

    NSLayoutConstraint.activate([
      previewView.topAnchor.constraint(equalTo: topAnchor),
      previewView.bottomAnchor.constraint(equalTo: bottomAnchor),
      previewView.leadingAnchor.constraint(equalTo: leadingAnchor),
      previewView.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])
  }

  func setActive(_ active: Bool) {
    if active {
      EncoreMultiCamSessionManager.shared.attachBackPreviewLayer(previewView.previewLayer)
    } else {
      EncoreMultiCamSessionManager.shared.detachBackPreviewLayer(previewView.previewLayer)
    }
  }
}
