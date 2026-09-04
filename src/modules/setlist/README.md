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

## Regla de predicción (3 niveles)

El motor usa shows previos de la **misma gira** cuando existen; si no, cae al repertorio general del artista.

| Shows previos en la gira | `structure` | Qué muestra |
|---|---|---|
| ≥ 3 | `mostly_fixed` / `rotating` | Predicción con % de confianza |
| 1 | `single_show_reference` | Setlist real del show anterior + fecha |
| 2 | `limited_tour_data` | Setlist del show más reciente + fechas de referencia |
| 0 | `no_tour_data_fallback` | Repertorio general del artista con % (puede no reflejar la gira) |
| Sin historial alguno | `insufficient_data` | Mensaje vacío |

## Does NOT

- Modo LIVE con cámara/sync (M5/M8)
- Edición colaborativa de setlists
