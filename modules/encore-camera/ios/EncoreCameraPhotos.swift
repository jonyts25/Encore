import ExpoModulesCore
import Photos

enum EncoreCameraPhotos {
  static func saveToPhotos(fileURL: String, promise: Promise) {
    guard let filePath = resolveFileURL(fileURL) else {
      reject(promise: promise, code: "ERR_INVALID_URL", message: "Invalid file URL")
      return
    }

    guard FileManager.default.fileExists(atPath: filePath.path) else {
      reject(promise: promise, code: "ERR_FILE_NOT_FOUND", message: "Recording file was not found")
      return
    }

    requestAddAuthorization { status in
      switch status {
      case .authorized, .limited:
        saveVideo(at: filePath, promise: promise)
      case .denied:
        reject(
          promise: promise,
          code: "ERR_PHOTOS_DENIED",
          message: "Photo library access denied. Enable access in Settings."
        )
      case .restricted:
        reject(
          promise: promise,
          code: "ERR_PHOTOS_RESTRICTED",
          message: "Photo library access is restricted on this device."
        )
      case .notDetermined:
        reject(
          promise: promise,
          code: "ERR_PHOTOS_NOT_DETERMINED",
          message: "Photo library permission was not granted."
        )
      @unknown default:
        reject(
          promise: promise,
          code: "ERR_PHOTOS_UNAVAILABLE",
          message: "Photo library access is unavailable."
        )
      }
    }
  }

  private static func requestAddAuthorization(completion: @escaping (PHAuthorizationStatus) -> Void) {
    if #available(iOS 14, *) {
      let current = PHPhotoLibrary.authorizationStatus(for: .addOnly)
      switch current {
      case .notDetermined:
        PHPhotoLibrary.requestAuthorization(for: .addOnly, handler: completion)
      default:
        completion(current)
      }
      return
    }

    let current = PHPhotoLibrary.authorizationStatus()
    switch current {
    case .notDetermined:
      PHPhotoLibrary.requestAuthorization(completion)
    default:
      completion(current)
    }
  }

  private static func saveVideo(at filePath: URL, promise: Promise) {
    PHPhotoLibrary.shared().performChanges({
      PHAssetCreationRequest.creationRequestForAssetFromVideo(atFileURL: filePath)
    }) { success, error in
      DispatchQueue.main.async {
        if let error {
          reject(
            promise: promise,
            code: "ERR_PHOTOS_SAVE_FAILED",
            message: error.localizedDescription
          )
          return
        }

        guard success else {
          reject(
            promise: promise,
            code: "ERR_PHOTOS_SAVE_FAILED",
            message: "Unable to save video to Photos"
          )
          return
        }

        removeTemporaryFile(at: filePath)
        promise.resolve(["success": true])
      }
    }
  }

  private static func removeTemporaryFile(at filePath: URL) {
    do {
      try FileManager.default.removeItem(at: filePath)
    } catch {
      // Save succeeded; a leftover temp file is non-fatal.
      NSLog("EncoreCamera: failed to remove temp recording at %@: %@", filePath.path, error.localizedDescription)
    }
  }

  private static func resolveFileURL(_ fileURL: String) -> URL? {
    if fileURL.hasPrefix("file://") {
      return URL(string: fileURL)
    }
    return URL(fileURLWithPath: fileURL)
  }

  private static func reject(promise: Promise, code: String, message: String) {
    DispatchQueue.main.async {
      promise.rejectEncore(code, message)
    }
  }
}
