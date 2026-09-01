# M2 — Catalog

Artistas canónicos, búsqueda pública y seguimiento por usuario.

## Public API

- `CatalogScreenContent` — lista + búsqueda (funciona sin sesión)
- `ArtistDetailContent` — ficha de artista + follow
- `useArtistFollow(artistId)` — estado de seguimiento (`user_artists`)
- `useArtistCatalogSearch()` — query + resultados
- `listPublicArtists`, `searchPublicArtists`, `getArtistById`, `followArtist`, `unfollowArtist`

## Does NOT

- Ingesta de MusicBrainz / setlist.fm (backend, fases posteriores)
- Importar biblioteca de Spotify (M6.5)
