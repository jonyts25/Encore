# M5 — Lyrics (cliente)

Letras con scroll automático o manual — base del modo LIVE.

## Public API

- `LyricsScreenContent` — pantalla de letra con auto-scroll
- `LyricsScrollPanel` — panel reutilizable (también en LIVE overlay)
- `useLyrics(artist, title)` / `useLyricsAutoScroll(...)`
- `fetchLyrics(artist, title)` — cache SQLite local (TTL 24h)

## Modos de scroll (Fase A / M8 base)

1. **synced** — timestamps LRC reales desde LRCLIB
2. **estimated** — reparte `duration_seconds` entre líneas
3. **manual** — botón **Empezar**, 4 s por línea

Siempre: **Pausar**, **Reanudar**, **Reiniciar**.

## Flujo en la app

1. Setlist predicho → **Ver letra**
2. Auto-scroll según datos disponibles
3. **Modo LIVE (cámara)** → `/live?artist=…&title=…`

Backend: `GET /api/lyrics/search` devuelve `plain_lyrics`, `synced_lines[]`, `duration_seconds`.

## Reglas

- Letras **nunca** en Supabase
- Cache solo en dispositivo

## Does NOT

- Musixmatch licenciado
- Sync por micrófono (M8 avanzado)
