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

## Endpoints

### Health
- `GET /api/health` → `{ "status": "ok" }`

### M3 — Events (shows)
- `GET /api/shows/upcoming` — upcoming shows with artist + venue (public)
- `GET /api/shows/[id]` — show detail (public)
- `POST /api/shows/[id]/status` — set `interesado` \| `voy` \| `fui` for authenticated user

Body for status:

```json
{ "status": "voy", "ticket_ref": null }
```

Header: `Authorization: Bearer <supabase_access_token>`

