import { IsOptional, IsString, IsNumberString, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCardDto {
  @ApiProperty({ example: 1, description: 'Account ID to link the card to' })
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @ApiProperty({ required: false, example: '1000.00' })
  @IsOptional()
  @IsNumberString()
  spendLimit?: string;

  @ApiProperty({ required: false, enum: ['TRANSACTION', 'DAILY', 'MONTHLY', 'ANNUALLY', 'FOREVER'] })
  @IsOptional()
  @IsEnum(['TRANSACTION', 'DAILY', 'MONTHLY', 'ANNUALLY', 'FOREVER'])
  spendLimitPeriod?: string;

  @ApiProperty({ required: false, example: 'My virtual card' })
  @IsOptional()
  @IsString()
  memo?: string;
}
