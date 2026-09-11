#!/usr/bin/env bash
# Ежедневный бэкап SQLite прод-базы Рэдианс-СпецТех.
# Использование на VPS: /opt/spetsteh/scripts/backup-sqlite.sh
# Cron (Омск, 03:15): 15 3 * * * /opt/spetsteh/scripts/backup-sqlite.sh >> /var/log/spetsteh-db-backup.log 2>&1

set -euo pipefail

ROOT="${SPETSTEH_ROOT:-/opt/spetsteh}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
COMPOSE_FILE="${ROOT}/docker-compose.prod.yml"
BACKUP_DIR="${ROOT}/backups"
STAMP="$(date +%Y-%m-%d_%H%M)"
DEST="${BACKUP_DIR}/app-${STAMP}.db"
TMP_IN_CONTAINER="/tmp/app-backup-${STAMP}.db"

mkdir -p "${BACKUP_DIR}"
cd "${ROOT}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Не найден ${COMPOSE_FILE}" >&2
  exit 1
fi

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

# Предпочитаем sqlite3 .backup (консистентная копия при открытой БД).
if compose exec -T web sh -c "command -v sqlite3 >/dev/null 2>&1"; then
  compose exec -T web sqlite3 /data/app.db ".backup '${TMP_IN_CONTAINER}'"
  compose cp "web:${TMP_IN_CONTAINER}" "${DEST}"
  compose exec -T web rm -f "${TMP_IN_CONTAINER}" || true
else
  # Fallback: копируем файл (для WAL-режима может быть чуть менее консистентно).
  compose cp web:/data/app.db "${DEST}"
fi

# Сжимаем, если есть gzip.
if command -v gzip >/dev/null 2>&1; then
  gzip -f "${DEST}"
  DEST="${DEST}.gz"
fi

find "${BACKUP_DIR}" -type f \( -name 'app-*.db' -o -name 'app-*.db.gz' \) -mtime "+${KEEP_DAYS}" -delete

echo "$(date -Iseconds) OK ${DEST} (keep ${KEEP_DAYS}d)"
