import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Step } from '../entities/step.entity';
import { ReportEntriesService } from '../report-entries/report-entries.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';

@Injectable()
export class StepsService {
  constructor(
    @InjectRepository(Step)
    private stepRepository: Repository<Step>,
    private reportEntriesService: ReportEntriesService,
  ) {}

  async findAllByUser(userId: string): Promise<Step[]> {
    return this.stepRepository.find({
      where: { user: { id: userId } },
      order: { date: 'DESC' },
    });
  }

  async findByUserAndDate(userId: string, date: Date): Promise<Step | null> {
    return this.stepRepository.findOne({
      where: { user: { id: userId }, date },
    });
  }

  async findOnDate(userId: string, date: Date): Promise<Step | null> {
    return this.stepRepository.findOne({
      where: { user: { id: userId }, date },
    });
  }

  async create(userId: string, createStepDto: CreateStepDto): Promise<Step> {
    const dateStr = createStepDto.date.split('T')[0];
    const date = new Date(dateStr + 'T00:00:00.000Z');

    const existing = await this.findByUserAndDate(userId, date);
    if (existing) {
      throw new ConflictException(
        `Step entry already exists for date ${createStepDto.date}`,
      );
    }

    const step = this.stepRepository.create({
      user: { id: userId },
      date,
      count: createStepDto.count,
    });

    const saved = await this.stepRepository.save(step);
    await this.reportEntriesService.updateFromDate(userId, date);
    return saved;
  }

  async update(
    id: string,
    userId: string,
    updateStepDto: UpdateStepDto,
  ): Promise<Step> {
    const step = await this.stepRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!step) {
      throw new NotFoundException(`Step entry with ID ${id} not found`);
    }

    step.count = updateStepDto.count;
    const saved = await this.stepRepository.save(step);
    await this.reportEntriesService.updateFromDate(userId, step.date);
    return saved;
  }

  async delete(id: string, userId: string): Promise<void> {
    const step = await this.stepRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!step) {
      throw new NotFoundException(`Step entry with ID ${id} not found`);
    }

    const date = step.date;
    await this.stepRepository.remove(step);
    await this.reportEntriesService.updateFromDate(userId, date);
  }
}
