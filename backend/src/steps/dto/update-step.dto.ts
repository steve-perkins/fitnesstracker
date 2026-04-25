import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStepDto {
  @ApiProperty({
    description: 'Updated step count',
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
