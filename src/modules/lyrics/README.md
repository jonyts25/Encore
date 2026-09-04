# M5 — Lyrics (cliente, básico)

Letras con scroll manual — versión mínima para demo en vivo.

## Public API

- `LyricsScreenContent` — texto plano, scroll manual
- `useLyrics(artist, title)`
- `fetchLyrics(artist, title)` — cache SQLite local (TTL 24h)
- `buildGeniusSearchUrl`, `buildSpotifySearchUrl` — fallbacks externos

## Flujo en la app (para validar con Expo)

1. Desde **Setlist predicho** en un show → **Ver letra** en cualquier canción.
2. Pantalla `/lyrics?artist=…&title=…` carga vía `GET /api/lyrics/search`.
3. Si LRCLIB tiene la letra → texto con scroll manual + atribución.
4. Si no → mensaje claro + botones **Genius** / **Spotify** (navegador).
5. Segunda visita a la misma canción → cache local (sin red, si TTL vigente).

## Reglas

- Letras **nunca** en Supabase — solo proxy backend + cache en dispositivo.
- Sin cámara, sin sync automático (intencional para el sábado).

## Does NOT

- Letras sincronizadas (LRC)
- Musixmatch licenciado
- Modo offline completo pre-show
