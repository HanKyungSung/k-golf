#!/usr/bin/env bash
set -euo pipefail

# Provision K-Golf database (native Postgres) – assumes PostgreSQL server already installed & running.
# chmod +x backend/scripts/provision_native_db.sh
# This script MUST be run on the target server with privileges to sudo as the 'postgres' user.
# It will:
#  1. Create role (login) if missing
#  2. Create database if missing
#  3. Apply Prisma migrations (deploy mode)
#  4. (Optional) enable pg_stat_statements (uncomment if desired)
# It will NOT install PostgreSQL.

ROLE_NAME="kgolf"
DB_NAME="kgolf_app"
DB_PASSWORD=${DB_PASSWORD:-"change_me_password"}
PRISMA_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[1/4] Creating role if absent..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${ROLE_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE ${ROLE_NAME} LOGIN PASSWORD '${DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;"

echo "[2/4] Creating database if absent..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${ROLE_NAME};"

echo "[3/4] (Optional) Ensuring pg_stat_statements extension (uncomment to enable)"
# sudo -u postgres psql -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;" || true

echo "[4/4] Running Prisma migrations (deploy)"
(
  cd "${PRISMA_DIR}" || exit 1
  # Write a temporary .env if none exists
  if [ ! -f .env ]; then
    echo "DATABASE_URL=postgresql://${ROLE_NAME}:${DB_PASSWORD}@localhost:5432/${DB_NAME}" > .env
    echo "Created temporary .env with DATABASE_URL"
  fi
  npx prisma migrate deploy
)

echo "Provision complete. Test connection: psql postgresql://${ROLE_NAME}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
