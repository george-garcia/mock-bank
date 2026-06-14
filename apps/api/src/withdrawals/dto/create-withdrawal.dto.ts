import { IsOptional, IsString, IsNumberString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @ApiProperty({ example: '100.00' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ required: false, example: 'ATM withdrawal' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: '021000021' })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiProperty({ required: false, example: '1234567890' })
  @IsOptional()
  @IsString()
  accountNumber?: string;
}
