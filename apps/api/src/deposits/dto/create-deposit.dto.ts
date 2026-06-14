import { IsOptional, IsString, IsNumberString, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';

export class CreateDepositDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @ApiProperty({ example: '1000.00' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ required: false, example: 'Paycheck' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Instant credit (skips pending state)' })
  @IsOptional()
  @IsBoolean()
  instant?: boolean;
}
