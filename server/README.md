# Encore API (Next.js)

Backend Route Handlers for Encore. M0 includes only the health check.

## Scripts

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
npm start
```

## Endpoints

- `GET /api/health` → `{ "status": "ok" }`

## Environment

No required env vars for M0. Future milestones will add Supabase and third-party provider keys here — never in the mobile app.
