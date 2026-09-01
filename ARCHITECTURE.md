# Encore — Documento de Arquitectura

**Versión:** 0.1 (diseño inicial)
**Codename:** Encore *(nombre tentativo — funciona en ES y EN, término de concierto universal)*
**Plataforma:** React Native + Expo · iOS + Android
**Mercado:** Bilingüe ES/EN desde el lanzamiento

---

## 1. Tesis del producto

### El problema

El fan de conciertos vive un journey roto en cinco apps distintas:

| Momento | Hoy usa | Problema |
|---|---|---|
| "¿Qué conciertos vienen?" | Bandsintown, Shazam, IG | No sabe qué ya compró |
| "¿Qué van a tocar?" | setlist.fm | Web fea, no personalizada |
| "Quiero aprenderme las canciones" | Spotify + Genius | Manual, dos apps |
| "Estoy en el show" | Nada | Sale de la experiencia a buscar letra |
| "Quiero recordar esto" | Cámara + IG | Se pierde en el carrete |

Nadie une los cinco. Ese es el negocio.

### La tesis

> Encore convierte "compré un boleto" en una experiencia de anticipación,
> presencia y memoria.

Tres momentos de valor, tres motores de retención distintos:

1. **ANTES** (semanas) — anticipación → engagement recurrente
2. **DURANTE** (horas) — utilidad en vivo → el momento diferenciador
3. **DESPUÉS** (para siempre) — memoria acumulada → switching cost

El tercero es el foso. Un usuario con 40 conciertos registrados en Encore no
se cambia de app. Es el modelo Letterboxd / Strava aplicado a música en vivo.

### Por qué ahora

- setlist.fm tiene API abierta con más de 10 millones de setlists — el dato duro ya existe.
- Meta cerró el grafo social, así que nadie va a construir esto desde Facebook.
- El mercado hispanohablante (regional mexicano, latino) está mal cubierto por
  setlist.fm. Hueco real, y es tu mercado local.
- La IA generativa hace viable la capa narrativa (guía personalizada del show)
  que hace 3 años habría requerido un equipo editorial.

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────┐
│  APP (React Native / Expo)                      │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ Módulos   │  │ Core      │  │ SQLite      │  │
│  │ M1..M13   │──│ sync/i18n │──│ local cache │  │
│  └───────────┘  └───────────┘  └─────────────┘  │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────┐
│  API (Next.js en Railway)                       │
│  · Route handlers  · Adapters externos          │
│  · Rate limiting   · Cache (Redis opcional)     │
└──────┬────────────────────────────┬─────────────┘
       │                            │
┌──────▼─────────┐        ┌─────────▼────────────┐
│  Supabase      │        │  Proveedores externos│
│  Postgres+RLS  │        │  setlist.fm          │
│  Auth, Storage │        │  Spotify / Apple     │
└──────┬─────────┘        │  LRCLIB / Musixmatch │
       │                  │  MusicBrainz         │
