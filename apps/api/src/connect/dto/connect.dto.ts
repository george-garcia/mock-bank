import { IsString, IsInt, Min, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLinkSessionDto {
  @ApiPropertyOptional({ example: 'balances,transfers', description: 'Comma-separated requested scopes' })
  @IsOptional()
  @IsString()
  scopes?: string;
}

export class ExchangeTokenDto {
  @ApiProperty({ example: 'public-...' })
  @IsString()
  public_token: string;
}

export class AuthorizeSessionDto {
  @ApiProperty({ example: 1, description: 'The account the customer chose to link' })
  @IsInt()
  @Type(() => Number)
  accountId: number;
}

export class CreateConnectTransferDto {
  @ApiProperty({ example: 2500, description: 'Amount in minor units (cents)' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'debit', enum: ['debit', 'credit'], description: 'debit pulls funds out; credit pushes funds in (cash-out)' })
  @IsIn(['debit', 'credit'])
  direction: 'debit' | 'credit';

  @ApiPropertyOptional({ description: 'Caller-supplied key for safe retries' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
