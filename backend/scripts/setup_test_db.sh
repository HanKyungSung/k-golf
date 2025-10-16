#!/usr/bin/env bash
set -euo pipefail

# Setup test database for E2E tests
# This script creates a separate test database and runs migrations
# Works with Docker-based PostgreSQL (see docker-compose.yml)

DB_NAME="k_golf_test"
DB_USER=${POSTGRES_USER:-"kgolf"}
DB_PASSWORD=${POSTGRES_PASSWORD:-"kgolf_password"}
DB_HOST=${POSTGRES_HOST:-"localhost"}
DB_PORT=${POSTGRES_PORT:-"5432"}

echo "🔧 Setting up test database: ${DB_NAME}"
echo "📝 Using PostgreSQL user: ${DB_USER}"
echo "🐳 Connecting to Docker PostgreSQL at ${DB_HOST}:${DB_PORT}"

# Check if PostgreSQL is running
if ! pg_isready -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} > /dev/null 2>&1; then
  echo "❌ PostgreSQL is not running or not accessible"
  echo ""
  echo "To start PostgreSQL (Docker):"
  echo "  docker-compose up -d db"
  echo ""
  echo "To check if it's running:"
  echo "  docker ps | grep kgolf-postgres"
  echo ""
  echo "After starting, run this script again:"
  echo "  npm run db:setup-test"
  exit 1
fi

echo "[1/3] Creating test database if it doesn't exist..."
# Use psql with password from docker-compose.yml
PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d kgolf_app -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d kgolf_app -c "CREATE DATABASE ${DB_NAME};"

echo "✅ Database ${DB_NAME} is ready"

echo "[2/3] Running migrations on test database..."
# Build connection string with credentials from docker-compose.yml
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  npx prisma migrate deploy

echo "[3/3] Test database ready!"
echo ""
echo "✅ Test database created: ${DB_NAME}"
echo "📝 Connection: postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""
echo "Configuration is hardcoded in pos/tests/helpers/database.ts - no .env file needed!"
echo ""
echo "Next steps:"
echo "  1. Start backend: cd ../backend && npm run dev"
echo "  2. Run tests: cd ../pos && npm run test:e2e:ui"
