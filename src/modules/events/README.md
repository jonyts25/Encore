# M3 — Events

Shows próximos, detalle y estado del usuario (`interesado` / `voy` / `fui`).

## Public API

- `HomeShowsContent` — Inicio con secciones: Mis shows / Me interesa / Para ti
- `UpcomingShowsContent` — lista desde `GET /api/shows/upcoming`
- `ShowSection` — bloque reutilizable título + lista
- `ShowDetailContent` — ficha desde `GET /api/shows/[id]` (+ foto de venue si hay)
- `ShowStatusButtons` — `POST /api/shows/[id]/status` (requiere sesión)
- `useHomeShowSections()`, `useArtistShowSections()`, `useUpcomingShows()`, `useShowStatus()`

## Endpoints backend

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/shows/upcoming` | No | Lista global |
| GET | `/api/shows/upcoming?followed=true` | Sí | Shows de artistas seguidos |
| GET | `/api/shows/home-sections` | Sí | `{ going, interested, for_you }` |
| GET | `/api/artists/[id]/shows` | Opcional | `{ yours, other }` filtrado por artista |
| GET | `/api/shows/[id]` | No | Detalle (+ lazy venue photo) |

## Home — secciones

1. **Mis shows** — `user_shows.status = voy`, fecha futura
2. **Me interesa** — `user_shows.status = interesado`, fecha futura
3. **Para ti** — shows de artistas seguidos sin fila en `user_shows`

Invitados ven CTA para iniciar sesión en Inicio.

## Does NOT

- Ingesta setlist.fm (ver admin setlist-ingest)
- Precarga offline (fase posterior)
