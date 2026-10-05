# M7 — Prep

Todo lo previo al show: countdown, checklist local, tips de etiqueta e info del venue.

Cliente puro — usa datos de **M3 Events** (`shows`, `user_shows`) sin backend nuevo.

## Public API

- `ShowDetailWithPrep` — ficha de show + prep en un solo scroll (usa API pública de M3)
- `ShowPrepSection` — bloque prep standalone (si lo necesitas fuera de la ficha)
- `ShowCountdown`, `PrepChecklist`, `EtiquetteTips`, `VenueInfoCard` — piezas individuales
- `useShowChecklist(showId, enabled)` — checklist persistido en SQLite local
- `getCountdownState`, `formatCountdownMessage`, `getDaysUntilShow`
- `inferVenueKind`, `getEtiquetteTips`

## Flujo en la app (para validar con Expo)

1. **Abrir un show** desde la pestaña Shows → `app/show/[id].tsx`
   - Renderiza `ShowDetailWithPrep` (ficha M3 + prep en un solo scroll)

2. **Sin sesión o sin marcar "Voy"**
   - Solo ves artista, venue, fecha y botones de estado (M3)
   - La sección Prep **no se muestra**

3. **Iniciar sesión** (pestaña Perfil) si hace falta

4. **Marcar "Voy"** en el show de prueba Zoé @ Auditorio Nacional
   - Show ID de prueba: `b1ed4802-58ed-498b-8f6-5043fffc2ac7`
   - Tras guardar el status, aparece la sección **Prep**:

5. **Countdown**
   - Muestra hitos según `show_date`:
     - `"Faltan N días"` si faltan más de 1
     - `"¡Es mañana!"` si falta 1 día
     - `"¡Hoy!"` el día del show
   - Si la fecha ya pasó, el countdown no se muestra

6. **Info del venue**
   - Nombre y ciudad/país desde `GET /api/shows/[id]` (campo `venue`)

7. **Checklist**
   - 4 ítems por defecto: transporte, batería/power bank, efectivo, outfit
   - Toca para marcar/desmarcar — persiste en SQLite (`encore-prep.db`) por `show_id`
   - "Restablecer" vuelve todo a desmarcado
   - **No sincroniza con Supabase** (tabla `checklists` es v2)

8. **Tips de etiqueta**
   - Contenido estático según tipo inferido de venue:
     - `arena` (estadio, foro, capacity ≥ 8000)
     - `teatro` (auditorio, teatro, capacity ≤ 3500)
     - `festival` (nombre contiene "festival")
     - `generic` — default si no hay señales claras
   - Tono ligero "tips del buen fan", no reglamento

## Variables de entorno

Usa las mismas que M3: `EXPO_PUBLIC_API_URL`, Supabase para leer `user_shows`.

## Does NOT

- Sync de checklist a Supabase (v2)
- Mapa, clima, estacionamiento del venue (fases posteriores)
- Historial de shows previos de la gira (M4 / futuro)