┌──────▼─────────┐        └──────────────────────┘
│  Worker (Rail) │
│  ai_jobs queue │
│  ingesta setl. │
└────────────────┘
```

**Por qué el API intermedio y no llamar Supabase directo desde la app:**
las llaves de proveedores externos (setlist.fm, Spotify, Musixmatch) nunca
pueden vivir en el cliente. El backend también centraliza cache y rate limiting,
que con APIs de terceros es obligatorio, no opcional.

---

## 3. Módulos

Cada módulo es independiente, tiene su propia carpeta y expone una API pública
mínima. Esto permite construir, actualizar y reemplazar features sin tocar el
resto.

---

### M0 — Shell / Core
**Qué hace:** navegación, tema, i18n, cliente HTTP, motor de sincronización offline.
**Depende de:** nada. Todos dependen de él.
**Clave:** el motor de sync (`/core/sync`) es lo más importante de toda la app.
Define cómo los datos viven en SQLite local y se reconcilian con el servidor.

---

### M1 — Identity
**Qué hace:** registro, login, perfil, preferencias, roles, borrado de cuenta.
**Expone:** `useSession()`, `useProfile()`, `hasEntitlement(feature)`

**Roles del sistema:**

| Rol | Quién | Puede |
|---|---|---|
| `guest` | sin cuenta | explorar catálogo, ver setlists públicos |
| `user` | registrado gratis | todo lo core, límites en features premium |
| `pro` | suscriptor | features premium sin límite |
| `contributor` | usuario con reputación | editar setlists, corregir datos |
| `moderator` | staff | moderar UGC, resolver reportes |
| `admin` | staff | todo |

🚩 **A discutir:** ¿queremos `guest` real (uso sin cuenta)? Baja la fricción de
entrada muchísimo, pero complica el sync y el modelo de datos. Mi voto: sí, con
migración a cuenta cuando el usuario quiera guardar algo.

---

### M2 — Catalog
**Qué hace:** artistas, canciones, álbumes, giras. La capa canónica de datos musicales.
**Fuentes:** MusicBrainz (IDs canónicos, gratis, abierto) + setlist.fm + Spotify.
**Clave:** usar MusicBrainz MBID como identificador universal evita el infierno
de reconciliar "Café Tacvba" vs "Cafe Tacuba" vs "Café Tacuba" entre proveedores.

---

### M3 — Events & Discovery
**Qué hace:** descubrir conciertos próximos, seguir artistas, registrar "voy a este show".
**Fuentes:** setlist.fm (shows anunciados), ingesta manual, importación de boletos.

**Sobre boletos** 🚩: no hay API pública decente de boleteras mexicanas
(Boletia, Superboletos, Ticketmaster MX). Estrategia por fases:
1. **v1** — el usuario marca manualmente "voy a este show". Fricción baja, cero integración.
2. **v2** — importar por foto del boleto (OCR) o reenviando el email de confirmación
   a una dirección de Encore que lo parsea.
3. **v3** — integración directa si el volumen justifica negociar.

No prometas integración de boletos en el marketing hasta tener v3.

**Onboarding por evento — invitar amigos sin cuenta previa:**

Ruta de entrada distinta a la normal (buscar y seguir artistas). Es un loop
de crecimiento y a la vez la mejor fuente de señal de gusto que tiene la app,
porque captura interés *después* de vivir la experiencia, no en frío.

```
1. Usuario A marca "voy a este show" → invita por link (WhatsApp/SMS/copiar link)
2. El invitado abre el link → landing con el show precargado
   ("Fulano te invitó a ver a Aleks Syntek el 14 de nov")
3. Cuenta gratis ligera — solo lo mínimo para entrar, NO el onboarding
   completo de M1. Se le sugiere seguir al artista, pero es opcional.
4. Acceso a prep (M7) y modo LIVE (M8) de ESE show específico, aunque no
   haya seguido a nadie más ni completado su perfil
5. Post-show → prompt explícito: "¿te gustó Aleks Syntek? Seguir / No gracias"
   → esta señal alimenta directo M6.5 (artist_exclusions o follow real)
6. A partir de ahí, conversión suave al onboarding completo cuando el
   usuario quiera marcar su próximo show
```

Esto es una ruta de onboarding formal, con su propia tabla:

```
show_invites   inviter_id, show_id, invite_code, invited_contact,
               status (sent/opened/signed_up/attended), created_at
```

🚩 **A discutir:** ¿cuánto puede hacer un invitado sin completar cuenta
verificada (email/teléfono confirmado)? Definir el mínimo viable para
prevenir spam de invitaciones sin frenar la conversión.

---

### M4 — Setlist Intelligence
**Qué hace:** el corazón analítico. Ingesta setlists históricos y predice qué se va a tocar.

**Motor de predicción:**
```
Entrada:  tour_id, artist_id, fecha del show
Proceso:  1. Traer los últimos N shows del mismo tour
          2. Frecuencia por canción (% de shows donde apareció)
          3. Posición promedio en el set
          4. Detectar estructura fija vs rotativa
          5. Marcar "wildcards" (canciones que rotan)
