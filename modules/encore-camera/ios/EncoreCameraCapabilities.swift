import AVFoundation

enum EncoreCameraCapabilities {
  static func detect(device: AVCaptureDevice?, session: AVCaptureSession?) -> [String: Any] {
    let zoomRange: EncoreCameraZoomRange
    if let device {
      zoomRange = EncoreCameraZoomRange.from(device: device, currentZoom: device.videoZoomFactor)
    } else {
      zoomRange = EncoreCameraZoomRange(
        current: 1,
        usableMin: 1,
        usableMax: 1,
        technicalMin: 1,
        technicalMax: 1
      )
    }

    var payload: [String: Any] = [
      "multiCamSupported": AVCaptureMultiCamSession.isMultiCamSupported,
      "cameraControlSupported": cameraControlSupported(session: session, device: device),
      "hardwareCaptureEventsSupported": hardwareCaptureEventsSupported(),
      "torchSupported": device.map { EncoreCameraTorch.isSupported(on: $0) } ?? false,
      "tapToFocusSupported": device?.isFocusPointOfInterestSupported ?? false,
      "exposureSupported": device?.isExposurePointOfInterestSupported ?? false,
      "availableCameras": EncoreCameraDiscovery.discoverCameras().map { $0.asDictionary() },
      "minZoom": Double(zoomRange.usableMin * zoomRange.displayMultiplier),
      "maxZoom": Double(zoomRange.usableMax * zoomRange.displayMultiplier),
      "supports60fps": device.map { EncoreCameraFormat.supports60fps(on: $0) } ?? false,
      "supportedResolutions": device.map { EncoreCameraFormat.supportedResolutions(on: $0) } ?? [],
    ]

    if let device {
      payload["activeStabilizationMode"] = EncoreCameraStabilization.preferredModeLabel(
        for: device,
        connection: nil
      )
    }

    return payload
  }

  static func hardwareCaptureEventsSupported() -> Bool {
    if #available(iOS 17.2, *) {
      return true
    }
    return false
  }

  static func cameraControlSupported(session: AVCaptureSession?, device: AVCaptureDevice?) -> Bool {
    if #available(iOS 18.0, *) {
      guard let session, let device else { return false }
      guard session.supportsControls else { return false }
      let slider = AVCaptureSystemZoomSlider(device: device)
      return session.canAddControl(slider)
    }
    return false
  }
}
