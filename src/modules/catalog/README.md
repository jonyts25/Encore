# M2 — Catalog

Artistas canónicos, búsqueda pública y seguimiento por usuario.

## Public API

- `CatalogScreenContent` — lista + búsqueda (funciona sin sesión)
- `ArtistDetailContent` — ficha de artista + follow + enlaces + shows
- `ArtistLinksRow` — plataformas desde `GET /api/artists/[id]/links`
- `ArtistShowsSection` — shows del artista (`GET /api/artists/[id]/shows`)
- `useArtistFollow(artistId)` — estado de seguimiento (`user_artists`)

## Artist links (MusicBrainz)

Tabla Supabase: `artist_links (artist_id, platform, url, source)`.

Sync admin: `POST /api/admin/artist-links-sync/[artistId]` (header `x-admin-api-key`).

Lee relaciones `url-rels` de MusicBrainz para el `mbid` del artista y hace upsert por plataforma.

## Does NOT

- Importar biblioteca de Spotify (M6.5)
