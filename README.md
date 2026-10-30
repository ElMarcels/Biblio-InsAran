# Biblioteca Institut d'Aran

Aplicación web para el catálogo y la gestión del fondo bibliográfico de la
Biblioteca Institut d'Aran. El catálogo es de consulta pública; la gestión del
fondo está restringida a las cuentas de la plataforma.

- **Visitante** (sin cuenta): consulta el catálogo, busca y filtra por
  categoría, idioma o año, ve la ficha de cada libro y puede **pedir un título**
  que todavía no está en el catálogo.
- **Lector/a** (sin cuenta de personal): entra en «Mi biblioteca» con su número
  de carné y un PIN, consulta sus préstamos y reservas, prorroga y reserva
  libros, mantiene sus **listas de lectura**, valora y reseña los libros,
  recibe **avisos** (préstamo, reserva, retraso, sanción) y puede pedir
  títulos. El primer acceso obliga a elegir PIN propio.
- **Editor** (cuenta creada por la dirección): añade, edita y borra libros, y
  gestiona préstamos, reservas, lectores, listas curadas y **solicitudes de
  compra** (al aprobar una, el título entra en el catálogo). Cuenta con un
  **calendario de vencimientos** para ver de un vistazo qué devoluciones tocan
  cada día del mes.
- **Dueño/dirección** (y rol ADMIN): además, gestiona las cuentas de la
  plataforma, consulta el registro de actividad y publica las novedades de la
  plataforma (changelog), que cada cuenta de personal ve una sola vez.

---

## Stack

| Pieza | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 (sistema de diseño propio, sin plantillas) |
| Base de datos | PostgreSQL |
| ORM | Prisma 6 |
| Autenticación | Sesiones propias (cookie firmada `httpOnly` + tabla `Session`) |
| Contraseñas | bcrypt (coste 12) |
| Validación | Zod 4 |
| Asistente IA | Gemini (`@google/genai`), solo en el servidor |

---

## Puesta en marcha (desarrollo)

