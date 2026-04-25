# Fitness Tracker Backend

NestJS backend application for the Fitness Tracker project.

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database ORM**: TypeORM 0.3.x
- **Database**: PostgreSQL 16
- **Authentication**: Google OAuth 2.0 + JWT (Passport.js)
- **Validation**: class-validator, class-transformer
- **Testing**: Jest

## Prerequisites

- Node.js 20.x or later
- PostgreSQL 16 (or use Docker Compose)

## Installation

```bash
npm install
```

## Configuration

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Update the following variables:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` - PostgreSQL connection
- `JWT_SECRET` - Secret key for JWT signing (change in production!)
- `GOOGLE_CLIENT_ID` - Google OAuth 2.0 Client ID

## Running the Application

Start local PostgreSQL (from the repo root):

```bash
docker compose -f scripts/docker-compose.postgres.yml up -d
```

Then start the application:

```bash
npm run start:dev
```

TypeORM migrations run automatically on boot and create the schema on a fresh database. The API will be available at `http://localhost:3000`.

## API Endpoints

### Health Check
- `GET /` - Welcome message
- `GET /health` - Health check endpoint

### Authentication
- `POST /auth/google` - Authenticate with Google ID token
  - Body: `{ "idToken": "..." }`
  - Returns: `{ "access_token": "jwt", "user": {...} }`

### Users
- `GET /users/me` - Get current user profile (requires JWT)
  - Header: `Authorization: Bearer <jwt>`
  - Returns user profile data

## Authentication

The frontend obtains a short-lived identity token from Google OAuth, then exchanges it with the backend via `POST /auth/google`. The backend verifies the Google token and issues its own 7-day JWT, which the frontend includes as a `Bearer` token on all subsequent API requests.

### Dev-token endpoint

For development and testing, the backend exposes an additional endpoint that issues a JWT without requiring a real Google identity token. It is automatically disabled (`401 Unauthorized`) when `NODE_ENV=production`.

```bash
# Generate a token for a user that exists in the database
curl -s -X POST http://localhost:3000/auth/dev-token \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com"}' \
  | jq -r '.access_token'

# Save it for subsequent requests
export JWT=$(curl -s -X POST http://localhost:3000/auth/dev-token \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com"}' \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $JWT" http://localhost:3000/users/me
```

The E2E test suite uses this endpoint to authenticate programmatically without Google credentials.

## Database Schema

The application connects to the PostgreSQL database with the following tables:

- `users` - User profiles
- `foods` - Food items (global and user-owned)
- `foods_eaten` - Food consumption records
- `exercises` - Exercise types
- `exercises_performed` - Exercise activity records
- `weights` - Weight tracking records
- `report_entries` - Daily summary reports

## Entity Structure

### Critical Business Logic

**FoodEaten.getRatio()** - Complex serving size conversion
- Handles conversion between different serving types (ounces, cups, tablespoons, etc.)
- Ported from Java (FoodEaten.java:157-169)

**ActivityLevel Enum** - Stored as numeric values in database
- Uses custom TypeORM transformer to convert between enum and float
- Values: SEDENTARY (1.25), LIGHTLY_ACTIVE (1.3), MODERATELY_ACTIVE (1.5), VERY_ACTIVE (1.7), EXTREMELY_ACTIVE (2.0)

## TypeORM Migrations

### View Migrations Status

```bash
npm run migration:show
```

### Generate New Migration

After modifying entities:

```bash
npm run migration:generate -- src/migrations/DescriptiveName
```

### Run Migrations

```bash
npm run migration:run
```

### Revert Last Migration

```bash
npm run migration:revert
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module
├── app.controller.ts       # Root controller
├── app.service.ts          # Root service
│
├── config/                 # Configuration files
│   ├── database.config.ts  # TypeORM configuration
│   └── validation.schema.ts # Environment validation
│
├── common/                 # Shared resources
│   ├── enums/              # Enums (Sex, ActivityLevel, ServingType)
│   ├── decorators/         # Custom decorators (@CurrentUser)
│   └── guards/             # Guards (JwtAuthGuard)
│
├── entities/               # TypeORM entities
│
├── auth/                   # Authentication module
│   ├── strategies/         # Passport strategies
│   └── dto/                # Data Transfer Objects
│
├── users/                  # Users module
│
└── migrations/             # TypeORM migrations
```

## Development Notes

### Building

```bash
npm run build
```

Compiled files will be in the `dist/` directory.

### Linting

```bash
npm run lint
```

### Code Formatting

```bash
npm run format
```
