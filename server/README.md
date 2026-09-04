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
- `GET /api/shows/[id]/prediction` — predicted setlist with per-song confidence (public)

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

