#!/usr/bin/env bash
#
# Copia de seguridad de la base de datos de la Biblioteca del Instituto.
#
#   ./deploy/backup-db.sh                    # usa DATABASE_URL del entorno
#   DATABASE_URL=... ./deploy/backup-db.sh   # o pásala explícitamente
#
# Guarda un volcado comprimido en ./backups y conserva los últimos 30 días.
# Prográmalo con cron, por ejemplo:
#   0 3 * * * /opt/biblio/deploy/backup-db.sh >> /var/log/biblio-backup.log 2>&1
#
# IMPORTANTE: la versión de `pg_dump` debe ser igual o superior a la del
# servidor PostgreSQL. Si la base de datos es gestionada (p. ej. Neon) y su
# versión es más reciente que el cliente local, instala un `pg_dump` acorde
# (paquete `postgresql-client-<versión>` en Debian/Ubuntu).

set -euo pipefail

# Carga las variables del archivo .env si no vienen del entorno.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DATABASE_URL:?Falta DATABASE_URL}"

# Para volcar es preferible la conexión directa (sin pooling) si existe.
BACKUP_URL="${DIRECT_URL:-$DATABASE_URL}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

mkdir -p "$BACKUP_DIR"
OUTPUT="$BACKUP_DIR/biblio-$STAMP.sql.gz"

echo "[$(now)] Volcando la base de datos en ${OUTPUT}…"
pg_dump --no-owner --no-privileges "$BACKUP_URL" | gzip > "$OUTPUT"

echo "[$(now)] Eliminando copias con más de $RETENTION_DAYS días…"
find "$BACKUP_DIR" -name 'biblio-*.sql.gz' -type f -mtime "+$RETENTION_DAYS" -delete

echo "[$(now)] Hecho. Copias actuales:"
ls -lh "$BACKUP_DIR"
