#!/usr/bin/env bash
# Load a SQL dump into the local development PostgreSQL instance.
#
# Usage:
#   scripts/load-data.sh <dump.sql>
#
# The local Postgres container must already be running and the NestJS app
# must have been started at least once so that TypeORM migrations have
# created the schema.  Typical reset workflow:
#
#   docker compose -f scripts/docker-compose.postgres.yml down -v
#   docker compose -f scripts/docker-compose.postgres.yml up -d
#   npm --prefix backend run start:dev   # wait for "Application is running", then Ctrl+C
#   scripts/load-data.sh production_dump.sql
#
# Production dumps should be created with --no-owner --no-privileges so that
# role references from the production database do not conflict with the local
# fitness_user role.  See scripts/dump-prod.py for an automated export.

set -euo pipefail

DUMP_FILE="${1:-}"
if [[ -z "$DUMP_FILE" ]]; then
    echo "Usage: $0 <dump.sql>" >&2
    exit 1
fi
if [[ ! -f "$DUMP_FILE" ]]; then
    echo "Error: file not found: $DUMP_FILE" >&2
    exit 1
fi

CONTAINER="fitness-postgres-dev"
DB_USER="fitness_user"
DB_NAME="fitness_tracker"

if ! docker container inspect "$CONTAINER" &>/dev/null; then
    echo "Error: container '$CONTAINER' is not running." >&2
    echo "Start it with: docker compose -f scripts/docker-compose.postgres.yml up -d" >&2
    exit 1
fi

echo "Loading $DUMP_FILE into $DB_NAME..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$DUMP_FILE"
echo "Done."