# Biblioteca Institut d'Aran

Aplicación web para el catálogo y la gestión del fondo bibliográfico de la
Biblioteca Institut d'Aran. El catálogo es de consulta pública; la gestión del
fondo está restringida a las cuentas de la plataforma.

- **Visitante** (sin cuenta): consulta el catálogo, busca y filtra por
  categoría, idioma o año, y ve la ficha de cada libro.
- **Editor** (cuenta creada por la dirección): añade, edita y borra libros, y
  gestiona préstamos, reservas, lectores y listas curadas.
- **Dueño/dirección**: además, gestiona las cuentas de la plataforma y consulta
  el registro de actividad.

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
  schema.prisma          Modelo de datos (User, Session, Book, Reader, Loan,
                         Reservation, Collection, AuditLog)
  seed.ts                Datos iniciales
src/
  app/
    page.tsx             Portada
    catalogo/            Catálogo público (búsqueda, filtros, paginación)
    libro/[id]/          Ficha de un libro
    login/               Acceso
    panel/               Área privada (resumen, tareas, libros, colecciones,
                         lectores, préstamos, reservas, estadísticas, usuarios,
                         actividad, cuenta)
  components/            Componentes de la interfaz
  lib/
    auth.ts              Sesiones y comprobaciones de permisos
    session-cookie.ts    Cookie de sesión firmada
    actions/             Server Actions (auth, books, users)
    validation.ts        Esquemas de Zod
    ...
  proxy.ts               Redirección optimista del panel (antes «middleware»)
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
- **Solo en castellano:** la interfaz se escribe directamente en castellano; no
  hay selector de idioma ni diccionarios de traducción.
- **Sanciones:** un lector o lectora puede quedar suspendido hasta una fecha. No
  se le pueden registrar préstamos (ni servir reservas) mientras la suspensión
  esté vigente.
- **Estadísticas:** el panel incluye una página con los libros y autorías más
  prestados, la rotación del fondo y los títulos que nunca se han prestado
  (candidatos al expurgo).
