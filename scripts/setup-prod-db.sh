#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-time production database setup.
#
# Run ONCE after the first deployment, before switching the app connection
# string from postgres to solahub_app. Migrations must have already run
# (they create the solahub_app role).
#
# Required env vars:
#   POSTGRES_HOST          — e.g. monorail.proxy.rlwy.net
#   POSTGRES_PORT          — e.g. 5432
#   POSTGRES_DB            — e.g. solahub_prod
#   POSTGRES_SUPERUSER     — superuser to run this script as (e.g. postgres)
#   POSTGRES_SUPERUSER_PASSWORD
#   SOLAHUB_APP_PASSWORD   — new password for the solahub_app role
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${POSTGRES_HOST:?}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:?}"
: "${POSTGRES_SUPERUSER:?}"
: "${POSTGRES_SUPERUSER_PASSWORD:?}"
: "${SOLAHUB_APP_PASSWORD:?}"

export PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD"

psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_SUPERUSER" \
  -d "$POSTGRES_DB" <<SQL
-- Set password for the application role created by the migration.
ALTER ROLE solahub_app WITH PASSWORD '$SOLAHUB_APP_PASSWORD';

-- Verify RLS is active.
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN (
  'verse_notes', 'reading_plans', 'plan_participants',
  'community_posts', 'community_post_reports'
)
ORDER BY relname;

-- Verify policies exist.
SELECT tablename, policyname, cmd
FROM pg_policies
ORDER BY tablename, policyname;
SQL

echo ""
echo "Done. Update your production connection string to use:"
echo "  Username=solahub_app;Password=<the password you set>"
echo ""
echo "Then redeploy the API — the startup check will confirm RLS is enforced."
