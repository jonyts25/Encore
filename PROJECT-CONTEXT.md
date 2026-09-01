# PROJECT-CONTEXT.md — Encore

> **Cursor: lee este archivo antes de cualquier tarea. Es la fuente de verdad.**
> Si algo aquí contradice tu instinto, gana este archivo.
> Si algo no está aquí, está en `ARCHITECTURE.md`. No inventes.

---

## Qué es Encore

Un compañero de conciertos. No es una red social, no es una boletera, no es un
reproductor de música. Es la app que acompaña al fan **desde que compra el boleto
hasta el día después del show**.

El usuario abre Encore cuando:
1. Quiere saber qué conciertos tiene en puerta.
2. Quiere prepararse: qué van a tocar, aprenderse las letras, armar la playlist.
3. Está **en el concierto**: quiere la letra a la mano mientras graba o canta.
4. Salió del show: quiere guardar el recuerdo y compartirlo.

**El wedge**: nadie ha empaquetado ese journey completo. Está roto entre
setlist.fm, Spotify, Genius, Bandsintown e Instagram. Encore lo une.

---

## Reglas de oro (no negociables)

1. **Offline-first.** Los venues no tienen señal. Todo lo que el usuario necesita
   en el show (letras, setlist, checklist) DEBE funcionar sin red. Si escribes
   una feature del módulo LIVE que asume conexión, está mal.
2. **El video nunca sale del dispositivo** salvo que el usuario lo suba
   explícitamente. No hay upload automático. Nunca.
3. **Bilingüe desde el día uno.** Todo string va en i18n (`es` / `en`). Cero
   texto hardcodeado en componentes.
4. **Módulos aislados.** Cada módulo tiene su carpeta, sus tipos, su capa de
   datos. Un módulo NO importa el interior de otro — solo su API pública.
5. **RLS siempre.** Toda tabla con datos de usuario lleva Row Level Security
   desde su migración inicial. No "después". No hay excepciones.
6. **Los proveedores externos van detrás de una interfaz.** Nunca llames a
   setlist.fm / LRCLIB / Spotify directo desde un componente. Siempre a través
   de su adapter.

---

## Stack

| Capa | Tecnología |
|---|---|
| Cliente | React Native + Expo (iOS + Android) |
| Estado | Zustand + TanStack Query |
| Backend API | Next.js (Route Handlers) en Railway |
| Base de datos | Supabase (Postgres + RLS + Auth + Storage) |
| Cache local | SQLite (expo-sqlite) + MMKV para preferencias |
| Jobs async | Tabla `ai_jobs` en Supabase + worker Node en Railway |
| Push | Expo Notifications |
| Analítica | PostHog |

---

## Estructura de carpetas

```
/app                    # Expo Router — solo rutas y layout
/src
  /modules
    /identity           # M1
    /catalog            # M2
    /events             # M3
    /setlist            # M4
    /lyrics             # M5
    /playlist           # M6
    /discovery           # M6.5 — señal de gusto, similares, exclusiones
    /prep               # M7
    /live               # M8  ← el módulo nativo crítico
    /memory             # M9
    /social             # M10
    /narrative          # M11
    /notifications      # M12
    /billing            # M13
  /core
    /db                 # SQLite local + sync
    /api                # cliente HTTP hacia Next.js
    /i18n
    /ui                 # design system
    /sync               # motor offline-first
/server                 # Next.js API (repo separado o monorepo)
/supabase/migrations
```

**Cada módulo se ve así:**

```
/modules/setlist
  index.ts        # ← API PÚBLICA. Lo único que otros módulos importan.
  types.ts
  api.ts          # llamadas al backend
  store.ts        # estado local
  /components
  /hooks
  README.md       # qué hace, qué expone, qué NO hace
```

---

## Cómo agregar una feature

1. ¿A qué módulo pertenece? Si no encaja en ninguno, **pregunta antes de crear uno nuevo**.
2. Lee el `README.md` de ese módulo.
3. Si necesita datos nuevos → migración en `/supabase/migrations` **con RLS**.
4. Si necesita datos en el show → decide y documenta si va a SQLite local.
5. Strings a `/core/i18n` en `es` y `en`.

## Cómo NO hacerlo

- ❌ No crees un módulo nuevo sin preguntar.
- ❌ No metas lógica de negocio en componentes de UI.
- ❌ No asumas conexión a internet en `/modules/live`.
- ❌ No guardes letras completas en Supabase (ver nota legal en ARCHITECTURE).
- ❌ No pidas permisos de cámara/micrófono hasta que el usuario entre al modo LIVE.
- ❌ No agregues dependencias pesadas sin justificarlo.

---

## Estado actual

**Fase: 0 — nada construido todavía.**
Siguiente hito: M0 (shell) + M1 (identity) + M2 (catálogo). Ver `EXECUTION-PLAN.md`.

---

## Glosario

- **Show** — un concierto específico (artista + venue + fecha).
- **Tour** — gira; agrupa shows. Base para predecir setlists.
- **Setlist predicho** — lo que probablemente van a tocar, calculado desde shows
  previos del mismo tour.
- **Setlist real** — lo que efectivamente tocaron, confirmado post-show.
- **Prep** — todo lo que pasa antes del show.
- **LIVE** — el modo durante el concierto (letra + cámara).
- **Memory** — el registro post-show.
- **Discografía** — la sección de estadísticas y recap anual del usuario (antes
  llamada "pasaporte"). Vive todo el año en el perfil, se corona en diciembre.
- **Onboarding por evento** — ruta de entrada vía invitación a un show
  específico, sin cuenta previa, distinta al onboarding normal por artista.
