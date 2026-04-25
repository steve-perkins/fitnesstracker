# FitnessTracker Backend

NestJS REST API with TypeORM and PostgreSQL.

## Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run build              # Build for production
npm run start:prod         # Run production build

# Testing
npm test                   # Run unit tests
npm run test:int           # Run integration tests
npm run test:e2e           # Run E2E tests
npm run test:all           # Run all tests

# Database
npm run migration:generate -- -n MigrationName  # Generate migration from entity changes
npm run migration:run      # Run pending migrations
npm run migration:revert   # Revert last migration
```

## Project Structure

```
src/
├── auth/              # Google OAuth + JWT authentication
├── users/             # User profile management
├── weights/           # Weight tracking
├── steps/             # Steps tracking
├── foods/             # Food CRUD + food diary (foods_eaten)
├── exercises/         # Exercise CRUD + exercise log (exercises_performed)
├── report-entries/    # Daily report summaries (auto-calculated)
├── entities/          # TypeORM entities
├── config/            # Database and validation config
└── main.ts            # App bootstrap with CORS, Swagger
```

## Entities

7 TypeORM entities mapped to PostgreSQL tables:
- `User` → `users`
- `Food` → `foods`
- `FoodEaten` → `foods_eaten`
- `Exercise` → `exercises`
- `ExercisePerformed` → `exercises_performed`
- `Weight` → `weights`
- `Steps` → `steps`
- `ReportEntry` → `report_entries`

## Key Business Logic

### Report Entry Updates
All CRUD operations on foods_eaten, exercises_performed, and weights trigger synchronous report entry recalculation. This happens within the same database transaction.

Location: `src/report-entries/report-entries.service.ts`

### Calorie Calculations
- **Food**: Simple sum from nutritional data
- **Exercise**: `MET × 3.5 × weight_kg ÷ 200 × minutes`

Location: `src/entities/exercise-performed.entity.ts:getCaloriesBurned()`

### Serving Size Conversions
Complex ratio calculations between serving types (OUNCE, CUP, GRAM, etc.)

Location: `src/entities/food-eaten.entity.ts:getRatio()`

### Food Visibility
Foods can be global (owner=null) or user-owned. User foods "shadow" global foods with the same name.

Location: `src/foods/foods.service.ts:findVisibleFoods()`

## Testing Strategy

- **Unit tests** (`*.spec.ts`): Entity calculation methods
- **Integration tests** (`*.int.ts`): Service logic with pg-mem (in-memory PostgreSQL)
- **E2E tests** (`*.e2e-spec.ts`): Full HTTP request/response testing

Test data factory: `test/test-data.factory.ts`

## Authentication

- `POST /auth/google` - Exchange Google ID token for JWT
- `GET /users/me` - Get current user (requires JWT)
- `POST /auth/dev-token` - Development only, disabled in production

JWT Guard: `src/auth/jwt-auth.guard.ts`

## Production Notes

- Swagger is disabled when `NODE_ENV=production`
- `/auth/dev-token` returns 401 when `NODE_ENV=production`
- CORS configured for production frontend URL
