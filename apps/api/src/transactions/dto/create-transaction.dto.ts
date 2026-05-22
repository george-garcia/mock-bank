import { IsEnum, IsNumberString, IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  accountId: number;

  @ApiProperty({ enum: ['deposit', 'withdrawal', 'transfer'], example: 'deposit' })
  @IsEnum(['deposit', 'withdrawal', 'transfer', 'card_auth', 'card_settlement', 'card_void'])
  type: string;

  @ApiProperty({ example: '100.00' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ required: false, example: 'Paycheck deposit' })
  @IsOptional()
  @IsString()
  description?: string;
}
