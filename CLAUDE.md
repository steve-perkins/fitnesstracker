# FitnessTracker

Personal fitness tracking application for logging food, exercise, and weight over time.

## Architecture

- **Frontend** (`web/`): React 19 + TypeScript + Vite + Material UI v5
- **Backend** (`backend/`): NestJS + TypeScript + TypeORM + PostgreSQL
- **Auth**: Google OAuth with backend-issued JWT tokens
- **Database**: PostgreSQL 16 with pg_trgm for fuzzy search

## Directory Structure

```
fitnesstracker/
├── backend/         # NestJS REST API
├── web/             # React SPA frontend
├── docs/            # Documentation
└── CLAUDE.md        # This file
```

See `backend/CLAUDE.md` and `web/CLAUDE.md` for directory-specific commands and patterns.

## Key Features

- Food diary with nutritional tracking (calories, fat, saturated fat, carbs, fiber, sugar, protein, sodium)
- Exercise log with MET-based calorie calculations
- Weight tracking with historical charts
- Daily report summaries with 30-day moving averages
- Fuzzy search for foods and exercises (pg_trgm)
- PWA support for mobile

## Database Schema

7 tables with pluralized names:
- `users` - User profiles
- `foods` - Food definitions (global or user-owned)
- `foods_eaten` - Daily food diary entries
- `exercises` - Exercise definitions with MET values
- `exercises_performed` - Daily exercise log
- `weights` - Weight measurements
- `steps` - Step counts
- `report_entries` - Denormalized daily summaries (auto-updated)

## Authentication Flow

1. User clicks "Sign in with Google" in frontend
2. Frontend receives Google ID token
3. Frontend sends token to `POST /auth/google`
4. Backend verifies with Google, looks up user, issues 7-day JWT
5. Frontend stores JWT and uses for all API calls

## Environment Variables

### Backend
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` - PostgreSQL connection
- `JWT_SECRET` - Secret for signing JWTs
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `NODE_ENV` - Set to `production` to disable Swagger and dev-token endpoint

### Frontend (build-time)
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

## Deployment

Docker Compose with:
- PostgreSQL container (internal network)
- NestJS API container
- Nginx container serving React static build
- Traefik reverse proxy with automatic Let's Encrypt SSL

See `scripts/README.md` and `.github/worklows/ci.yml` for build and deployment instructions.

## Future Work

- CI/CD pipeline with GitHub Actions for automated builds
- Configurable hostnames for easier forking/deployment
