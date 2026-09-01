# Encore — Plan de Ejecución, Monetización y Crecimiento

---

## 1. Fases de desarrollo

Cada fase termina en algo usable. Nada de "construir 4 meses y luego probar".

### Fase 0 — Validación previa (antes de escribir código)
**Duración:** 1-2 semanas · paralelo, no bloqueante

- [ ] Aplicar a Spotify API (development mode) — **el proceso tarda, empieza ya**
- [ ] Registrar cuenta de setlist.fm API y leer sus ToS completos
- [ ] Probar cobertura de setlist.fm con 20 artistas de tu mercado real
      (regional mexicano, rock en español, indie latino). **Si la cobertura es
      mala, eso cambia la estrategia de producto — mejor saberlo ahora.**
- [ ] Contactar Musixmatch para cotización comercial (solo para conocer el número)
- [ ] Verificar disponibilidad de nombre y dominio
- [ ] Hablar con 10 personas que van seguido a conciertos. Preguntar qué odian
      del proceso actual. No les vendas la idea — escucha el problema.

### Fase 1 — Fundación
**Duración estimada:** 3-4 semanas
**Módulos:** M0, M1, M2

- Shell de Expo con navegación, i18n bilingüe, design system
- Auth con Supabase, perfil, modo invitado
- Catálogo: buscar artistas, ver info, seguir
- Motor de sync offline-first (**invierte tiempo aquí, todo depende de esto**)
- Migraciones con RLS desde el primer commit

**Entregable:** puedes buscar y seguir artistas. Funciona sin red.

### Fase 2 — El journey de preparación
**Duración:** 4-5 semanas
**Módulos:** M3, M4, M7

- Ingesta de shows desde setlist.fm
- "Voy a este show" + precarga de datos para offline
- **Motor de predicción de setlist** — el corazón analítico
- Countdown, checklist, reglas de etiqueta contextuales
- Info de venue

**Entregable:** un usuario puede marcar un concierto y llegar preparado.
**Aquí ya tienes algo demostrable y compartible.**

### Fase 3 — El momento LIVE
**Duración:** 3-4 semanas
**Módulos:** M5, M8

- `LyricsProvider` con adapter de LRCLIB
- Modo LIVE: los 4 layouts, sync manual, offline total
- Modo bajo consumo, advertencias de batería
- Recordatorio de etiqueta al entrar

**Entregable:** la feature diferenciadora. **Aquí nace el video viral.**

### Fase 4 — Memoria y social
**Duración:** 3-4 semanas
**Módulos:** M9, M10, M6

- Diario de conciertos, confirmar setlist real vs predicho
- Estadísticas acumuladas
- Grafo social ligero + tarjetas compartibles para IG
- Playlist bridge a Spotify

**Entregable:** el foso competitivo y el motor de crecimiento orgánico.

### Fase 5 — IA y monetización
**Duración:** 3-4 semanas
**Módulos:** M11, M12, M13, M14

- Narrative engine sobre `ai_jobs`
- Push notifications con preferencias granulares
- RevenueCat, paywall, entitlements
- Panel de moderación y cola DMCA

**Entregable:** producto monetizable.

**Total estimado hasta v1 completa: 16-21 semanas.**
MVP demostrable (Fases 1-3): **10-13 semanas**.

---

## 2. Monetización

### Modelo: Freemium con suscripción

**Gratis — generoso a propósito.** La adopción importa más que el ingreso temprano.
- Seguir artistas ilimitado
- Ver setlists predichos
- Diario de conciertos completo
- Modo LIVE con letra (con límite: 3 canciones por show)
- Compartir tarjetas

**Encore Pro — precio ancla: $69-99 MXN / $4.99 USD al mes**
*(o ~$599 MXN / $34.99 USD anual — el anual es donde está el margen)*
- Modo LIVE sin límite
- Guía IA personalizada del show
- Notificación temprana de venta de boletos
- Estadísticas avanzadas y Wrapped
- Sin anuncios
- Playlist auto-sync

### Vectores adicionales (v2+)

1. **B2B con artistas y managers** — presencia oficial verificada, setlist
   confirmado oficialmente, mensajes al público del show. Los artistas pagan por
   canal directo con fans. Margen alto, esfuerzo de ventas alto.
2. **Venues y promotores** — datos agregados de audiencia (anonimizados), promoción
   de shows. En México los promotores tienen presupuesto y poca data.
3. **Afiliación de boletos** — comisión por venta referida. Requiere volumen.
4. **Merch y experiencias** — marketplace curado. Lejano.

