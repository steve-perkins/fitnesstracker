import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  QueryRunner,
  LessThanOrEqual,
  Between,
} from 'typeorm';
import { ReportEntry } from '../entities/report-entry.entity';
import { Weight } from '../entities/weight.entity';
import { FoodEaten } from '../entities/food-eaten.entity';
import { ExercisePerformed } from '../entities/exercise-performed.entity';
import { Step } from '../entities/step.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ReportEntriesService {
  constructor(
    @InjectRepository(ReportEntry)
    private reportEntryRepository: Repository<ReportEntry>,
    @InjectRepository(Weight)
    private weightRepository: Repository<Weight>,
    @InjectRepository(FoodEaten)
    private foodEatenRepository: Repository<FoodEaten>,
    @InjectRepository(ExercisePerformed)
    private exercisePerformedRepository: Repository<ExercisePerformed>,
    @InjectRepository(Step)
    private stepRepository: Repository<Step>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  private todayInUserTimezone(timezone: string): Date {
    const tz = timezone || 'America/New_York';
    const ymd = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return new Date(ymd + 'T00:00:00.000Z');
  }

  /**
   * Find all report entries for a user, optionally filtered by date range
   * If startDate and endDate are provided, filters to that range
   * If neither provided, returns all report entries for the user
   */
  async findByUserAndDateRange(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReportEntry[]> {
    const whereClause: any = {
      user: { id: userId },
    };

    // Add date range filter only if both dates provided
    if (startDate && endDate) {
      whereClause.date = Between(startDate, endDate);
    }

    return this.reportEntryRepository.find({
      where: whereClause,
      order: { date: 'ASC' },
    });
  }

  /**
   * CRITICAL: Report data calculation algorithm
   * Updates report_entries table synchronously for all dates from startDate to today.
   *
   * This method can be called:
   * 1. Within an existing transaction (via queryRunner parameter)
   * 2. As a standalone operation (creates its own transaction)
   *
   * Reference: ReportDataService.java:298-352
   *
   * @param userId - User ID
   * @param startDate - Start date for recalculation
   * @param queryRunner - Optional QueryRunner from parent transaction
   */
  async updateFromDate(
    userId: string,
    startDate: Date,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    // Determine if we need to create our own transaction or use existing one
    const shouldManageTransaction = !queryRunner;
    const runner = queryRunner || this.dataSource.createQueryRunner();

    if (shouldManageTransaction) {
      await runner.connect();
      await runner.startTransaction();
    }

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const today = this.todayInUserTimezone(user?.timezone ?? '');

      // Normalize startDate to UTC midnight — the entity transformer always
      // produces UTC-midnight dates, so this is defensive against any caller
      // that might pass a non-midnight Date.
      let currentDate = new Date(
        new Date(startDate).toISOString().split('T')[0] + 'T00:00:00.000Z',
      );

      // Loop through each date from startDate to today
      while (currentDate <= today) {
        // 1. Find most recent weight on or before this date
        const weight = await runner.manager.findOne(Weight, {
          where: {
            user: { id: userId },
            date: LessThanOrEqual(currentDate),
          },
          order: { date: 'DESC' },
        });

        if (!weight) {
          // Skip this date if no weight found
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // 2. Sum all food calories for this date
        const foodsEaten = await runner.manager.find(FoodEaten, {
          where: {
            user: { id: userId },
            date: currentDate,
          },
        });

        let netCalories = 0;
        for (const foodEaten of foodsEaten) {
          netCalories += foodEaten.getCalories();
        }

        // 3. Calculate exercise calories burned for this date
        const exercisesPerformed = await runner.manager.find(
          ExercisePerformed,
          {
            where: {
              user: { id: userId },
              date: currentDate,
            },
          },
        );

        for (const exercisePerformed of exercisesPerformed) {
          netCalories -= exercisePerformed.getCaloriesBurned(weight.pounds);
        }

        // 4. Look up step count for this date (0 if no record)
        const step = await runner.manager.findOne(Step, {
          where: {
            user: { id: userId },
            date: currentDate,
          },
        });
        const steps = step?.count ?? 0;

        // 5. Create or update report entry
        let reportEntry = await runner.manager.findOne(ReportEntry, {
          where: {
            user: { id: userId },
            date: currentDate,
          },
        });

        if (!reportEntry) {
          // Create new entry
          reportEntry = runner.manager.create(ReportEntry, {
            user: { id: userId },
            date: new Date(currentDate),
            pounds: weight.pounds,
            netCalories,
            steps,
          });
        } else {
          // Update existing entry
          reportEntry.pounds = weight.pounds;
          reportEntry.netCalories = netCalories;
          reportEntry.steps = steps;
        }

        await runner.manager.save(ReportEntry, reportEntry);

        // Move to next date (24h in ms keeps this in pure UTC, DST-safe)
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }

      // Commit only if we created the transaction
      if (shouldManageTransaction) {
        await runner.commitTransaction();
      }
    } catch (error) {
      // Rollback only if we created the transaction
      if (shouldManageTransaction) {
        await runner.rollbackTransaction();
      }
      throw error;
    } finally {
      // Release only if we created the transaction
      if (shouldManageTransaction) {
        await runner.release();
      }
    }
  }
}
