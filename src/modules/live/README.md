# M8 — LIVE (fase base)

Modo concierto: cámara + overlay de letra con scroll automático.

## Public API

- `LiveCameraContent` — preview fullscreen + overlay + grabación

## Flujo en la app

1. Pantalla de letra → **Modo LIVE (cámara)**
2. Al entrar: pide permisos de **cámara** y **micrófono** (solo aquí)
3. Preview fullscreen (`expo-camera`)
4. Overlay inferior (~22%): `LyricsScrollPanel` reutilizado (Fase A)
5. Botón grabar/detener → video guardado en **carrete del dispositivo**
6. **Nunca** se sube el video a ningún servidor

## Layout

- Solo franja inferior semitransparente (default)
- Split 50/50, flotante: **no implementados aún**

## Does NOT

- react-native-vision-camera (requiere dev build)
- Subida de video
- Permisos de cámara fuera de esta pantalla