### Lo que NO monetizar

- ❌ Las letras — riesgo legal, y es la feature que atrae usuarios
- ❌ El diario de conciertos — es tu foso, debe ser gratis y acumulable
- ❌ Anuncios intrusivos durante el show — mataría la experiencia central

### Realidad financiera

Con 1% de conversión a Pro (conservador para consumer):
- 10,000 usuarios → 100 Pro → ~$7,000 MXN/mes
- 100,000 usuarios → 1,000 Pro → ~$70,000 MXN/mes

**Esto no es negocio hasta los seis dígitos de usuarios.** Diséñalo para escala o
diséñalo como producto de portafolio/marca personal, pero sé honesto contigo sobre
cuál de los dos es.

---

## 3. Estrategia de crecimiento

### El insight central

**El modo LIVE es contenido viral por diseño.** Alguien graba en un concierto con
la letra en pantalla, sube el video a TikTok/IG, y todos preguntan "¿qué app es
esa?". No necesitas comprar ese alcance — necesitas asegurarte de que la app sea
identificable en el video.

**Táctica concreta:** marca de agua discreta y bonita en el layout del modo LIVE.
No un logo feo — algo con diseño, que la gente no quiera quitar. Es tu canal de
adquisición número uno y es gratis.

### Motores de crecimiento por orden de apuesta

**1. Contenido en vivo (el principal)**
Videos de conciertos con letra en pantalla. Ocurre solo si el producto es bueno.
Semilla: paga a 20-30 creadores de nicho musical para que lo usen en shows reales.

**2. Tarjetas compartibles**
"Voy a ver a X en 12 días" · "Tu Discografía anual" · "Acerté 18 de 22 canciones
del setlist". El recap anual (M9) es el momento de mayor viralidad del año en música.

**3. Invitación por evento (loop construido, no solo campaña)**
A diferencia de los otros motores, este vive dentro del producto (M3):
el usuario invita a un amigo a un show específico sin que el amigo tenga
cuenta previa. El amigo entra con fricción mínima, vive la prep y el modo
LIVE de ese show, y decide al final si sigue al artista. Es adquisición Y
señal de gusto de alta calidad al mismo tiempo — el amigo decide después de
vivir la experiencia, no en frío. Es el motor con mejor costo de adquisición
posible porque no depende de alcance ni de contenido — depende de que la
gente ya va acompañada a los conciertos.

**4. Ventaja de datos en español**
Sé la fuente de setlists de regional mexicano y rock latino que setlist.fm no
cubre bien. Contenido SEO, comunidad de contribuidores, autoridad de nicho.

**5. Lanzamiento por gira, no por región**
No lances "en México". Lanza "para la gira de [artista específico]". Concentra
todo el esfuerzo en un fandom, en fechas concretas. Los fandoms son comunidades
densas y se comunican entre sí.

**6. Comunidad de fandom**
Los fandoms grandes (K-pop, Taylor Swift, corridos tumbados) ya tienen infraestructura
propia de organización. Insértate ahí siendo útil, no promocionando.

### Métricas que importan

| Métrica | Por qué |
|---|---|
| Shows marcados por usuario | Predice retención mejor que DAU |
| % que usa modo LIVE en su show | Salud de la feature diferenciadora |
| % que registra memoria post-show | Predice retención de largo plazo |
| Videos compartidos con marca | Tu motor de adquisición |
| Precisión de predicción de setlist | Tu ventaja técnica, medible |

---

## 4. Prompt para trabajar la estrategia de viralización a fondo

> Copia esto tal cual a ChatGPT (o a otra sesión) para desarrollar la parte
> estratégica con más profundidad de la que cabe en este documento.

