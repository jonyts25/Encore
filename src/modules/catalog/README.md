# M2 — Catalog

Artistas canónicos, búsqueda pública y seguimiento por usuario.

## Public API

- `CatalogScreenContent` — lista + búsqueda (funciona sin sesión)
- `ArtistDetailContent` — ficha de artista + follow + enlaces + shows
- `ArtistLinksRow` — plataformas desde `GET /api/artists/[id]/links`
- `ArtistShowsSection` — shows del artista (`GET /api/artists/[id]/shows`)
- `useArtistFollow(artistId)` — estado de seguimiento (`user_artists`)

## Resolución automática de artistas

Si la búsqueda local no encuentra resultados, el cliente llama a `GET /api/artists/search?q={name}`:

1. Busca en `artists` (Supabase)
2. Si no hay match, consulta MusicBrainz con varios candidatos y `score`
3. Auto-resuelve solo si hay un candidato con score alto y claramente por encima del siguiente
4. Si hay ambigüedad, devuelve candidatos al cliente → `POST /api/artists/resolve-confirm` con el MBID elegido
5. Intenta foto con Apple Music (`ensureArtistImageUrl`) sin bloquear si falla
6. Persiste el artista — la siguiente búsqueda es local/instantánea

## Artist links (MusicBrainz)

Tabla Supabase: `artist_links (artist_id, platform, url, source)`.

Sync admin: `POST /api/admin/artist-links-sync/[artistId]` (header `x-admin-api-key`).

Lee relaciones `url-rels` de MusicBrainz para el `mbid` del artista y hace upsert por plataforma.

## Does NOT

- Importar biblioteca de Spotify (M6.5)
