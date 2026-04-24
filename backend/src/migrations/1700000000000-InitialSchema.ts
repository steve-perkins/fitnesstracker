import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema migration.
 *
 * Creates all tables, extensions, enum types, and indexes for the
 * FitnessTracker database. All statements are idempotent (IF NOT EXISTS),
 * so this migration is safe to apply against a DB that was bootstrapped
 * by an earlier version of schema.sql.
 *
 * down() is intentionally a no-op — reverting the initial schema would
 * destroy all data and there is no meaningful rollback target.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extensions
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
    );

    // Enum types — Postgres has no "CREATE TYPE IF NOT EXISTS" syntax
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE sex_enum AS ENUM ('MALE', 'FEMALE');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE serving_type_enum AS ENUM (
          'OUNCE', 'CUP', 'POUND', 'PINT',
          'TABLESPOON', 'TEASPOON', 'GRAM', 'CUSTOM'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    // Tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sex sex_enum NOT NULL,
        birthdate DATE NOT NULL,
        height_in_inches DOUBLE PRECISION NOT NULL,
        activity_level DOUBLE PRECISION NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(100),
        first_name VARCHAR(20) NOT NULL,
        last_name VARCHAR(20) NOT NULL,
        timezone VARCHAR(50) NOT NULL,
        created_time TIMESTAMP WITH TIME ZONE NOT NULL,
        last_updated_time TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        default_serving_type serving_type_enum NOT NULL,
        serving_type_qty DOUBLE PRECISION NOT NULL,
        calories INTEGER NOT NULL,
        fat DOUBLE PRECISION NOT NULL,
        saturated_fat DOUBLE PRECISION NOT NULL,
        carbs DOUBLE PRECISION NOT NULL,
        fiber DOUBLE PRECISION NOT NULL,
        sugar DOUBLE PRECISION NOT NULL,
        protein DOUBLE PRECISION NOT NULL,
        sodium DOUBLE PRECISION NOT NULL,
        created_time TIMESTAMP WITH TIME ZONE NOT NULL,
        last_updated_time TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE(id, owner_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS foods_eaten (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        serving_type serving_type_enum NOT NULL,
        serving_qty DOUBLE PRECISION NOT NULL,
        UNIQUE(user_id, food_id, date)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(5) NOT NULL,
        metabolic_equivalent DOUBLE PRECISION NOT NULL,
        category VARCHAR(25) NOT NULL,
        description VARCHAR(250) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exercises_performed (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        minutes INTEGER NOT NULL,
        UNIQUE(user_id, exercise_id, date)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weights (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        pounds DOUBLE PRECISION NOT NULL,
        UNIQUE(user_id, date)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        pounds DOUBLE PRECISION NOT NULL DEFAULT 0,
        net_calories INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, date)
      )
    `);

    // Indexes — users
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_email ON users(email)`,
    );

    // Indexes — foods
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_food_owner ON foods(owner_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_food_name ON foods(name)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_food_name_lower ON foods(LOWER(name))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_foods_name_trgm ON foods USING GIN (name gin_trgm_ops)`,
    );

    // Indexes — foods_eaten
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_food_eaten_user_date ON foods_eaten(user_id, date)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_food_eaten_date ON foods_eaten(date)`,
    );

    // Indexes — exercises
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_exercise_category ON exercises(category)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_exercise_description ON exercises(description)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_exercise_description_lower ON exercises(LOWER(description))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_exercises_desc_trgm ON exercises USING GIN (description gin_trgm_ops)`,
    );

    // Indexes — exercises_performed
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_exercise_performed_user_date ON exercises_performed(user_id, date)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_exercise_performed_date ON exercises_performed(date)`,
    );

    // Indexes — weights
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weights(user_id, date)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_weight_date ON weights(date)`,
    );

    // Indexes — report_entries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_report_entries_user_date ON report_entries(user_id, date)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_report_entries_date ON report_entries(date)`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op — reverting the initial schema would destroy all data.
  }
}