```
Eres un estratega de growth especializado en apps de consumo, con experiencia
específica en productos de música, entretenimiento y comunidades de fandom.
Has llevado apps de cero a millones de usuarios sin presupuesto grande de
adquisición pagada.

CONTEXTO DEL PRODUCTO

Encore es una app móvil (iOS + Android) que acompaña al fan de conciertos en
todo su journey:
- ANTES: descubre qué conciertos vienen, ve el setlist predicho de la gira,
  se aprende las letras, arma la playlist, checklist de preparación con
  "reglas de etiqueta" para conciertos
- DURANTE: modo LIVE que muestra la letra sincronizada mientras graba video
  con la cámara del teléfono (letra como franja de subtítulo o split screen)
- DESPUÉS: diario de conciertos con estadísticas acumuladas, confirma qué
  tocaron realmente, guarda recuerdos

Mercado: bilingüe español/inglés, con foco inicial en México y Latinoamérica,
donde la cobertura de datos de conciertos en español es mala y hay hueco real.

Modelo: freemium. Gratis genera adopción, suscripción Pro (~$5 USD/mes)
desbloquea modo LIVE ilimitado, guía IA personalizada del show, alertas
tempranas de boletos y estadísticas avanzadas.

Diferenciador principal: nadie ha unido el journey completo. Está fragmentado
entre setlist.fm, Spotify, Genius, Bandsintown e Instagram.

Restricciones reales:
- Presupuesto de marketing muy bajo o nulo al inicio
- Equipo pequeño (un fundador dirigiendo desarrollo asistido por IA)
- No se puede acceder al grafo social de Meta (deprecado para terceros)
- Las letras tienen restricciones de licencia
- El crecimiento tiene que ser mayormente orgánico

LO QUE NECESITO DE TI

1. ESTRATEGIA DE LANZAMIENTO
   Diseña un plan de lanzamiento de 90 días. Argumenta si conviene lanzar
   por gira específica, por fandom, por ciudad o por género musical, y por qué.
   Dame el criterio para elegir el primer objetivo, no solo el objetivo.

2. LOOPS VIRALES
   Identifica y diseña los 3 loops virales más fuertes posibles para este
   producto. Para cada uno: el trigger, la acción del usuario, el output
   compartible, y cómo ese output trae usuarios nuevos. Sé específico sobre
   el diseño del artefacto compartible, no genérico.

3. ESTRATEGIA DE CONTENIDO EN VIVO
   El modo LIVE genera contenido naturalmente compartible (videos de conciertos
   con letra en pantalla). Diseña cómo maximizar eso: qué debe verse en el video,
   cómo hacer que la app sea identificable sin ser molesta, cómo sembrar el
   comportamiento inicial, y con qué tipo de creadores empezar.

4. COMUNIDAD Y FANDOMS
   Los fandoms musicales son comunidades densas y organizadas. Dame tácticas
   concretas para insertarse siendo útil en vez de promocional. Incluye qué NO
   hacer, porque los fandoms detectan y castigan el marketing invasivo.

5. VENTAJA DE DATOS EN ESPAÑOL
   La cobertura de setlists de música en español (regional mexicano, rock latino,
   corridos, indie latino) es mala en las fuentes existentes. Diseña una
   estrategia para convertir eso en foso competitivo: cómo conseguir
   contribuidores, cómo mantener calidad, cómo convertirlo en autoridad de nicho
   y tráfico orgánico.

6. MOMENTOS DE ALTA INTENCIÓN
   Identifica los momentos del año y del ciclo del fan donde la intención de
   descarga es más alta (anuncios de gira, ventas de boletos, temporada de
   festivales, wrapped de fin de año) y cómo capitalizarlos.

7. RETENCIÓN
   Una app de conciertos tiene un problema estructural: la gente va a pocos
   conciertos al año. Diseña estrategias de retención entre shows para que la
   app no se olvide en los meses muertos.

8. MÉTRICAS Y EXPERIMENTOS
   Define las métricas north star y las secundarias. Propón los primeros 5
   experimentos a correr, con hipótesis y criterio de éxito.

FORMATO
Sé concreto y accionable. Prefiero tácticas específicas y ejecutables sobre
marcos teóricos. Si algo que propongo no va a funcionar, dímelo directamente y
explica por qué. Prioriza por impacto y esfuerzo. No me des una lista genérica
de "haz marketing de contenidos" — quiero decisiones específicas para este
producto en este mercado.
```

---

## 5. Riesgos principales

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Licencias de letras bloquean el core | Alta | Provider intercambiable, licenciar antes de monetizar |
| Cobertura pobre de datos en español | Alta | Validar en Fase 0. Si es mala, la contribución comunitaria pasa a ser feature core, no secundaria |
| Spotify rechaza la API | Media | Aplicar temprano, tener fallback de exportación |
| Rechazo de App Store | Media | Textos de permiso claros, DMCA listo antes de someter |
| Frecuencia baja de uso (pocos conciertos/año) | Alta | El módulo Memory y el contenido entre shows son la respuesta |
| Un competidor grande copia la feature | Media | El foso es el historial acumulado, no la feature |

---

*Documentos relacionados: `PROJECT-CONTEXT.md` (contexto permanente para Cursor),
`ARCHITECTURE.md` (diseño técnico completo).*
