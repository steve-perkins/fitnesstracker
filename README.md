# FitnessTracker

A personal diet and exercise tracking application: food diary with nutritional data, exercise log with calorie-burn estimates, weight history, and daily summary reports.

This is a modernized port of [fitnessjiffy-spring](https://github.com/steve-perkins/fitnessjiffy-spring), a traditional Spring Boot / server-rendered web application. Beyond being a functional app, FitnessTracker is a learning and teaching project that has been ported and re-ported over the years to explore different tech stacks. The current incarnation uses a React SPA frontend and a NestJS REST API backend, both written in TypeScript and structured for agentic collaboration with Claude Code.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Material UI v5 |
| Backend | NestJS, TypeScript, TypeORM |
| Database | PostgreSQL 16 (pg_trgm for fuzzy search) |
| Auth | Google OAuth 2.0 → backend-issued JWT |
| Deployment | Docker, Docker Compose, Traefik (TLS) |
| CI/CD | GitHub Actions |

## Features

- Food diary with full nutritional tracking (calories, fat, carbs, fiber, sugar, protein, sodium)
- Exercise log with MET-based calorie-burn calculations
- Weight tracking with historical charts
- Daily report summaries with 30-day moving averages
- Fuzzy search for foods and exercises
- PWA — installable on mobile

## Running locally

### Prerequisites

- Node.js 20+
- Docker (for the local PostgreSQL instance)
- A Google OAuth 2.0 client ID (for authentication)

### 1. Start the database

```bash
docker compose -f scripts/docker-compose.postgres.yml up -d
```

### 2. Configure and start the backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in your values
npm run start:dev
```

The API starts at `http://localhost:3000`. TypeORM migrations run automatically on first boot and create the schema.

Key `.env` values:

| Variable | Description |
|---|---|
| `DB_*` | PostgreSQL connection (defaults match the local Docker Compose config) |
| `JWT_SECRET` | Any secret string for signing JWTs |
| `GOOGLE_CLIENT_ID` | Your Google OAuth 2.0 client ID |

See [`backend/README.md`](backend/README.md) for the full variable list, migration commands, and API reference.

### 3. Configure and start the frontend

```bash
cd web
npm install
cp .env.example .env   # set VITE_API_BASE_URL and VITE_GOOGLE_CLIENT_ID
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Building and deploying Docker images

The backend and frontend each have a `Dockerfile`. The frontend accepts build-time `ARG`s for the environment variables that get baked into the static build.

### Via CI (recommended)

Merging a PR to `main` runs lint and all tests. A manual approval gate then appears in GitHub Actions — approving it builds and pushes both Docker images to the private registry using secrets stored in the repository.

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the pipeline definition, and the repository's **Settings → Environments → production** for the required secrets:

| Secret | Description |
|---|---|
| `DOCKER_REGISTRY` | Private registry hostname |
| `DOCKER_USERNAME` / `DOCKER_PASSWORD` | Registry credentials |
| `VITE_API_BASE_URL` | Backend API URL baked into the frontend image |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID baked into the frontend image |

### Manually

```bash
python3 scripts/deploy.py
```

Builds and pushes both images, then prints the `docker compose` commands to run on the remote server to pull and restart the containers. Reads credentials from `scripts/.env` (git-ignored).

See [`scripts/README.md`](scripts/README.md) for setup and all available scripts.

## Further reading

| File | Contents |
|---|---|
| [`backend/README.md`](backend/README.md) | API endpoints, auth flow, migrations, testing |
| [`web/CLAUDE.md`](web/CLAUDE.md) | Frontend project structure and component notes |
| [`scripts/README.md`](scripts/README.md) | Deployment script, local DB setup, production data dump |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI/CD pipeline definition |
