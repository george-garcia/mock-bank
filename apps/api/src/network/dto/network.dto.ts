import { IsString, IsInt, Min, IsOptional, ValidateNested, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Card details presented at the point of sale, exactly as a merchant would collect them. */
export class NetworkCardDto {
  @ApiProperty({ example: '4111111111111111' })
  @IsString()
  @Length(12, 19)
  number: string;

  @ApiProperty({ example: '12' })
  @IsString()
  expMonth: string;

  @ApiProperty({ example: '2030' })
  @IsString()
  expYear: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @Length(3, 4)
  cvv: string;
}

export class NetworkMerchantDto {
  @ApiProperty({ example: 'Lucky Spin Casino' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '7995', description: 'Merchant category code' })
  @IsOptional()
  @IsString()
  mcc?: string;

  @ApiPropertyOptional({ example: 'Las Vegas' })
  @IsOptional()
  @IsString()
  city?: string;
}

export class CreateAuthorizationDto {
  @ApiProperty({ type: NetworkCardDto })
  @ValidateNested()
  @Type(() => NetworkCardDto)
  card: NetworkCardDto;

  @ApiProperty({ example: 5000, description: 'Amount in minor units (cents)' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ type: NetworkMerchantDto })
  @ValidateNested()
  @Type(() => NetworkMerchantDto)
  merchant: NetworkMerchantDto;
}

export class CaptureAuthorizationDto {
  @ApiPropertyOptional({ example: 5000, description: 'Amount to capture in cents (defaults to the authorized amount)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;
}

export class CreateRefundDto {
  @ApiProperty({ example: 'net_ab12cd34', description: 'The authorization token to refund against' })
  @IsString()
  authorizationToken: string;

  @ApiProperty({ example: 2000, description: 'Amount to refund in cents' })
  @IsInt()
  @Min(1)
  amount: number;
}
