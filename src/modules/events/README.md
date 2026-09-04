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

2. **Con sesión — filtro por artistas seguidos**
   - Toggle **Tus artistas** / **Todos los shows**
   - **Tus artistas** → `GET /api/shows/upcoming?followed=true` con `Authorization: Bearer <access_token>`
   - Solo shows cuyo `artist_id` está en `user_artists` del usuario
   - **Todos los shows** → mismo endpoint sin parámetro (lista global)
   - Sin follows: mensaje invitando a ir al **Catálogo** y seguir artistas

3. **Tocar un show** → `app/show/[id].tsx`
   - `GET /api/shows/[id]` con artista, venue, géneros, fecha
   - Sección **Tu estado** con dos botones:
     - **Me interesa** → `status: interesado`
     - **Voy** → `status: voy`

4. **Sin sesión** al tocar un botón de estado
   - Redirige a pestaña **Perfil** (login/registro M1)
   - Mismo patrón que "Seguir" en catálogo M2
   - La pestaña Shows **no muestra el toggle**; solo lista global

5. **Con sesión**
   - `POST /api/shows/[id]/status` con `Authorization: Bearer <access_token>`
   - Estado inicial leído de `user_shows` en Supabase (RLS)
   - Botón activo resaltado; label verde "Estado actual: …"

### Prueba del filtro followed

1. **Invitado:** abrir Shows → lista global, sin toggle.
2. **Login** → aparece toggle; por defecto **Tus artistas**.
3. Sin follows → mensaje vacío + botón **Ir al Catálogo**.
4. En Catálogo, seguir un artista con show próximo (ej. Zoé).
5. Volver a Shows → **Tus artistas** muestra solo shows de artistas seguidos.
6. Cambiar a **Todos los shows** → lista global completa.

## Variables de entorno

La app usa `EXPO_PUBLIC_API_URL` (default: Railway production).

## Does NOT

- Ingesta setlist.fm (backend futuro)
- Precarga offline (M3 fase posterior)
