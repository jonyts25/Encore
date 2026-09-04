# Encore API (Next.js)

Backend Route Handlers for Encore.

## Scripts

```bash
npm install
cp .env.example .env   # Supabase URL + publishable key
npm run dev            # http://localhost:3000
npm run build
npm start
```

## Environment

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | yes | Publishable/anon key for Data API + Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (M4 ingest) | Service role for admin writes — never expose to clients |
| `SETLISTFM_API_KEY` | yes (M4 ingest) | setlist.fm API key |
| `SETLISTFM_RATE_LIMIT_PER_SECOND` | no | Default `2` |
| `SETLISTFM_RATE_LIMIT_PER_DAY` | no | Default `1440` |
| `ADMIN_API_KEY` | no | If set, required for `/api/admin/*` |

## Endpoints

### Health
- `GET /api/health` → `{ "status": "ok" }`

### M3 — Events (shows)
- `GET /api/shows/upcoming` — upcoming shows with artist + venue (public)
- `GET /api/shows/upcoming?followed=true` — upcoming shows for followed artists only (requires auth)
- `GET /api/shows/[id]` — show detail (public)
- `POST /api/shows/[id]/status` — set `interesado` \| `voy` \| `fui` for authenticated user

### M4 — Setlist Intelligence

- `POST /api/admin/setlist-ingest/[artistId]` — ingest historical setlists from setlist.fm (admin)
  - Extracts `tour.name` from each setlist.fm record when present
  - If the artist setlist list omits `tour`, fetches the full setlist detail before persisting
  - Upserts `tours (artist_id, name)` and assigns `shows.tour_id` (null when setlist has no tour)
  - Response includes `shows_with_tour` — how many ingested shows were linked to a tour
- `GET /api/shows/[id]/prediction` — predicted setlist with per-song confidence (public)
  - **≥ 3 prior shows on same tour:** statistical prediction with confidence % (`mostly_fixed` / `rotating`)
  - **1–2 prior shows on same tour:** actual setlist from reference show(s), no confidence (`single_show_reference` / `limited_tour_data` + `reference_show_dates`)
  - **0 prior shows on tour:** artist-wide history fallback (`no_tour_data_fallback` + confidence %)

### M5 — Lyrics (basic)
- `GET /api/lyrics/search?artist=X&title=Y` — proxy to LRCLIB (never stored in Supabase)
  - Returns `plain_lyrics`, `synced_lines` (`[{ timestamp_seconds, line }]`), `duration_seconds` when available

Body for status:

```json
{ "status": "voy", "ticket_ref": null }
```

Header: `Authorization: Bearer <supabase_access_token>`

Admin ingest (optional header if `ADMIN_API_KEY` is set):

`Authorization: Bearer <ADMIN_API_KEY>` or `x-admin-api-key: <ADMIN_API_KEY>`

Optional body:

```json
{ "pages": 3, "maxSetlists": 30 }
```