Salida:   setlist predicho con % de confianza por canción
```

Esto es defendible: setlist.fm te da el dato crudo, pero **nadie lo convierte en
predicción presentable con nivel de confianza**. Es el mismo patrón de
datos-a-narrativa que ya dominas.

**Además:** setlist en vivo de otras ciudades de la gira mientras esperas tu show.

---

### M5 — Lyrics
**Qué hace:** obtener, cachear y sincronizar letras.

**⚠️ ESTE MÓDULO TIENE RIESGO LEGAL. LEER COMPLETO.**

**Arquitectura obligatoria: proveedor intercambiable.**

```ts
interface LyricsProvider {
  search(artist: string, title: string): Promise<LyricsMatch[]>
  fetch(id: string): Promise<Lyrics>          // texto plano
  fetchSynced(id: string): Promise<SyncedLyrics | null>  // con timestamps
  readonly attribution: string
  readonly allowsCommercialUse: boolean
}
```

**Opciones evaluadas:**

| Proveedor | Costo | Sincronizadas | Uso comercial | Veredicto |
|---|---|---|---|---|
| Musixmatch free | $0 | No | No | Solo desarrollo (30% preview) |
| Musixmatch licenciado | $$$ | Sí | Sí | Destino final |
| LRCLIB | $0 | Sí | Zona gris | MVP/beta con reservas |
| Genius (scraping) | $0 | No | No | Descartado — viola ToS |
| APIs reversed | $0 | Sí | No | Descartado — ilegal |
| Deep link externo | $0 | N/A | Sí | Fallback siempre disponible |

**Plan recomendado:**
- **Fase beta cerrada:** LRCLIB. Sin monetizar la feature de letras. Proceso DMCA
  visible. Letras **nunca** se almacenan en tu Supabase — solo cache en el
  dispositivo del usuario con TTL.
- **Antes de abrir paywall:** contratar Musixmatch. Cambias el adapter, nada más.
- **Siempre:** fallback a deep link si no hay letra disponible.

🚩 **A discutir con abogado antes de monetizar.** Esto no es paranoia — es la
diferencia entre un producto vendible y una demanda de editoras musicales.

---

### M6 — Playlist Bridge
**Qué hace:** genera playlist en Spotify/Apple Music desde el setlist predicho.
**También es tu fuente principal de señal de gusto** — ver M6.5.

🚩 **Riesgo:** Spotify endureció el acceso a su API para apps nuevas. Requiere
aprobación para pasar de development mode (25 usuarios) a producción. **Aplicar
temprano**, el proceso tarda. Apple Music (MusicKit) requiere Apple Developer
Program y es más estable pero menos usado en LatAm.

🚩 **Importante — verificado:** desde el 27 de noviembre de 2024, Spotify
deprecó permanentemente para apps nuevas los endpoints de **Related Artists**,
Recommendations, Audio Features y Audio Analysis. No hay reemplazo oficial y
no hay marcha atrás anunciada. **No diseñes ninguna feature de "artistas
similares" ni de recomendación asumiendo que Spotify te la resuelve.** Lo que
sigue funcionando y sí puedes usar: búsqueda, lookup de artista/álbum/track,
control de reproducción, y gestión de playlists del usuario — suficiente para
el propósito de este módulo (crear la playlist) y para leer su biblioteca
(ver M6.5).

Fallback si te rechazan la extensión de cuota: exportar la lista como
texto/deeplinks individuales en vez de crear la playlist directamente.

---

### M6.5 — Discovery Engine
**Qué hace:** decide qué artistas y shows mostrarle a cada usuario, y resuelve
el arranque en frío (usuario nuevo sin historial).

**Tres fuentes de señal de gusto, en orden de fuerza:**

1. **Explícita** — el usuario busca y sigue un artista directamente
   ("me gusta Aleks Syntek" → lo sigue). La señal más confiable, pero requiere
   esfuerzo del usuario y casi nadie escribe 40 artistas a mano.

2. **Importada** — el usuario conecta Spotify o Apple Music y Encore lee su
   biblioteca (artistas guardados, top artists, playlists) vía OAuth.
   En segundos tienes decenas de artistas sin que el usuario escriba nada.
   **Esta es la solución real al arranque en frío** — sin esto, un usuario
   nuevo abre la app y no tiene nada que ver. Por esto el scope de M6 debe
   incluir lectura de biblioteca desde el día uno, no solo creación de playlists.

3. **Conductual** — shows marcados, memorias registradas, canciones calificadas.
   Con el tiempo esto es más valioso que lo importado: te dice a quién el
   usuario realmente va a ver en vivo, que no siempre coincide con lo que
   escucha en streaming.

**Cómo se sugieren artistas nuevos ("similares a X"):**

🚩 Spotify Related Artists está muerto para apps nuevas (ver nota en M6).
No hay atajo gratis y bueno. Opciones reales, de más simple a más valiosa:

| Fuente | Qué da | Costo | Cuándo usarla |
|---|---|---|---|
| Last.fm API (`artist.getSimilar`) | Similitud básica, crowdsourced | Gratis | Día uno |
| Tags de género en MusicBrainz | Overlap de género/época | Gratis, ya lo tienes por M2 | Día uno, como refuerzo |
| Filtrado colaborativo propio | "Quien sigue a X también sigue a Y" | Gratis, es SQL sobre tus datos | Cuando tengas masa crítica |

**Filtrado colaborativo propio — cómo funciona sin ser complicado:**
no es un modelo de IA. Es una consulta de co-ocurrencia sobre la tabla
`user_artists`: si muchos usuarios que siguen a A también siguen a B, sugiere
B a quien sigue a A. Necesita volumen para no ser ruido — con un par de
cientos de usuarios da resultados pobres, con unos miles empieza a ser útil.
Por eso arranca con Last.fm + MusicBrainz y se activa esto después, aunque
el modelo de datos (`user_artists`) debe diseñarse pensando en esto desde ya.

**Exclusiones — "no me muestres esto":**

Trivial de construir, cero IA:

```
artist_exclusions   user_id, artist_id, source, created_at
```

Al generar sugerencias, se filtra `NOT IN` contra esta tabla. Decisión de UX
pendiente (no técnica): ¿"no me interesa" silencioso, o "no me gusta" que
además reduce el peso de artistas similares en sugerencias futuras? Ambas son
igual de baratas de implementar — la segunda es un ajuste de score, no un
sistema nuevo.

**Qué le devuelve Encore al usuario una vez que sigue a un artista:**

- Alerta cuando anuncia gira, priorizando su ciudad
- Alerta de venta de boletos — el momento de mayor valor de toda la app
- Contexto al marcar un show: qué está tocando en esta gira, cómo han sido
  shows previos, qué canciones son fijas y cuáles rotan (M4)
- Descubrimiento cruzado: otros usuarios que siguen a ese artista también van
  a ver a otro que toca cerca

🚩 **Riesgo estructural del producto, no solo técnico:** un usuario que sigue
artistas sin gira anunciada en su radio no recibe nada, y una app muda se
desinstala. Dos mitigaciones ya contempladas en el diseño: ampliar el radio
geográfico de alertas ("toca a 5 horas de ti"), y que el módulo Memory (M9)
llene los meses sin conciertos con contenido del historial del propio usuario
(aniversarios de shows pasados, estadísticas acumuladas).

---

### M7 — Prep
**Qué hace:** todo lo previo al show. Countdown, checklist, etiqueta, logística.

Contenido:
- Countdown con hitos ("faltan 12 días")
- Checklist personalizable (transporte, batería, efectivo, outfit)
- **Reglas de etiqueta contextuales** — cambian según tipo de show
  (festival ≠ teatro acústico ≠ arena). Tono ligero: "tips del buen fan",
  no reglamento. Cero moralina.
- Info del venue: mapa, accesos, estacionamiento, clima del día
- Historial: ¿cómo han sido los shows previos de esta gira?

---

### M8 — LIVE ⭐ *el módulo diferenciador*
**Qué hace:** letra + cámara durante el concierto.

**Este es el módulo que justifica que la app sea nativa.**

**Layouts (el usuario elige):**
1. **Franja subtítulo** (default) — cámara full width, letra en banda inferior
   semitransparente al 20-25%. Familiar, no estorba el encuadre.
2. **Split 50/50** — media pantalla cámara, media letra. Para canciones densas.
3. **Solo letra** — sin grabar, para quien nomás quiere cantar.
4. **Overlay flotante** — arrastrable, ocultable con un tap.

**Sincronización de letra:**
- **v1 — manual:** el usuario toca "empezar" cuando arranca la canción. La letra
  avanza con los timestamps del LRC. Barato, funciona bien, cero infraestructura.
- **v2 — automática:** audio fingerprinting identifica canción y posición.
  🚩 ACRCloud o similar cuesta dinero y añade procesamiento de audio en tiempo
  real. No es MVP.
- **Siempre disponible:** scroll manual como escape hatch.

**Implementación:** `react-native-vision-camera` con `AVCaptureVideoPreviewLayer`
(iOS) / CameraX (Android). La letra es una vista de RN encima o al lado — no se
quema en el video. El video guardado es limpio.

🚩 **Decisión abierta:** ¿la letra debe quemarse en el video exportado?
Si sí, necesitas composición de video post-grabación (ffmpeg), que es pesado en
batería y tiempo. **Y multiplica el riesgo legal** — estarías distribuyendo
letra sincronizada en un archivo. Mi voto: NO en v1. La letra es ayuda visual en
vivo, no parte del archivo.

**Restricciones técnicas críticas:**
- Modo offline obligatorio — letra y setlist precargados antes de entrar al venue
- Modo bajo consumo — grabar drena batería brutal; advertir y ofrecer resolución baja
- Pantalla siempre encendida solo mientras el modo LIVE está activo
- No pedir permiso de cámara hasta que el usuario entre aquí

---

### M9 — Memory
**Qué hace:** el diario de conciertos. Post-show.

- Confirmar setlist real vs predicho ("¿acertamos?") — gamificación natural
- Calificar el show, canciones favoritas de la noche
- Adjuntar fotos/videos (referencia local, no upload por default)
- Notas personales
- **Estadísticas acumuladas**: shows asistidos, artistas vistos, canciones
  escuchadas en vivo, ciudades, rachas

**Tu Discografía — pieza propia, no solo un reporte de diciembre**

Es el nombre elegido (sobre "pasaporte") porque habla el idioma del producto:
cada concierto es una pista, el año es un álbum. Alternativas evaluadas:
*Bitácora* (más neutro) y *Setlist de vida* (conecta con M4). Se puede ajustar
el nombre final más adelante sin tocar el diseño.

Dos piezas distintas, no una sola:

1. **Vista persistente en el perfil** — viva todo el año, no solo en diciembre.
   Mapa de ciudades, línea de tiempo de shows, contadores (artistas, canciones
   en vivo, ciudades). Sensación de progreso constante, no un evento aislado.

2. **Recap anual compartible** — la pieza de crecimiento. Generada por el
   narrative engine (M11), diseñada explícitamente para compartir en IG story.
   No solo números en una tarjeta — una narrativa corta del año del usuario.

**Sellos por hito** (gamificación ligera, sin sentirse infantil):
primer show en la app · 10mo show · primer festival · primera vez repitiendo
artista · primer show con un amigo invitado.

**Aniversarios — motor de retención entre shows:**
cada concierto guardado genera su propio recordatorio anual, con la memoria
completa de ese día (foto, setlist real, nota). Push tipo "hace un año viste
a Zoé en el Auditorio Nacional". Esto es lo que mantiene viva la app en los
meses sin conciertos nuevos — responde directo al riesgo #estructural del
motor de descubrimiento (ver M6.5): un usuario sin shows cercanos anunciados
no debe sentir la app muda.

Este módulo es el foso competitivo. Construye switching cost. Priorízalo más
de lo que instintivamente parece.

---

### M10 — Social
**Qué hace:** capa social ligera. **No es una red social.**

**Realidad técnica de Meta (verificada):** Meta cerró el acceso de terceros al
grafo de amigos. No puedes leer la lista de amigos de alguien ni sus intereses.
La Basic Display API de Instagram fue deprecada específicamente para restringir
acceso de terceros a cuentas personales — solo cuentas Business/Creator se
conectan vía Graph API, y todo lo que pase de `public_profile` y `email` requiere
App Review.

**Entonces el diseño correcto es:**
- **Grafo propio ligero** — usuarios de Encore siguen a usuarios de Encore.
  Modelo Letterboxd. Barato de construir.
- **IG/FB solo como salida** — generar tarjetas compartibles bonitas
  ("Voy a ver a X en 12 días", "Mi año en conciertos"). Share sheet nativo,
  cero App Review, cero dependencia de Meta.
- **Descubrimiento por show** — "12 personas de Encore van a este concierto".
  No requiere grafo externo.
- Invitaciones por link/contactos, no por importación de amigos.

Esto es más barato Y más robusto que depender de Meta.

---

### M11 — Narrative Engine (IA)
**Qué hace:** convierte datos en experiencia narrativa. Tu patrón conocido.

Casos de uso:
- **Guía del show** — dado el setlist predicho + tu historial de escucha:
  "esto es lo que vas a vivir esta noche", contexto de canciones, curiosidades,
  cuándo suelen tocar el hit que esperas
- **Resumen post-show** — narrativa de tu noche desde setlist real + tus notas
- **Wrapped anual** — tu año en conciertos, narrado
- **Descubrimiento** — "si te gustó X, este show te va a gustar"

**Arquitectura:** tabla `ai_jobs` en Supabase + worker Node en Railway.
Mismo patrón que ya tienes corriendo. Async, con estados
`pending → processing → done | failed`.

🚩 **Control de costo:** cada generación cuesta. Definir límites por tier desde
el diseño, no después. Cachear agresivamente — la guía de un show es la misma
para todos los que van a ese show, personalizar solo la capa delgada de encima.

---

### M12 — Notifications
**Qué hace:** push relevante, no spam.

Momentos: anuncio de gira de artista seguido · boletos a la venta · countdown
(7 días, 1 día, día del show) · setlist de otra ciudad de tu gira · recordatorio
post-show para registrar memoria.

**Promociones recurrentes de boleteras — no confundir con disponibilidad/inventario:**

No hay API de disponibilidad ni de promociones dinámicas por evento (ver
decisión abierta más abajo — sigue sin haber insumo para eso). Lo que sí es
viable porque no depende de datos en tiempo real de terceros: promociones
**recurrentes y conocidas** (ej. "jueves 2x1 en Ticketmaster"), que son reglas
estables, no inventario específico de un show.

```
recurring_promos   provider, title, description, day_of_week (o fecha fija),
                   is_active, valid_from, valid_until
