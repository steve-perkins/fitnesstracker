import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StepsService } from '../../src/steps/steps.service';
import { Step } from '../../src/entities/step.entity';
import { ReportEntry } from '../../src/entities/report-entry.entity';
import { Weight } from '../../src/entities/weight.entity';
import { FoodEaten } from '../../src/entities/food-eaten.entity';
import { ExercisePerformed } from '../../src/entities/exercise-performed.entity';
import { ReportEntriesService } from '../../src/report-entries/report-entries.service';
import { TestDataFactory } from './helpers/test-data.factory';
import {
  createTestDataSource,
  destroyTestDataSource,
} from './helpers/test-database.helper';

describe('StepsService (Integration)', () => {
  let dataSource: DataSource;
  let stepsService: StepsService;
  let reportEntriesService: ReportEntriesService;
  let factory: TestDataFactory;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    factory = new TestDataFactory(dataSource);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepsService,
        ReportEntriesService,
        {
          provide: getRepositoryToken(Step),
          useValue: dataSource.getRepository(Step),
        },
        {
          provide: getRepositoryToken(ReportEntry),
          useValue: dataSource.getRepository(ReportEntry),
        },
        {
          provide: getRepositoryToken(Weight),
          useValue: dataSource.getRepository(Weight),
        },
        {
          provide: getRepositoryToken(FoodEaten),
          useValue: dataSource.getRepository(FoodEaten),
        },
        {
          provide: getRepositoryToken(ExercisePerformed),
          useValue: dataSource.getRepository(ExercisePerformed),
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    stepsService = module.get<StepsService>(StepsService);
    reportEntriesService = module.get<ReportEntriesService>(ReportEntriesService);
  });

  afterAll(async () => {
    await destroyTestDataSource(dataSource);
  });

  afterEach(async () => {
    await dataSource.createQueryBuilder().delete().from(ReportEntry).execute();
    await dataSource.createQueryBuilder().delete().from(ExercisePerformed).execute();
    await dataSource.createQueryBuilder().delete().from(FoodEaten).execute();
    await dataSource.createQueryBuilder().delete().from(Step).execute();
    await dataSource.createQueryBuilder().delete().from(Weight).execute();
    await dataSource.createQueryBuilder().delete().from('users').execute();
  });

  describe('create - Report Entry Triggering', () => {
    it('should create a step entry and trigger report update', async () => {
      const user = await factory.createUser();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Need a weight so a report entry is created
      const weightRepo = dataSource.getRepository(Weight);
      await weightRepo.save(weightRepo.create({ user, date: today, pounds: 180 }));

      await stepsService.create(user.id, {
        date: today.toISOString(),
        count: 8000,
      });

      const reports = await reportEntriesService.findByUserAndDateRange(
        user.id,
        today,
        today,
      );

      expect(reports.length).toBe(1);
      expect(reports[0].steps).toBe(8000);
    });

    it('should throw ConflictException when step entry already exists for date', async () => {
      const user = await factory.createUser();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await stepsService.create(user.id, {
        date: today.toISOString(),
        count: 8000,
      });

      await expect(
        stepsService.create(user.id, {
          date: today.toISOString(),
          count: 9000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update - Report Entry Triggering', () => {
    it('should update step count and trigger report update', async () => {
      const user = await factory.createUser();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weightRepo = dataSource.getRepository(Weight);
      await weightRepo.save(weightRepo.create({ user, date: today, pounds: 180 }));

      const step = await stepsService.create(user.id, {
        date: today.toISOString(),
        count: 8000,
      });

      await stepsService.update(step.id, user.id, { count: 12000 });

      const reports = await reportEntriesService.findByUserAndDateRange(
        user.id,
        today,
        today,
      );

      expect(reports[0].steps).toBe(12000);
    });

    it('should throw NotFoundException when step entry not found', async () => {
      const user = await factory.createUser();

      await expect(
        stepsService.update('00000000-0000-0000-0000-000000000000', user.id, { count: 5000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete - Report Entry Triggering', () => {
    it('should delete step entry and reset steps to 0 in report entry', async () => {
      const user = await factory.createUser();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weightRepo = dataSource.getRepository(Weight);
      await weightRepo.save(weightRepo.create({ user, date: today, pounds: 180 }));

      const step = await stepsService.create(user.id, {
        date: today.toISOString(),
        count: 8000,
      });

      let reports = await reportEntriesService.findByUserAndDateRange(user.id, today, today);
      expect(reports[0].steps).toBe(8000);

      await stepsService.delete(step.id, user.id);

      reports = await reportEntriesService.findByUserAndDateRange(user.id, today, today);
      expect(reports[0].steps).toBe(0);
    });

    it('should throw NotFoundException when step entry not found', async () => {
      const user = await factory.createUser();

      await expect(
        stepsService.delete('00000000-0000-0000-0000-000000000000', user.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOnDate', () => {
    it('should return step entry for exact date', async () => {
      const user = await factory.createUser();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await stepsService.create(user.id, {
        date: today.toISOString(),
        count: 7500,
      });

      const step = await stepsService.findOnDate(user.id, today);

      expect(step).toBeDefined();
      expect(step!.count).toBe(7500);
    });

    it('should return null when no step entry exists for date', async () => {
      const user = await factory.createUser();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const step = await stepsService.findOnDate(user.id, today);

      expect(step).toBeNull();
    });

    it('should not return entries from other dates', async () => {
      const user = await factory.createUser();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      await stepsService.create(user.id, {
        date: yesterday.toISOString(),
        count: 6000,
      });

      const step = await stepsService.findOnDate(user.id, today);

      expect(step).toBeNull();
    });
  });

  describe('findAllByUser', () => {
    it('should return all step entries sorted by date DESC', async () => {
      const user = await factory.createUser();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      await stepsService.create(user.id, { date: twoDaysAgo.toISOString(), count: 5000 });
      await stepsService.create(user.id, { date: today.toISOString(), count: 9000 });
      await stepsService.create(user.id, { date: yesterday.toISOString(), count: 7000 });

      const steps = await stepsService.findAllByUser(user.id);

      expect(steps.length).toBe(3);
      expect(steps[0].count).toBe(9000); // today (most recent)
      expect(steps[1].count).toBe(7000); // yesterday
      expect(steps[2].count).toBe(5000); // 2 days ago
    });

    it('should not return other users step entries', async () => {
      const user1 = await factory.createUser({ email: 'user1@example.com' });
      const user2 = await factory.createUser({ email: 'user2@example.com' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await stepsService.create(user1.id, { date: today.toISOString(), count: 8000 });
      await stepsService.create(user2.id, { date: today.toISOString(), count: 12000 });

      const user1Steps = await stepsService.findAllByUser(user1.id);
      const user2Steps = await stepsService.findAllByUser(user2.id);

      expect(user1Steps.length).toBe(1);
      expect(user1Steps[0].count).toBe(8000);

      expect(user2Steps.length).toBe(1);
      expect(user2Steps[0].count).toBe(12000);
    });
  });
});
