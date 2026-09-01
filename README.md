# Encore

Compañero de conciertos — React Native + Expo (cliente) y Next.js (API).

Documentación de diseño: `PROJECT-CONTEXT.md`, `ARCHITECTURE.md`, `EXECUTION-PLAN.md`.

## Requisitos

- Node.js 20+
- npm
- Expo Go (dispositivo) o emulador Android/iOS

## Cliente (Expo)

```bash
npm install
cp .env.example .env   # añade tus credenciales de Supabase
npm start
```

Variables requeridas en `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_API_URL=https://encore-api-production-5b9a.up.railway.app  # opcional
```

Pestañas: **Shows** (próximos conciertos vía API Railway), **Catálogo**, **Inicio**, **Perfil**.

## Backend local (`/server`)

```bash
cd server
npm install
npm run dev   # http://localhost:3000/api/health
```

Para apuntar la app al backend local, en `.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
```

> En dispositivo físico usa la IP de tu máquina, no `localhost`.

## Estructura (M0)

```
app/                 Expo Router
src/modules/         M1–M13 (placeholders)
src/core/            api, i18n, ui, db, sync
server/              Next.js Route Handlers
supabase/migrations/ (vacío por ahora)
```

## Estado

**M3 — events (cliente).** Lista y detalle de shows desde Railway; estado voy/interesado con sesión.
