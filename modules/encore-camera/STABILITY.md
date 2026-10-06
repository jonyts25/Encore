# EncoreCamera — manual stability test scenarios

Run on a physical iPhone with `EXPO_PUBLIC_USE_NATIVE_CAMERA=true`.

## Permissions

1. Deny camera on first launch → LIVE shows retry screen, no crash.
2. Deny microphone → recording fails with clear error, preview still works.
3. Revoke camera in Settings while LIVE is open → error event, no crash on return.
4. Deny Photos add-only → save fails with `ERR_PHOTOS_DENIED`, temp file kept until success.

## Single camera lifecycle

5. Enter LIVE → preview starts, `onCameraReady` fires once.
6. Leave LIVE → session stops, preview layer detached, no leak on re-entry.
7. Background during preview → session pauses; foreground resumes preview.
8. Background during recording → recording stops safely; file saved or error surfaced.
9. Incoming phone call during recording → recording stops, no corrupt `.mov`.
10. Double-tap REC quickly → second start rejected (`Recording already in progress`).

## Recording integrity

11. Record 5 s → stop → file exists, duration > 0, saves to Photos.
12. Stop before `didStartRecording` → no orphan promise hang.
13. Deactivate view while recording → internal stop completes without crash.

## Orientation & overlay

14. Portrait only → preview and recording metadata stay portrait.
15. RN overlay (lyrics/header) remains responsive while preview runs at 30 fps.

## Torch, zoom, lens

16. Torch on back → persists across format change; off on front camera.
17. Pinch zoom → no runaway factor; within usable range.
18. Switch camera while not recording → succeeds; blocked while recording.

## MultiCam

19. Unsupported device → `getMultiCamSupport.isMultiCamSupported === false`, clear error.
20. MultiCam preview → both layers attached before start; back full + front PiP.
21. Toggle MultiCam off → single mode restored, no mixed sessions.
22. MultiCam record → `back.mov` + `front.mov` separate, similar duration, audio present.
23. MultiCam + background → both outputs stop, no hang on `stopMultiCamRecording`.
24. Expensive format combo → start rejected with suggested lower formats.

## Pressure & disconnect

25. Extended MultiCam preview on warm device → thermal metadata captured, no silent freeze.
26. Cover front camera / simulate disconnect → session recovers or fails gracefully.

## Lyrics gestures (LIVE overlay)

27. Tap lyrics → pause/resume without breaking scroll mode.
28. Swipe left/right → next/previous line respects synced/estimated/manual timing.
29. Long press → resync sheet opens; picking a line re-aligns scroll.
30. VoiceOver → adjustable actions for next/previous/pause/resync.