Requisitos: Node.js 20 o superior y una base de datos PostgreSQL accesible
(local o en la nube, por ejemplo [Neon](https://neon.tech)).

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env    # y edita los valores

# 3. Base de datos: aplica el esquema y los datos iniciales
npm run db:migrate      # en desarrollo (crea/aplica migraciones)
npm run db:seed         # crea la cuenta de dirección y libros de ejemplo

# 4. Servidor de desarrollo
npm run dev             # http://localhost:3000
```

### Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL. La usa la aplicación. |
| `DIRECT_URL` | Conexión **directa** (sin pooling). La usan las migraciones. En local puede ser igual que `DATABASE_URL`. |
| `SESSION_SECRET` | Clave (mínimo 32 caracteres) con la que se firma la cookie de sesión. Genera una con `openssl rand -hex 32`. |
| `SMTP_HOST` | Servidor SMTP para enviar avisos por correo (opcional). |
| `SMTP_PORT` | Puerto SMTP (por defecto `587`). |
| `SMTP_SECURE` | `true` para TLS directo en el puerto `465`. |
| `SMTP_USER` | Usuario de autenticación SMTP (opcional). |
| `SMTP_PASSWORD` | Contraseña de autenticación SMTP (opcional). |
| `SMTP_FROM` | Remitente visible en los correos (obligatorio si hay `SMTP_HOST`). |
| `SMTP_DEBUG` | `true` para imprimir la conversación SMTP en los registros (diagnóstico). |
| `CRON_SECRET` | Secreto que protege la ruta de los recordatorios automáticos. Sin él, el cron queda cerrado. |
| `GEMINI_API_KEY` | Clave de Gemini para el asistente Aran. **Solo se lee en el servidor.** Sin ella, el orbe no se muestra y la página `/asistente` explica que falta configurarlo. |
| `GEMINI_MODEL` | Modelo de Gemini (por defecto `gemini-2.5-flash`). |
| `ASSISTANT_ENABLED` | `false` desactiva el asistente sin borrar la clave. |
| `ASSISTANT_DAILY_LIMIT` | Mensajes por identidad y día (por defecto `300`). |
| `ASSISTANT_HISTORY_DAYS` | Días de retención del historial (por defecto `90`). |
| `ASSISTANT_MAX_OUTPUT_TOKENS` | Tope de tokens de cada respuesta (por defecto `2048`). |

> **Neon / proveedores con pooling:** la URL agrupada incluye el sufijo
> `-pooler` en el host. Esa conexión no admite los bloqueos que Prisma necesita
> para migrar, así que `DIRECT_URL` debe apuntar al mismo host **sin** `-pooler`.
> La aplicación usa `DATABASE_URL` (agrupada) y las migraciones usan `DIRECT_URL`.

### Credenciales iniciales

Las crea el *seed*. **Cámbialas en el primer inicio de sesión.** Volver a
ejecutar `npm run db:seed` no modifica contraseñas ya cambiadas.

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Dueño | `biblio-owner` | `InstiBiblio2026` |
| Editor (ejemplo) | `ana.biblioteca` | `BiblioEditor2026` |

La contraseña del dueño se define en `prisma/seed.ts`; puedes ajustarla ahí
antes de sembrar, o cambiarla luego desde **Panel → Mi cuenta**.

---

## Asistente «Aran»

Aran es un asistente de IA integrado en la biblioteca. Aparece como un **orbe
flotante** en todas las páginas (y también en `/asistente`) y responde en el
idioma activo: castellano, catalán o aranés.

### Qué puede hacer según quién seas

| Ámbito | Dónde | Herramientas |
| --- | --- | --- |
| Visitante | Cualquier página pública | Buscar en el catálogo, fichas, disponibilidad, novedades, similares y estadísticas públicas. **Sin historial** y sin datos personales. |
| Lector/a | Con sesión de «Mi biblioteca» | Además, sus propios préstamos, reservas, avisos, listas, historial y estado de cuenta. Puede proponer prórrogas, reservas, listas y solicitudes. |
| Personal | Solo dentro de `/panel` | Circulación, catalogación, lectores, solicitudes, reseñas, listas, estadísticas, avisos y cuentas (según rol). |

El ámbito lo decide **siempre el servidor** a partir de las cookies de sesión.
El endpoint público `/api/asistente` no concede nunca herramientas de panel; el
endpoint `/api/panel/asistente` exige una cuenta de personal activa.

### Seguridad y privacidad

- La clave de Gemini vive solo en el servidor (`GEMINI_API_KEY`); el navegador
  únicamente habla con las rutas internas de la aplicación.
- **Ninguna escritura se ejecuta directamente.** El modelo solo puede *proponer*
  una acción; el servidor valida permisos y datos, guarda la propuesta en
  `AssistantAction` y la persona debe **confirmarla** en una tarjeta. Las
  propuestas caducan a los 5 minutos y están ligadas a la identidad que las
  creó.
- No hay herramientas para borrar, ejecutar SQL libre, hacer envíos masivos ni
  cambiar contraseñas/PIN directamente. Las acciones sensibles (suspender,
  desactivar cuentas, cambiar roles, publicar novedades) tienen riesgo alto y
  confirmación explícita.
- Al modelo no se le envían nombres completos, correos, carnés, PIN, notas ni
  datos personales de terceros. Las consultas de personal usan referencias
  opacas y la interfaz es la que muestra los nombres.
- Los textos de la base de datos (sinopsis, reseñas, títulos) se tratan como
  **datos**, nunca como instrucciones.
- El historial se guarda por cuenta (lector o personal) y se borra
  automáticamente a los `ASSISTANT_HISTORY_DAYS` días. Los visitantes no tienen
  historial persistente.
- Hay límite de mensajes por minuto y límite diario por identidad.

### Puesta en marcha

```bash
# 1. Añade la clave al .env del servidor
GEMINI_API_KEY="tu-clave-de-gemini"
# Opcional: GEMINI_MODEL="gemini-2.5-flash"

> **Nota sobre límites de Gemini:** El nivel gratuito de la API de Gemini tiene
> límites muy bajos (≈10 peticiones/minuto). Si Aran muestra el mensaje
> "Aran ha alcanzado el límite de peticiones", espera unos segundos e inténtalo
> de nuevo. Para uso en producción con varios usuarios simultáneos, considera
> activar el nivel de pago en Google AI Studio. El código incluye reintentos
> automáticos con espera exponencial para mitigar los picos de demanda.

# 2. Aplica la migración del asistente
npm run db:deploy        # producción
# o: npm run db:migrate   # desarrollo

# 3. Reinicia la aplicación
npm run build && npm run start
```

Si despliegas con Nginx, el bloque `location ~ ^/api/(panel/)?asistente(/|$)`
de `deploy/nginx-biblio.conf` desactiva el buffering para que el streaming SSE
llegue al navegador sin esperas. En Vercel no hace falta nada especial.

### Rutas

| Ruta | Uso |
| --- | --- |
| `POST /api/asistente` | Chat público o de lector (SSE). |
| `GET /api/asistente/conversaciones` | Historial de la identidad actual. |
| `GET/PATCH/DELETE /api/asistente/conversaciones/[id]` | Leer, renombrar o borrar una conversación. |
| `POST /api/asistente/acciones/[id]` | Confirmar (`{"decision":"confirm"}`) o cancelar una acción. |
| `POST /api/panel/asistente` | Chat del panel (exige personal). |
| `GET /api/panel/asistente/conversaciones` | Historial del personal. |
| `POST /api/panel/asistente/acciones/[id]` | Confirmar o cancelar acciones del panel. |

### Comprobaciones rápidas

```bash
# Sin clave configurada debe responder 503
curl -i -X POST http://localhost:3000/api/asistente \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hola"}'

# Con clave, el flujo es SSE (text/event-stream)
curl -N -X POST http://localhost:3000/api/asistente \
  -H 'Content-Type: application/json' \
  -d '{"message":"¿Qué novedades hay?","locale":"es"}'
```

---

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compila para producción. |
| `npm run start` | Sirve la compilación de producción. |
| `npm run lint` | Análisis estático (ESLint). |
| `npm run db:migrate` | Crea y aplica migraciones (desarrollo). |
| `npm run db:deploy` | Aplica migraciones pendientes (producción). |
| `npm run db:seed` | Datos iniciales (idempotente). |
| `npm run db:reset` | Borra y recrea la base de datos (¡destructivo!). |
| `npm run db:studio` | Interfaz visual de la base de datos. |

---

## Estructura

```
prisma/
  schema.prisma          Modelo de datos (User, Session, Book, Reader,
                         ReaderSession, Loan, Reservation, Collection,
                         Changelog, ChangelogView, AuditLog, PurchaseSuggestion,
                         Notification, Review, AssistantConversation,
                         AssistantMessage, AssistantAction)
  seed.ts                Datos iniciales
src/
  app/
    page.tsx             Portada
    catalogo/            Catálogo público (búsqueda, filtros, paginación)
    solicitar/           Pedir un título que no está en el catálogo
    libro/[id]/          Ficha de un libro (con reserva y listas para lectoras y lectores)
    login/               Acceso del personal
    mi-biblioteca/       Área del lector/a (acceso con carné y PIN, préstamos,
                         reservas, historial, listas, avisos, solicitudes, cuenta,
                         cambio de PIN)
    panel/               Área privada (resumen, tareas, libros, colecciones,
                         lectores, préstamos, calendario de vencimientos,
                         reservas, solicitudes, estadísticas, usuarios,
                         actividad, changelog, correo y bandeja de salida, cuenta)
    api/cron/            Recordatorios automáticos de retraso (protegidos por CRON_SECRET)
    api/asistente/       Chat e historial del asistente público y de lectores
    api/panel/asistente/ Chat e historial del asistente del panel
    asistente/           Página completa del asistente
  components/
    assistant/           Orbe flotante, chat, tarjetas de libros y de acciones
  lib/
    ai/                  Asistente Aran: Gemini, herramientas, permisos,
                         historial y acciones con confirmación
    auth.ts              Sesiones y comprobaciones de permisos (personal)
    reader-auth.ts       Sesiones y PIN del área del lector/a
    session-cookie.ts    Cookie de sesión firmada (personal)
    reader-session-cookie.ts  Cookie de sesión del lector/a
    changelog.ts         Novedades pendientes por cuenta
    mailer.ts            Envío opcional de correo por SMTP
    notifications.ts     Avisos a la bandeja del lector/a, entrega y plantillas de correo
    reminders.ts         Recordatorios de retraso (cron diario y envío manual)
    actions/             Server Actions (auth, books, users, reader, changelog,
                         purchases, reader-lists, reviews, notifications…)
    validation.ts        Esquemas de Zod
    ...
  proxy.ts               Redirección optimista del panel y del área del lector/a
```

---

## Despliegue en un VPS

Guía resumida para Ubuntu con Node.js, Nginx y PostgreSQL (o Neon como base de
datos gestionada). Ver también `deploy/`.

```bash
# En el servidor, dentro del directorio de la aplicación:
npm ci
npx prisma migrate deploy      # usa DIRECT_URL
npm run build

# Arrancar el servicio (gestionado con systemd; ver deploy/biblio.service)
sudo systemctl restart biblio
```

Nginx actúa como proxy inverso y termina el TLS (ver
`deploy/nginx-biblio.conf`). Como la sesión viaja en una cookie `httpOnly`, el
sitio **debe** servirse por HTTPS.

### Con Docker

También se puede desplegar con contenedores (`Dockerfile` y
`docker-compose.yml`). El contenedor de la aplicación escucha en
`127.0.0.1:3000`, así que Nginx sigue haciendo de proxy inverso.

```bash
# Construir y arrancar la aplicación (lee las variables de .env)
docker compose up -d --build

# Aplicar las migraciones (usa DIRECT_URL)
docker compose run --rm migrate
```

Si prefieres **PostgreSQL autogestionado** en el propio servidor, activa el
perfil `selfhost-db` y ajusta `DATABASE_URL`/`DIRECT_URL` en `.env` para que
apunten al servicio `db` (ver los comentarios de `docker-compose.yml`):

```bash
docker compose --profile selfhost-db up -d --build
```

> Las imágenes se construyen con `output: "standalone"` de Next y con el motor
> de Prisma para Linux. El contenedor **no** incluye secretos: las credenciales
> se pasan en tiempo de ejecución desde `.env`.

### Recordatorios automáticos (cron)

La ruta `GET /api/cron/recordatorios` avisa por correo a quien tenga un
préstamo vencido a los **3, 7 y 14 días**, sin repetir el mismo aviso (y como
mucho uno al día por préstamo, aunque se ejecute el cron y se pulse el botón
manual).

- **Vercel:** `vercel.json` ya declara el cron diario a las `07:00` UTC. Solo hay
  que definir `CRON_SECRET` en las variables de entorno; Vercel lo envía como
  `Authorization: Bearer <CRON_SECRET>`.
- **VPS o cualquier otro alojamiento:** añade una línea al `crontab` (o un
  temporizador de systemd):

  ```cron
  0 7 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/recordatorios
  ```

- **Prueba manual:**

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/recordatorios
  ```

La respuesta es un JSON con el recuento (`overdue`, `sent`, `queued`,
`duplicates`, `withoutEmail`, `errors`). Si falta `CRON_SECRET`, la ruta
responde `503` y no envía nada.

### Copias de seguridad

`deploy/backup-db.sh` vuelca la base de datos con `pg_dump`. Prográmalo con
`cron`:

```cron
0 3 * * * /opt/biblio/deploy/backup-db.sh >> /var/log/biblio-backup.log 2>&1
```

> La versión de `pg_dump` debe ser igual o superior a la del servidor. Si usas
> una base de datos gestionada con una versión más nueva que tu cliente local,
> instala el cliente correspondiente (`postgresql-client-18`, por ejemplo).

---

## Notas técnicas

- **Sesiones:** al iniciar sesión se guarda un token aleatorio en la tabla
  `Session` (hasheado) y una cookie firmada con HMAC que incluye, de forma
  *optimista*, el rol y la caducidad. La validación definitiva (sesión vigente y
  cuenta activa) se hace siempre contra la base de datos. Al desactivar o
  eliminar una cuenta se revocan todas sus sesiones.
- **Permisos:** se comprueban en el servidor (`requireUser` / `requireOwner`)
  además de en `src/proxy.ts`, que adelanta la redirección para las rutas del
  panel.
- **Cache Components desactivado:** la aplicación es totalmente dinámica
  (sesión + base de datos en cada petición). Se dejó el renderizado dinámico
  clásico para que `redirect()` y `notFound()` devuelvan los códigos HTTP
  correctos (307/404) en lugar de transmitirlos con estado 200.
- **Portadas:** son tipográficas (color y composición derivados del título), sin
  imágenes externas, para no depender de ficheros ni de servicios de terceros.
- **Sin registro público:** las cuentas solo puede crearlas el dueño desde el
  panel.
- **Mi biblioteca (personas lectoras):** no hay registro público: cada lector o
  lectora entra con su número de carné y un PIN de 4 a 6 dígitos guardado con
  bcrypt. El PIN inicial es compartido (`INITIAL_READER_PIN` en
  `src/lib/constants.ts`) y el primer acceso obliga a elegir el propio. Las
  sesiones del lector/a viven en la tabla `ReaderSession` (token hasheado,
  cookie aparte `biblio_reader`, caducidad de 30 días); la persona responsable
  puede restablecer el PIN desde la ficha, lo que revoca sus sesiones. Puede
  prorrogar como máximo `READER_MAX_RENEWALS` veces y no si hay reservas de
  otras personas; puede reservar cualquier libro en cualquier momento. También
  puede **crear listas de lectura privadas**, **recibir avisos** en la bandeja (y
  por correo si está configurado), **pedir títulos** y guardarlos en sus listas.
- **Pedir un título:** desde `/solicitar` o desde «Mi biblioteca» cualquiera
  puede pedir un título que no esté en el catálogo. Las solicitudes aparecen en
  **Panel → Solicitudes** y en la **Bandeja de tareas**; al aprobarlas el libro
  entra en el catálogo automáticamente (se evita duplicar si ya existe).
- **Avisos y correo:** los avisos (préstamo, reserva lista para recoger, retraso
  y sanción) se guardan siempre en la bandeja de «Mi biblioteca». Si hay
  configuración SMTP (`SMTP_HOST` / `SMTP_FROM`), también se envían por correo;
  si falta la configuración, la plataforma sigue funcionando sin él.
- **Bandeja de salida:** en **Panel → Correo → Bandeja de salida** se ve cada
  aviso con correo junto a su estado (enviado, pendiente o fallido), el número
  de intentos y el último error. Los fallos se pueden reintentar de uno en uno o
  por lotes de 10; los pendientes quedan así hasta que haya SMTP configurado, de
  modo que ningún aviso se pierde.
- **Recordatorios de retraso:** el cron diario (`/api/cron/recordatorios`,
  protegido con `CRON_SECRET`) avisa a los 3, 7 y 14 días de retraso. El botón
  «Enviar avisos de retraso» del panel hace lo mismo a petición. En ambos casos
  se manda como mucho un aviso por préstamo y día, y cada aviso queda vinculado
  a su préstamo.
- **Novedades (changelog):** el dueño o una cuenta ADMIN publican novedades en
  Markdown desde `/panel/changelog`. Cada publicación aparece una sola vez a
  cada cuenta de personal (se cierra con el aviso y ya no vuelve a aparecer
  hasta la siguiente publicación); quien publica queda marcada como leída. Solo
  afecta a cuentas de personal, nunca al área del lector/a.
- **Idiomas:** la interfaz está disponible en castellano, catalán y aragonés
  (diccionarios en `src/lib/i18n/messages/`, con paridad de claves verificada en
  compilación).
- **Sanciones:** un lector o lectora puede quedar suspendido hasta una fecha. No
  se le pueden registrar préstamos (ni servir reservas) mientras la suspensión
  esté vigente.
- **Estadísticas:** el panel incluye una página con los libros y autorías más
  prestados, la rotación del fondo y los títulos que nunca se han prestado
  (candidatos al expurgo).
- **Calendario de vencimientos:** en **Panel → Calendario** (`/panel/calendario`)
  se ven, mes a mes, todos los préstamos sin devolver agrupados por su fecha de
  vencimiento. Los días ya pasados se resaltan en rojo y cada vencimiento
  enlaza con la ficha del lector/a para gestionarlo.
- **Valoraciones y reseñas:** cada lector/a puede puntuar un libro de 1 a 5
  estrellas y dejar un comentario opcional. Solo se permite una valoración por
  persona y libro (se puede actualizar o eliminar). La ficha del libro muestra
  la media, el total y las reseñas más recientes; para valorar hay que haber
  entrado en «Mi biblioteca» y tener el PIN propio elegido.