```

Contenido mantenido a mano (admin/M14), sin scraping ni integración. Dos usos:

1. **Banner/rotativo genérico** en la app — muestra promos vigentes de
   cualquier boletera, sin referenciar eventos específicos.
2. **Push dirigido** — el caso de valor real. El día que aplica una promo
   conocida, se cruza contra usuarios que siguen un artista con show anunciado
   y que **no** han marcado "voy a este show":

```
Cada día con promo activa:
  1. Usuarios que siguen artistas con show anunciado
  2. Filtrar los que NO tienen user_shows.status = 'voy' para ese show
  3. Push: "Hoy es 2x1 en Ticketmaster — [artista] toca el [fecha]"
```

Consulta simple sobre `user_artists` + `user_shows` + `recurring_promos`, sin
IA ni scraping. 🚩 No enviar a quien ya marcó que va — se siente invasivo e
inútil y quema confianza rápido.

🚩 Preferencias granulares desde v1. Una app de conciertos que spamea se
desinstala en una semana.

---

### M13 — Billing / Entitlements
**Qué hace:** suscripciones y control de acceso a features.
**Implementación:** RevenueCat sobre StoreKit/Play Billing. No construyas esto a mano.
**Clave:** un solo punto de verdad `hasEntitlement(feature)`. Nunca chequees el
tier del usuario directamente en un componente.

---

### M14 — Admin / Ops
Moderación de UGC, cola DMCA, dashboard de métricas, gestión de reportes.
No es glamoroso pero es obligatorio antes de escalar.

---

## 4. Arquitectura de datos

### 4.1 Qué vive en Supabase (servidor)

**Catálogo — público, compartido, sin RLS restrictivo (lectura abierta):**

```
artists              mbid, name, image_url, genres[]
songs                artist_id, title, mbid, duration
tours                artist_id, name, year, start_date, end_date
venues               name, city, country, lat, lng, capacity
shows                artist_id, tour_id, venue_id, date, setlistfm_id
show_songs           show_id, song_id, position, is_encore, notes
setlist_predictions  show_id, payload_json, confidence, generated_at
```

**Datos de usuario — RLS estricto, `auth.uid() = user_id` siempre:**

```
profiles             user_id, display_name, avatar, locale, home_city
user_artists         user_id, artist_id, followed_at          (artistas seguidos)
user_shows           user_id, show_id, status, ticket_ref      (voy / fui / interesado)
memories             user_id, show_id, rating, notes, created_at
memory_songs         memory_id, song_id, is_highlight
checklists           user_id, show_id, items_json
follows              follower_id, following_id                 (grafo social)
show_invites         inviter_id, show_id, invite_code, invited_contact,
                     status, created_at                          (M3 — onboarding por evento)
