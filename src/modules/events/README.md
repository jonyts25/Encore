# M3 — Events

Shows próximos, detalle y estado del usuario (`interesado` / `voy` / `fui`).

## Public API

- `UpcomingShowsContent` — lista desde `GET /api/shows/upcoming`
- `ShowDetailContent` — ficha desde `GET /api/shows/[id]`
- `ShowStatusButtons` — `POST /api/shows/[id]/status` (requiere sesión)
- `useUpcomingShows()`, `useShowStatus(showId)`
- `fetchUpcomingShows`, `fetchShowById`, `setShowStatus`

## Flujo en la app (para validar con Expo)

1. **Pestaña "Shows"** (`app/(tabs)/shows.tsx`)
   - Llama al backend Railway: `GET /api/shows/upcoming`
   - Muestra tarjetas: artista, venue, fecha formateada
   - Funciona **sin sesión** (lectura pública)
   - Datos de prueba esperados: Zoé @ Auditorio Nacional CDMX (nov 2026)

2. **Tocar un show** → `app/show/[id].tsx`
   - `GET /api/shows/[id]` con artista, venue, géneros, fecha
   - Sección **Tu estado** con dos botones:
     - **Me interesa** → `status: interesado`
     - **Voy** → `status: voy`

3. **Sin sesión** al tocar un botón de estado
   - Redirige a pestaña **Perfil** (login/registro M1)
   - Mismo patrón que "Seguir" en catálogo M2

4. **Con sesión**
   - `POST /api/shows/[id]/status` con `Authorization: Bearer <access_token>`
   - Estado inicial leído de `user_shows` en Supabase (RLS)
   - Botón activo resaltado; label verde "Estado actual: …"

## Variables de entorno

La app usa `EXPO_PUBLIC_API_URL` (default: Railway production).

## Does NOT

- Ingesta setlist.fm (backend futuro)
- Precarga offline (M3 fase posterior)
