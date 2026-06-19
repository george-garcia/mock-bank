import { IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateStatementDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @ApiProperty({ example: '2026-05-01', description: 'Inclusive period start (ISO date)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-06-01', description: 'Exclusive period end (ISO date)' })
  @IsDateString()
  periodEnd: string;
}