milestones           user_id, type, show_id, achieved_at          (M9 — sellos)
artist_exclusions    user_id, artist_id, source, created_at      (M6.5 — "no me muestres esto")
push_tokens          user_id, token, platform, prefs_json
recurring_promos     provider, title, description, day_of_week,
                     is_active, valid_from, valid_until       (M12 — curado a mano)
entitlements         user_id, tier, expires_at, source
ai_jobs              user_id, type, input_json, output_json, status
```

**Contenido generado por usuarios — RLS + moderación:**

```
setlist_edits        user_id, show_id, payload, status, reviewed_by
reports              reporter_id, target_type, target_id, reason, status
```

**Storage (Supabase buckets):**
```
avatars/{user_id}/           público
memory-media/{user_id}/      PRIVADO — solo si el usuario sube explícitamente
```

### 4.2 Qué vive SOLO en el dispositivo

**Nunca sale del teléfono:**

| Dato | Dónde | Por qué |
|---|---|---|
| **Videos y fotos grabados** | Carrete del sistema | Privacidad. Grabar en público involucra a terceros que no consintieron. Upload solo si el usuario lo pide explícitamente. |
| **Letras cacheadas** | SQLite con TTL | Riesgo legal — no queremos ser distribuidores de letras. El dispositivo cachea lo que el usuario consulta y expira. |
| **Borradores de notas** | SQLite | Hasta que sincroniza |
| **Preferencias de UI** | MMKV | Layout del modo LIVE, tema, tamaño de letra |
| **Tokens OAuth** | Keychain / Keystore | Nunca en SQLite ni AsyncStorage |
| **Cola de acciones offline** | SQLite | Acciones hechas sin red, pendientes de sync |

**Cache local (espejo del servidor, con expiración):**
setlists de shows próximos · info de artistas seguidos · datos de venues ·
checklist activo. Todo esto se precarga cuando el usuario marca "voy a este show".

### 4.3 El motor de sincronización

Esto es lo más importante de la arquitectura y donde más proyectos móviles fallan.

```
Estrategia: local-first con reconciliación

