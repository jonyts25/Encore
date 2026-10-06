import AVFoundation
import Foundation

enum EncoreCameraMode: String {
  case single
  case multiCamPreview
  case multiCamRecord
}

enum EncoreCameraModeError: Error, LocalizedError {
  case invalidTransition(from: EncoreCameraMode, to: EncoreCameraMode)
  case multiCamNotSupported

  var errorDescription: String? {
    switch self {
    case .invalidTransition(let from, let to):
      return "Cannot switch camera mode from \(from.rawValue) to \(to.rawValue)"
    case .multiCamNotSupported:
      return "MultiCam is not supported on this device"
    }
  }
}

final class EncoreCameraModeCoordinator {
  static let shared = EncoreCameraModeCoordinator()

  private(set) var mode: EncoreCameraMode = .single

  private init() {}

  func setMode(_ nextMode: EncoreCameraMode) throws {
    guard nextMode != mode else { return }

    switch (mode, nextMode) {
    case (.single, .multiCamPreview), (.single, .multiCamRecord):
      guard AVCaptureMultiCamSession.isMultiCamSupported else {
        throw EncoreCameraModeError.multiCamNotSupported
      }
    case (.multiCamPreview, .single):
      EncoreMultiCamSessionManager.shared.stopAll()
    case (.multiCamPreview, .multiCamRecord):
      break
    case (.multiCamRecord, .single):
      EncoreMultiCamSessionManager.shared.stopAll()
    case (.multiCamRecord, .multiCamPreview):
      EncoreMultiCamSessionManager.shared.stopRecordingIfNeeded()
    default:
      throw EncoreCameraModeError.invalidTransition(from: mode, to: nextMode)
    }

    mode = nextMode
  }

  func resetToSingle() {
    EncoreMultiCamSessionManager.shared.stopAll()
    mode = .single
  }
}
