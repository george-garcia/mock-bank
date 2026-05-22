import { IsOptional, IsString, IsNumberString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepositDto {
  @ApiProperty({ example: 1 })
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
  instant?: boolean;
}
