# M8 — LIVE (fase base)

Modo concierto: cámara + overlay de letra con scroll automático.

## Public API

- `LiveCameraContent` — preview + overlay + grabación + zoom + selector de canciones
- `LiveLyricsOverlay` — letra en overlay, split o flotante

## Flujo en la app

1. Pantalla de letra, ficha del show (CTA «Hoy») o setlist → **Modo LIVE**
2. Permisos de cámara/micrófono solo al entrar
3. Preview fullscreen (`expo-camera`) con slider de zoom continuo (~1×–3×) sobre el botón de grabar
4. Botones físicos iOS (`expo-hardware-buttons`): volumen + Camera Control → grabar/detener (dev build)
5. Selector de canciones del setlist predicho (si hay `showId`) sin salir de LIVE
6. Layouts: franja superior (default), split 50/50, overlay flotante arrastrable
7. Toggle para ocultar letra (solo cámara)
8. Grabación local al carrete — nunca se sube al servidor

## Auth deep link

Registro usa `emailRedirectTo: encore://auth-callback`. `useAuthDeepLink` + ruta
`app/auth-callback.tsx` completan la sesión al abrir el enlace del correo.

## Botones físicos (iOS)

Con `expo-hardware-buttons` + **dev build** (`npx expo run:ios`):

- **Botones de volumen** → iniciar/detener grabación
- **Camera Control** (iPhone 16/17+) → iniciar/detener grabación

No funciona en **Expo Go** (módulo nativo). El deslizamiento de zoom en Camera Control no está expuesto por Apple a apps de terceros; el zoom sigue siendo el slider en pantalla.

## Does NOT

- Pinch-to-zoom (crash en Expo Go)
- Subida de video
- Permisos de cámara fuera de esta pantalla
