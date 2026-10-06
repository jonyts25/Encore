import AVFoundation
import CoreMedia

struct EncoreMultiCamFormatCandidate: Equatable {
  let back: EncoreCameraFormatSelection
  let front: EncoreCameraFormatSelection
  let label: String
}

enum EncoreMultiCamDiscovery {
  static func isSupported() -> Bool {
    AVCaptureMultiCamSession.isMultiCamSupported
  }

  static func discoverFormatCandidates() -> [EncoreMultiCamFormatCandidate] {
    guard isSupported(),
          let backDevice = EncoreCameraDiscovery.preferredCamera(for: .back),
          let frontDevice = EncoreCameraDiscovery.preferredCamera(for: .front) else {
      return []
    }

    let presets: [EncoreCameraFormatSelection] = [
      EncoreCameraFormatSelection(width: 3840, height: 2160, fps: 60),
      EncoreCameraFormatSelection(width: 3840, height: 2160, fps: 30),
      EncoreCameraFormatSelection(width: 1920, height: 1080, fps: 60),
      EncoreCameraFormatSelection(width: 1920, height: 1080, fps: 30),
      EncoreCameraFormatSelection(width: 1280, height: 720, fps: 30),
      EncoreCameraFormatSelection(width: 1280, height: 720, fps: 24),
      EncoreCameraFormatSelection(width: 640, height: 480, fps: 30),
    ]

    var results: [EncoreMultiCamFormatCandidate] = []

    for backPreset in presets {
      for frontPreset in presets where frontPreset.width * frontPreset.height <= backPreset.width * backPreset.height {
        guard EncoreMultiCamFormatTester.canConfigure(
          backDevice: backDevice,
          frontDevice: frontDevice,
          backSelection: backPreset,
          frontSelection: frontPreset
        ) else {
          continue
        }

        results.append(
          EncoreMultiCamFormatCandidate(
            back: backPreset,
            front: frontPreset,
            label: "back \(backPreset.width)x\(backPreset.height)@\(Int(backPreset.fps)) + front \(frontPreset.width)x\(frontPreset.height)@\(Int(frontPreset.fps))"
          )
        )
      }
    }

    return results
  }

  static func supportPayload() -> [String: Any] {
    let candidates = discoverFormatCandidates()
    return [
      "isMultiCamSupported": isSupported(),
      "supportedCombinations": candidates.map { candidate in
        [
          "label": candidate.label,
          "back": [
            "width": Int(candidate.back.width),
            "height": Int(candidate.back.height),
            "fps": candidate.back.fps,
          ],
          "front": [
            "width": Int(candidate.front.width),
            "height": Int(candidate.front.height),
            "fps": candidate.front.fps,
          ],
        ] as [String: Any]
      },
      "recommendedCombination": candidates.first.map { candidate in
        [
          "back": [
            "width": Int(candidate.back.width),
            "height": Int(candidate.back.height),
            "fps": candidate.back.fps,
          ],
          "front": [
            "width": Int(candidate.front.width),
            "height": Int(candidate.front.height),
            "fps": candidate.front.fps,
          ],
        ] as [String: Any]
      } as Any,
    ]
  }
}

enum EncoreMultiCamFormatTester {
  static func canConfigure(
    backDevice: AVCaptureDevice,
    frontDevice: AVCaptureDevice,
    backSelection: EncoreCameraFormatSelection,
    frontSelection: EncoreCameraFormatSelection
  ) -> Bool {
    guard let backFormat = EncoreCameraFormat.findFormat(on: backDevice, matching: backSelection),
          let frontFormat = EncoreCameraFormat.findFormat(on: frontDevice, matching: frontSelection),
          backFormat.isMultiCamSupported,
          frontFormat.isMultiCamSupported else {
      return false
    }

    let session = AVCaptureMultiCamSession()
    session.beginConfiguration()
    defer { session.commitConfiguration() }

    do {
      try backDevice.lockForConfiguration()
      backDevice.activeFormat = backFormat
      backDevice.unlockForConfiguration()

      try frontDevice.lockForConfiguration()
      frontDevice.activeFormat = frontFormat
      frontDevice.unlockForConfiguration()

      let backInput = try AVCaptureDeviceInput(device: backDevice)
      let frontInput = try AVCaptureDeviceInput(device: frontDevice)

      guard session.canAddInput(backInput), session.canAddInput(frontInput) else {
        return false
      }

      session.addInputWithNoConnections(backInput)
      session.addInputWithNoConnections(frontInput)

      let backOutput = AVCaptureVideoPreviewLayer()
      let frontOutput = AVCaptureVideoPreviewLayer()

      guard let backPort = backInput.ports.first(where: { $0.mediaType == .video }),
            let frontPort = frontInput.ports.first(where: { $0.mediaType == .video }) else {
        return false
      }

      backOutput.setSessionWithNoConnection(session)
      frontOutput.setSessionWithNoConnection(session)

      let backConnection = AVCaptureConnection(inputPort: backPort, videoPreviewLayer: backOutput)
      let frontConnection = AVCaptureConnection(inputPort: frontPort, videoPreviewLayer: frontOutput)

      guard session.canAddConnection(backConnection), session.canAddConnection(frontConnection) else {
        return false
      }

      session.addConnection(backConnection)
      session.addConnection(frontConnection)

      return session.hardwareCost <= 1.0 && session.systemPressureCost <= 1.0
    } catch {
      return false
    }
  }
}
