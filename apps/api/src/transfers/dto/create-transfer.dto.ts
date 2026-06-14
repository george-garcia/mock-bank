import { IsOptional, IsString, IsNumberString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  fromAccountId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Type(() => Number)
  toAccountId: number;

  @ApiProperty({ example: '100.00' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ required: false, example: 'Rent payment' })
  @IsOptional()
  @IsString()
  description?: string;
}
