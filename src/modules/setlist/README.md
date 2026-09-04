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

## Regla de predicción (tour-strict)

El motor **solo** usa shows previos de la **misma gira** (`tour_id`). No mezcla giras distintas ni el historial completo del artista.

| Condición | Resultado |
|---|---|
| Show sin `tour_id` | `insufficient_data` + mensaje "no gira asignada" |
| Misma gira pero &lt; 3 shows previos | `insufficient_data` + "Aún no hay suficientes shows de esta gira…" |
| ≥ 3 shows previos en la gira | Predicción con confianza por canción |

Tras cambios en ingesta, re-correr `POST /api/admin/setlist-ingest/[artistId]` para que los shows históricos queden con `tour_id` (setlist.fm expone `tour.name`).

## Does NOT

- Modo LIVE con cámara/sync (M5/M8)
- Edición colaborativa de setlists
