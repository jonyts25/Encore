import AVFoundation
import Foundation
import UIKit

protocol EncoreCameraLifecycleDelegate: AnyObject {
  func encoreCameraDidEnterBackground()
  func encoreCameraWillEnterForeground()
  func encoreCameraAudioSessionInterruptionBegan()
  func encoreCameraAudioSessionInterruptionEnded(shouldResume: Bool)
  func encoreCameraCaptureSessionRuntimeError(_ error: Error)
  func encoreCameraCaptureSessionWasInterrupted(reason: String)
  func encoreCameraCaptureSessionInterruptionEnded()
  func encoreCameraDeviceWasDisconnected(_ device: AVCaptureDevice)
}

final class EncoreCameraLifecycleMonitor {
  weak var delegate: EncoreCameraLifecycleDelegate?

  private var observers: [NSObjectProtocol] = []
  private(set) var isMonitoring = false

  func start() {
    guard !isMonitoring else { return }
    isMonitoring = true

    let center = NotificationCenter.default

    observers.append(
      center.addObserver(
        forName: UIApplication.didEnterBackgroundNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.delegate?.encoreCameraDidEnterBackground()
      }
    )

    observers.append(
      center.addObserver(
        forName: UIApplication.willEnterForegroundNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.delegate?.encoreCameraWillEnterForeground()
      }
    )

    observers.append(
      center.addObserver(
        forName: AVAudioSession.interruptionNotification,
        object: AVAudioSession.sharedInstance(),
        queue: .main
      ) { [weak self] notification in
        self?.handleAudioInterruption(notification)
      }
    )

    observers.append(
      center.addObserver(
        forName: .AVCaptureDeviceWasDisconnected,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let device = notification.object as? AVCaptureDevice else { return }
        self?.delegate?.encoreCameraDeviceWasDisconnected(device)
      }
    )
  }

  func stop() {
    guard isMonitoring else { return }
    isMonitoring = false

    let center = NotificationCenter.default
    for observer in observers {
      center.removeObserver(observer)
    }
    observers.removeAll()
  }

  func observeCaptureSession(_ session: AVCaptureSession) {
    let center = NotificationCenter.default

    observers.append(
      center.addObserver(
        forName: .AVCaptureSessionRuntimeError,
        object: session,
        queue: .main
      ) { [weak self] notification in
        let error = notification.userInfo?[AVCaptureSessionErrorKey] as? Error
          ?? NSError(
            domain: "EncoreCamera",
            code: 900,
            userInfo: [NSLocalizedDescriptionKey: "Capture session runtime error"]
          )
        self?.delegate?.encoreCameraCaptureSessionRuntimeError(error)
      }
    )

    observers.append(
      center.addObserver(
        forName: .AVCaptureSessionWasInterrupted,
        object: session,
        queue: .main
      ) { [weak self] notification in
        let reasonValue = notification.userInfo?[AVCaptureSessionInterruptionReasonKey] as? Int ?? -1
        let reason = EncoreCameraLifecycleMonitor.interruptionReasonLabel(reasonValue)
        self?.delegate?.encoreCameraCaptureSessionWasInterrupted(reason: reason)
      }
    )

    observers.append(
      center.addObserver(
        forName: .AVCaptureSessionInterruptionEnded,
        object: session,
        queue: .main
      ) { [weak self] _ in
        self?.delegate?.encoreCameraCaptureSessionInterruptionEnded()
      }
    )
  }

  private func handleAudioInterruption(_ notification: Notification) {
    guard
      let userInfo = notification.userInfo,
      let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: typeValue)
    else {
      return
    }

    switch type {
    case .began:
      delegate?.encoreCameraAudioSessionInterruptionBegan()
    case .ended:
      let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
      let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
      delegate?.encoreCameraAudioSessionInterruptionEnded(shouldResume: options.contains(.shouldResume))
    @unknown default:
      break
    }
  }

  private static func interruptionReasonLabel(_ rawValue: Int) -> String {
    if #available(iOS 16.0, *) {
      if let reason = AVCaptureSession.InterruptionReason(rawValue: rawValue) {
        switch reason {
        case .videoDeviceNotAvailableInBackground: return "videoDeviceNotAvailableInBackground"
        case .audioDeviceInUseByAnotherClient: return "audioDeviceInUseByAnotherClient"
        case .videoDeviceInUseByAnotherClient: return "videoDeviceInUseByAnotherClient"
        case .videoDeviceNotAvailableWithMultipleForegroundApps: return "videoDeviceNotAvailableWithMultipleForegroundApps"
        case .videoDeviceNotAvailableDueToSystemPressure: return "videoDeviceNotAvailableDueToSystemPressure"
        @unknown default: return "unknown"
        }
      }
    }
    return "unknown(\(rawValue))"
  }
}

enum EncoreCameraRecordingValidator {
  static func validateRecordingFile(at url: URL) -> String? {
    guard FileManager.default.fileExists(atPath: url.path) else {
      return "Recording file was not created"
    }

    do {
      let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
      let fileSize = attributes[.size] as? NSNumber
      if fileSize?.intValue ?? 0 <= 0 {
        return "Recording file is empty"
      }
    } catch {
      return "Unable to read recording file attributes"
    }

    let asset = AVURLAsset(url: url)
    let seconds = CMTimeGetSeconds(asset.duration)
    if seconds.isFinite, seconds > 0 {
      return nil
    }

    return nil
  }
}
