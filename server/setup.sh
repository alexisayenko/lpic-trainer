#!/usr/bin/env bash
# One-time bootstrap for the lpic-sync API. Run as root on the server after
# copying index.js, package.json, and lpic-sync.service to /tmp:
#   sudo bash /tmp/setup.sh
# Idempotent: re-running keeps existing secrets in /opt/lpic-sync/.env.
set -euo pipefail

APP_DIR=/opt/lpic-sync
DB_NAME=lpic
DB_USER=lpic
ORIGINS="https://lpic.isayenko.org,http://localhost:5173"
PORT=8787

mkdir -p "$APP_DIR"
cp /tmp/index.js /tmp/package.json "$APP_DIR/"
( cd "$APP_DIR" && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1 )

if [ -f "$APP_DIR/.env" ]; then
  echo "[keeping existing $APP_DIR/.env]"
  API_TOKEN=$(grep -E '^API_TOKEN=' "$APP_DIR/.env" | cut -d= -f2-)
else
  DB_PASSWORD=$(openssl rand -hex 24)
  API_TOKEN=$(openssl rand -hex 32)

  mysql <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4;
USE ${DB_NAME};
CREATE TABLE IF NOT EXISTS answers (
  id           CHAR(36)    NOT NULL,
  question_id  VARCHAR(64) NOT NULL,
  picked_index INT         NULL,
  correct      TINYINT(1)  NOT NULL,
  ts           BIGINT      NOT NULL,
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON ${DB_NAME}.answers TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

  umask 077
  cat > "$APP_DIR/.env" <<ENV
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
API_TOKEN=${API_TOKEN}
PORT=${PORT}
ALLOWED_ORIGINS=${ORIGINS}
ENV
fi

cp /tmp/lpic-sync.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now lpic-sync
sleep 1
echo "service: $(systemctl is-active lpic-sync)"
echo "health: $(curl -s localhost:${PORT}/health || echo unreachable)"
echo "API_TOKEN written to ${APP_DIR}/.env — read it there to copy (not printed to avoid logging the secret)."
