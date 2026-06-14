import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({ example: '123456', description: 'The 6-digit verification code' })
  @IsString()
  @Length(4, 10)
  code: string;
}
