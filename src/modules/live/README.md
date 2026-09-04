# M8 — LIVE (fase base)

Modo concierto: cámara + overlay de letra con scroll automático.

## Public API

- `LiveCameraContent` — preview fullscreen + overlay + grabación
- `LiveLyricsOverlay` — franja superior semitransparente + panel de letra

## Flujo en la app

1. Pantalla de letra → **Modo LIVE (cámara)**
2. Al entrar: pide permisos de **cámara** y **micrófono** (solo aquí)
3. Preview fullscreen (`expo-camera`)
4. Overlay superior (~40%): `LyricsScrollPanel` reutilizado (estilo sólido semitransparente)
5. Controles de cámara: linterna (trasera), volteo frontal/trasera
6. Botón grabar/detener → video guardado en **carrete del dispositivo**
7. **Nunca** se sube el video a ningún servidor

## Layout

- Overlay superior semitransparente (~40% altura)
- Controles inferiores: volteo ⟲ · grabar · linterna ⚡ (zona del pulgar)
- Auto-scroll de letra al entrar (pausa/reinicio manual disponible)
- Split 50/50, flotante inferior: **no implementados aún**

## Does NOT

- react-native-vision-camera (requiere dev build)
- Subida de video
- Permisos de cámara fuera de esta pantalla
