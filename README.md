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
cp .env.example .env   # opcional — ya apunta a Railway por defecto
npm start
```

Pantalla inicial: botón **Probar conexión con el backend** → `GET /api/health`.

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

**M0 — shell.** Sin auth, catálogo ni lógica de negocio.