ESCRITURA:
  1. Escribe en SQLite inmediatamente → UI responde al instante
  2. Encola en outbox_queue
  3. Worker de sync procesa cuando hay red
  4. Conflicto → last-write-wins por default,
     salvo `memories` donde gana el dispositivo (son notas personales)

LECTURA:
  1. Lee de SQLite
  2. Revalida en background si hay red y el TTL expiró
  3. Sin red → sirve cache y muestra indicador discreto de "offline"

PRECARGA (crítica):
  Cuando el usuario marca "voy a este show", descarga TODO lo necesario
  para esa noche: setlist predicho, letras, info del venue, checklist.
  Antes de la fecha, verifica que esté completo y avisa si falta algo.
```

---

## 5. Seguridad

| Área | Requisito |
|---|---|
| **RLS** | Toda tabla de usuario, desde la migración inicial. Cero excepciones. |
| **Llaves de terceros** | Solo en el backend. Jamás en el bundle de la app. |
| **Tokens OAuth** | Keychain (iOS) / EncryptedSharedPreferences (Android) |
| **Rate limiting** | Por usuario Y por IP en el API. Los proveedores externos tienen cuotas. |
| **Storage** | Buckets privados con signed URLs de vida corta |
| **Borrado de cuenta** | Obligatorio por Apple. Borrado real en cascada, no soft delete. |
| **Exportación de datos** | GDPR + LFPDPPP (México). Endpoint de export. |
| **Menores** | 🚩 Hay adolescentes en conciertos. Definir edad mínima y flujo de consentimiento. Afecta rating de tienda y obligaciones legales. |
| **Moderación UGC** | Cola de revisión antes de escalar. Edits de setlist y reportes. |
| **DMCA** | Proceso documentado y visible desde antes de lanzar. |

---

## 6. 🚩 Cosas que no estabas considerando

Ordenadas por impacto. Cada una puede descarrilar el proyecto si se descubre tarde.

1. **Conectividad en venues.** Arenas llenas = red saturada, no hay señal.
   Toda la feature estrella (letra en vivo) muere si asume conexión. Por eso
   offline-first es regla de oro, no optimización.

2. **Batería.** Grabar video con pantalla encendida durante 2 horas mata un
   teléfono. Necesitas modo bajo consumo, advertencia proactiva, y sugerir
   power bank en el checklist de prep.

3. **Licencias de letras.** Ya cubierto en M5. Es el riesgo legal #1.

4. **Grabar a terceros.** Tu app facilita grabar en público donde hay gente que
   no consintió. Es exactamente por eso que tu idea de "reglas de etiqueta" es
   más inteligente de lo que parece — es feature Y mitigación de riesgo. Formalízalo:
   el modo LIVE arranca con un recordatorio sutil, y el video no se sube por default.

5. **Revisión de App Store.** Apple exige justificar el uso de cámara
   (guideline 5.1.1) y es estricto con apps que muestran contenido de terceros.
   Prepara textos de permiso claros y ten listo el proceso DMCA antes de someter.

6. **ToS de setlist.fm.** Su API es gratuita pero tiene términos. Lee y respeta
   límites de rate y requisitos de atribución. Cachea agresivamente en tu backend
   para no depender de su disponibilidad ni quemar cuota.

7. **Cobertura de datos en LatAm.** setlist.fm es fuerte en rock/pop anglo, débil
   en regional mexicano y latino. **Esto es amenaza y oportunidad a la vez.**
   Amenaza: tu mercado local puede tener datos pobres. Oportunidad: si construyes
   la capa de contribución comunitaria para llenar ese hueco, te vuelves la
   referencia en español antes que nadie más lo intente.

8. **Aprobación de Spotify API.** Puede tardar y pueden rechazarte. Aplica en
   cuanto tengas un demo, no cuando quieras lanzar.

9. **Costo de IA.** Sin límites por tier y cache agresivo, el módulo narrativo
   se te va en costos. Diseña los límites ahora.

10. **Zonas horarias.** Los shows son eventos en hora local del venue, no del
    usuario. Guardar timestamp con timezone del venue, siempre. Es un bug
    clásico y humillante en apps de eventos.

11. **Multi-dispositivo.** Un usuario con iPhone y iPad espera ver lo mismo.
    El motor de sync debe contemplarlo desde el diseño.

12. **Detección de duplicados de artista.** "Café Tacvba" en cinco grafías entre
    proveedores. Por eso MusicBrainz MBID como identificador canónico.

13. **Arranque en frío.** Un usuario nuevo sin artistas seguidos no tiene nada
    que ver — es la primera impresión de la app y puede matarla en el día uno.
    La importación de biblioteca de Spotify/Apple Music (M6.5) no es un
    "nice-to-have", es la solución al problema. Priorízala en Fase 1, no en Fase 4.

14. **Spotify Related Artists / Recommendations están muertos.** Deprecados
    permanentemente para apps nuevas desde noviembre 2024, sin reemplazo
    oficial. Cualquier feature de "similares" o recomendación necesita
    Last.fm, tags de MusicBrainz, o tu propio filtrado colaborativo — ver M6.5.

---

## 7. Decisiones abiertas para discutir

| # | Decisión | Mi recomendación |
|---|---|---|
| 1 | ¿Proveedor de letras para MVP? | LRCLIB en beta cerrada, Musixmatch antes de monetizar |
| 2 | ¿Modo invitado sin cuenta? | Sí — baja fricción, vale la complejidad |
| 3 | ¿Quemar la letra en el video exportado? | No en v1 — costo técnico y riesgo legal |
| 4 | ¿Auto-sync de letra por fingerprinting? | v2 — no bloquea el MVP |
| 5 | ¿Edad mínima? | Definir con criterio legal antes de someter a tiendas |
| 6 | ¿Nombre definitivo? | Verificar disponibilidad de marca y dominio |
| 7 | ¿Setlists editables por comunidad desde v1? | Sí para LatAm — es tu ventaja de datos |
| 8 | ¿Backend en Next.js o Supabase Edge Functions? | Next.js — ya lo dominas, mejor para adapters complejos |
| 9 | ¿"No me interesa" silencioso o "no me gusta" que ajusta score? | Empezar con silencioso (más simple), agregar ajuste de score cuando el colaborativo esté activo |
| 10 | ¿Nombre final para la sección de Discografía anual? | "Tu Discografía" — evaluar contra Bitácora / Setlist de vida |
| 11 | ¿Cuánto puede hacer un invitado sin verificar cuenta (M3)? | Definir mínimo viable — prevenir spam sin frenar conversión |
| 12 | ¿Disponibilidad/inventario o promos dinámicas por evento? | Sin solución — no hay API. Solo promos recurrentes y conocidas (M12) son viables |

---

*Siguiente: `EXECUTION-PLAN.md` para fases, monetización y estrategia de crecimiento.*
