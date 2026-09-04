# M4 — Setlist (cliente)

Predicción de setlist en la ficha del show.

## Public API

- `SetlistPredictionPanel` — lista predicha con % de confianza + botón "Ver letra"
- `useShowPrediction(showId)`
- `fetchShowPrediction(showId)`

## Flujo en la app (para validar con Expo)

1. Abrir un show con setlists históricos ingestados (ej. Aleks Syntek).
2. En la ficha, sección **Setlist predicho** debajo de géneros.
3. Canciones ordenadas por confianza (mayor → menor).
4. Tocar **Ver letra** → pantalla de letras (M5).

Backend: `GET /api/shows/[id]/prediction` (Railway).

## Does NOT

- Modo LIVE con cámara/sync (M5/M8)
- Edición colaborativa de setlists
