import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ enum: ['checking', 'savings'], example: 'checking' })
  @IsEnum(['checking', 'savings'])
  type: 'checking' | 'savings';

  @ApiProperty({ required: false, example: 'Main Checking' })
  @IsOptional()
  @IsString()
  label?: string;
}
