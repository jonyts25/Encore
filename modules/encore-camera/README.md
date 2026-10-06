# encore-camera

Native iOS camera module for Encore (Expo Modules API + AVFoundation).

## Ref API (selection)

| Method | Description |
|--------|-------------|
| `setTorch(enabled)` | Continuous video torch via `lockForConfiguration` |
| `switchCamera()` | Toggle front/back; preserves zoom/torch when compatible |
| `selectCamera(id)` | Switch to a discovered lens |
| `getCapabilities()` | Hardware-derived capability flags |
| `getSupportedFormats()` | Real `AVCaptureDeviceFormat` width/height/fps options |
| `setFormat({ width, height, fps })` | Exact format only; returns available formats on failure |
| `getStabilizationState()` | Active + available stabilization modes |

## Events

- `onTorchChanged` → `{ torchSupported, torchEnabled }`
- `onCameraSwitched` → `{ activeCameraPosition, selectedCameraId }`
- `onZoomChanged`, `onAvailableCamerasChanged`, recording events

## Platform notes

- **Torch**: `hasTorch` + continuous `.on` mode (not photo flash)
- **Hardware buttons** (iOS 17.2+): `AVCaptureEventInteraction` toggles recording when the view is active
- **Camera Control zoom** (iOS 18+): `AVCaptureSystemZoomSlider` when `session.supportsControls`
- **Default concert format**: 1080p30 when supported by the active camera
- **Stabilization**: best compatible mode for the current format (`cinematicExtended` → `cinematic` → `standard` → `auto`)

Devices without supported APIs are unaffected (capability flags return `false`).
