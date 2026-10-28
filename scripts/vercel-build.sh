#!/bin/sh
# Build en Vercel. En producción aplica migraciones y semilla (idempotente); los previews no tocan la base.
set -e

# Integraciones de Vercel que no crean DATABASE_URL (Supabase, Vercel Postgres) usan estos nombres.
export DATABASE_URL="${DATABASE_URL:-${POSTGRES_PRISMA_URL:-$POSTGRES_URL}}"

npx prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  if [ -z "$DATABASE_URL" ]; then
    echo ""
    echo "✖ Falta la base de datos: no hay DATABASE_URL en el entorno Production de Vercel."
    echo "  1. Proyecto en Vercel → Storage → Create Database → Neon (Postgres) → conéctala a este proyecto (marca Production)."
    echo "  2. Vuelve a desplegar (Deployments → ⋯ → Redeploy). Ver README › Despliegue."
    echo ""
    exit 1
  fi
  npx prisma migrate deploy
  npx prisma db seed
fi

npx next build
