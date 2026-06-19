import { IsEmail, IsString, MinLength, MaxLength, Matches, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StaffRole } from '@mock-bank/types';

export class CreateStaffDto {
  @ApiProperty({ example: 'staff@bank.internal' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'password must be at least 8 characters and contain a letter and a number' })
  password: string;

  @ApiProperty({ example: 'Sam' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Support' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ enum: ['admin', 'auditor'], example: 'auditor' })
  @IsIn(['admin', 'auditor'])
  role: StaffRole;
}
