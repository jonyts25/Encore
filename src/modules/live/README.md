# M8 — LIVE (fase base)

Modo concierto: cámara + overlay de letra con scroll automático.

## Public API

- `LiveCameraContent` — preview + overlay + grabación + zoom + selector de canciones
- `LiveLyricsOverlay` — letra en overlay, split o flotante

## Flujo en la app

1. Pantalla de letra, ficha del show (CTA «Hoy») o setlist → **Modo LIVE**
2. Permisos de cámara/micrófono solo al entrar
3. Preview fullscreen (`expo-camera`) con zoom 1x/2x/3x (chips, sin pinch)
4. Selector de canciones del setlist predicho (si hay `showId`) sin salir de LIVE
5. Layouts: franja superior (default), split 50/50, overlay flotante arrastrable
6. Toggle para ocultar letra (solo cámara)
7. Grabación local al carrete — nunca se sube al servidor

## Auth deep link

Registro usa `emailRedirectTo: encore://auth-callback`. `useAuthDeepLink` + ruta
`app/auth-callback.tsx` completan la sesión al abrir el enlace del correo.

## Does NOT

- Pinch-to-zoom (crash en Expo Go)
- Subida de video
- Permisos de cámara fuera de esta pantalla
