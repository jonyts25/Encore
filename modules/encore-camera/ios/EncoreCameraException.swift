import ExpoModulesCore

final class EncoreCameraException: GenericException<(code: String, message: String)>, @unchecked Sendable {
  override var code: String { param.code }
  override var reason: String { param.message }
}

extension Promise {
  func rejectEncore(_ code: String, _ message: String) {
    reject(EncoreCameraException((code: code, message: message)))
  }
}
