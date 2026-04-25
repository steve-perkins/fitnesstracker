import { IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStepDto {
  @ApiProperty({
    description: 'Date of step entry (ISO 8601 format)',
    example: '2026-04-18T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Number of steps',
    example: 8000,
    type: Number,
    minimum: 0,
    maximum: 1000000,
  })
  @IsInt()
  @Min(0)
  @Max(1000000)
  count: number;
}
