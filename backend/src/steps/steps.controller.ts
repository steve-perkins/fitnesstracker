import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { StepsService } from './steps.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';

@ApiTags('steps')
@ApiBearerAuth('JWT-auth')
@Controller('steps')
@UseGuards(JwtAuthGuard)
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @ApiOperation({ summary: 'Get all step entries for user' })
  @ApiResponse({
    status: 200,
    description: 'Array of step entries sorted by date DESC',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing JWT token' })
  @Get()
  async findAll(@CurrentUser() user: User) {
    const steps = await this.stepsService.findAllByUser(user.id);
    return steps.map((step) => ({
      id: step.id,
      date: step.date,
      count: step.count,
    }));
  }

  @ApiOperation({ summary: 'Get step entry for specific date' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date to query (ISO 8601 format)',
    type: String,
    example: '2026-04-18T00:00:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Step entry for the date or null if none exists',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing JWT token' })
  @Get('on-date')
  async findOnDate(
    @CurrentUser() user: User,
    @Query('date') dateString: string,
  ) {
    const dateStr = dateString.split('T')[0];
    const date = new Date(dateStr + 'T00:00:00.000Z');
    const step = await this.stepsService.findOnDate(user.id, date);

    if (!step) {
      return null;
    }

    return {
      id: step.id,
      date: step.date,
      count: step.count,
    };
  }

  @ApiOperation({ summary: 'Create new step entry' })
  @ApiResponse({ status: 201, description: 'Step entry created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Invalid or missing JWT token' })
  @ApiResponse({
    status: 409,
    description: 'Step entry already exists for this date',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: User,
    @Body() createStepDto: CreateStepDto,
  ) {
    const step = await this.stepsService.create(user.id, createStepDto);
    return {
      id: step.id,
      date: step.date,
      count: step.count,
    };
  }

  @ApiOperation({ summary: 'Update step entry' })
  @ApiParam({
    name: 'id',
    description: 'Step entry UUID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Step entry updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Step entry not found' })
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() updateStepDto: UpdateStepDto,
  ) {
    const step = await this.stepsService.update(id, user.id, updateStepDto);
    return {
      id: step.id,
      date: step.date,
      count: step.count,
    };
  }

  @ApiOperation({ summary: 'Delete step entry' })
  @ApiParam({
    name: 'id',
    description: 'Step entry UUID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Step entry deleted successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Step entry not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.stepsService.delete(id, user.id);
    return { message: 'Step deleted successfully' };
  }
}
