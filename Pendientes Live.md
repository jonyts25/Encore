# Encore LIVE — pendientes

Corte: 6 de octubre de 2026, después de la ronda 3 de la cámara nativa.

## Estado actual

Probado en iPhone con el build de EAS (perfil preview):

- Cámara nativa: chips, pellizco de zoom, toque para enfocar, luz y flip funcionan.
- Grabación con el botón de pantalla y con el botón lateral: funciona y guarda en el carrete.
- Zoom con el botón lateral: funciona.
- Hoja de canciones desde el setlist: muestra las canciones y permite cambiar.
- MultiCam: preview y grabación funcionan; guarda los dos videos.

## 1. Antes del próximo concierto

- [ ] **El show no debe desaparecer de la lista a medio concierto.** Pasó en el show de Aleks Syntek. Sospecha: el filtro de "hoy" o "próximos" se calcula en UTC, y un concierto a las 9 pm en Guadalajara ya es el día siguiente en UTC. Falta revisar el código que arma las listas de Inicio.
  - Prueba sin compilar: en Supabase, mover un show en «Voy» a hace dos horas; debe seguir en «Mis shows» y salir "Tu show es hoy".
  - Criterio: un show en «Voy» sigue visible durante el concierto y varias horas después, calculado en hora local.
- [ ] **Revisión posterior al concierto del 7 de octubre.** Anotar aquí qué falló y qué funcionó en campo.
- [ ] **Límite de 15 minutos.** Con el botón de pantalla la grabación se corta sola a los 15 minutos (`maxDuration: 900` en `LiveCameraContent.tsx`). Decidir si se quita o se sube.
- [ ] **LIVE desde la pantalla de letra.** Esa ruta no pasaba `showId` y la hoja de canciones salía vacía. Confirmar si ya se corrigió.
- [ ] **Hacer commit del módulo `modules/encore-camera`.** Los archivos estaban sin trackear en git.

## 2. Cámara y zoom

- [ ] **Confirmar la ronda 3 de React Native.** Los chips deben ser niveles de zoom (.5×, 1×, 2×, 5×) y no cambiar de lente. Si siguen cambiando de cámara, el prompt 1 no entró en el build.
- [ ] **Valores de zoom iguales a los del iPhone.** Hoy no coinciden; el iPhone además muestra milímetros.
- [ ] **Slider de zoom como el de la cámara nativa**, en lugar de solo chips. Ya existe `LiveZoomSlider.tsx` sin usar.
- [ ] **Modo horizontal.**
  - Nativo: grabar con la orientación real del teléfono, aunque el bloqueo de rotación esté activo. Hoy todo se graba como vertical.
  - Interfaz: la app se queda en vertical; giran la letra y los iconos. Letra abajo, como franja. Diseño por definir.

## 3. MultiCam

- [ ] **Zoom en MultiCam.** No existe; los chips se ocultan en ese modo.
- [ ] **Verificar el audio** en los dos videos de MultiCam.
- [ ] **`getMultiCamSupport` cambia el formato de las cámaras reales** al probar combinaciones y no lo restaura. Hoy JS no lo llama; corregir antes de usarlo.
- [ ] **Posición del recuadro frontal.** Se subió para no tapar chips ni mensajes; revisar cómo quedó.

## 4. Interfaz (ronda de revisión)

- [ ] **Revisión general.** Se siente muy simple y poco amigable. Revisar con capturas de cuatro estados: cámara normal, grabando, MultiCam y hoja de canciones.
- [ ] **Hoja de canciones con el estilo del iPhone** (el cristal de iOS), respetando el tema del sistema. Hoy es una hoja blanca fija.
- [ ] **Mensajes de error amigables.** Hoy se muestra el texto técnico crudo (`EncoreCameraException: ... (at archivo:línea)`).
- [ ] **Posición de la letra.** Se subió a 22 %; le gusta flotando. Ajustar fino.

## 5. Deuda técnica

- [ ] **EAS Update.** Los builds no tienen canal de actualizaciones, así que cada cambio de JS cuesta un build completo con cola. Evaluar `expo-updates` para mandar cambios de JS sin recompilar.
- [ ] **Casos borde al detener la grabación** en `EncoreCameraView.swift`: `stopRecordingInternal` descarta su callback si ya hay una promesa de stop, y `stopSession` puede dejar esa promesa sin resolver.
- [ ] **`extension String: Error {}`** en `EncoreCameraView.swift` es un atajo; cambiar por un tipo de error propio.
- [ ] **`EncoreCameraException`** existe porque Expo SDK 56 pierde el mensaje en `promise.reject(code, message)`. Al subir a SDK 57 se puede simplificar.
- [ ] **Errores de tipos preexistentes** en `server/` al correr `npx tsc --noEmit`.
- [ ] **Avisos del compilador:** `allowBluetooth` y `asset.duration` están deprecados.
- [ ] **`EncoreCameraFormat.supportedFormats`** puede fallar si una cámara reporta un rango de fps no entero (por ejemplo 29.97).
