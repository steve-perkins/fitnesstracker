# scripts/

Developer tooling for building, deploying, and seeding the FitnessTracker application.

## Setup

### Python virtual environment

The Python scripts require `python-dotenv`. Create a virtual environment once and install dependencies:

```bash
python3 -m venv scripts/.venv
source scripts/.venv/bin/activate
pip install -r scripts/requirements.txt
```

Activate the environment each time you open a new shell before running any Python script:

```bash
source scripts/.venv/bin/activate
```

### Environment variables

Copy the example file and fill in your values:

```bash
cp scripts/.env.example scripts/.env
```

`scripts/.env` is git-ignored and must never be committed — it contains credentials and environment-specific paths. See `.env.example` for a description of each variable.

The Python scripts load `.env` automatically via `python-dotenv`, so no manual `export` is needed. Any variable can alternatively be passed as a CLI flag (run a script with `--help` for the full list) or set in your shell environment.

---

## deploy.py — Build and push Docker images

Builds the backend API and web frontend Docker images and pushes them to the private registry. Run this from the repo root before deploying a new version to the server.

```bash
python3 scripts/deploy.py
```

**Required variables** (`scripts/.env`, shell env, or CLI flags):

| Variable | Flag | Description |
|---|---|---|
| `DOCKER_REGISTRY` | `--registry` | Private registry host, e.g. `registry.example.com` |
| `VITE_API_BASE_URL` | `--api-base-url` | Backend API URL baked into the frontend build |
| `VITE_GOOGLE_CLIENT_ID` | `--google-client-id` | Google OAuth client ID baked into the frontend build |

After the push completes, the script prints the commands to run on the remote server to pull and restart the containers.

---

## docker-compose.postgres.yml — Local development database

Runs a PostgreSQL 16 instance for local development. The database schema is created automatically by TypeORM migrations the first time the NestJS application starts.

```bash
# Start
docker compose -f scripts/docker-compose.postgres.yml up -d

# Stop (preserves data volume)
docker compose -f scripts/docker-compose.postgres.yml down

# Wipe everything and start clean
docker compose -f scripts/docker-compose.postgres.yml down -v
docker compose -f scripts/docker-compose.postgres.yml up -d
```

Connection defaults (matching `backend/.env.example`):

| Setting | Value |
|---|---|
| Host | `localhost:5432` |
| Database | `fitness_tracker` |
| Username | `fitness_user` |
| Password | `fitness_dev_password` (or `$POSTGRES_PASSWORD`) |

---

## dump-prod.py — Export a production database snapshot

Connects to the production server over SSH, runs `pg_dump` inside the database container, and writes a plain-SQL file locally. The output is suitable for loading into the local development database.

```bash
python3 scripts/dump-prod.py
```

The dump is written to `scripts/production_dump_<timestamp>.sql`. SQL dump files are git-ignored.

**Variables** (`scripts/.env`, shell env, or CLI flags):

| Variable | Flag | Default | Description |
|---|---|---|---|
| `PROD_SSH_HOST` | `--ssh-host` | *(required)* | Production server hostname or IP |
| `PROD_SSH_USER` | `--ssh-user` | `root` | SSH login username |
| `PROD_SSH_KEY` | `--ssh-key` | *(SSH default)* | Path to SSH private key, e.g. `~/.ssh/id_rsa` |
| `PROD_DB_CONTAINER` | `--db-container` | `db-postgres-fitnesstracker` | Docker container name on the server |
| `PROD_DB_NAME` | `--db-name` | `fitnesstracker` | Database name |
| `PROD_DB_USER` | `--db-user` | `fitnesstracker` | Database username |

The dump is created with `--no-owner --no-privileges` so that production role names do not conflict when loading into a local database with a different username.

---

## load-data.sh — Load a SQL dump into the local database

Pipes a plain-SQL file into the local development database. Run this after starting the NestJS app at least once (so migrations have created the schema) and before you need data.

```bash
scripts/load-data.sh <dump.sql>
```

**Full reset-and-seed workflow:**

```bash
# 1. Wipe and restart the database
docker compose -f scripts/docker-compose.postgres.yml down -v
docker compose -f scripts/docker-compose.postgres.yml up -d

# 2. Boot the NestJS app to run migrations, then stop it
cd backend && npm run start:dev   # wait for "Application is running on: http://[::1]:3000", then Ctrl+C
cd ..

# 3. Load data
scripts/load-data.sh scripts/production_dump_20260101_120000.sql
```

The local Postgres container (`fitness-postgres-dev`) must be running. The script will exit with a clear error if it is not.