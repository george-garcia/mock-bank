import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyLoginDto {
  @ApiProperty({ description: 'The challenge token returned by /auth/login' })
  @IsString()
  challengeToken: string;

  @ApiProperty({ example: '123456', description: 'The verification code' })
  @IsString()
  @Length(4, 10)
  code: string;
}
