import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSteps1750000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS steps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        count INTEGER NOT NULL,
        UNIQUE(user_id, date)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_steps_user_date ON steps(user_id, date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_steps_date ON steps(date)
    `);

    await queryRunner.query(`
      ALTER TABLE report_entries
        ADD COLUMN IF NOT EXISTS steps INTEGER NOT NULL DEFAULT 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE report_entries DROP COLUMN IF EXISTS steps
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS steps`);
  }
}
