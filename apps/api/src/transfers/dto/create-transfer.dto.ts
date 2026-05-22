import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty({ example: 1 })
  fromAccountId: number;

  @ApiProperty({ example: 2 })
  toAccountId: number;

  @ApiProperty({ example: '100.00' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ required: false, example: 'Rent payment' })
  @IsOptional()
  @IsString()
  description?: string;
}
