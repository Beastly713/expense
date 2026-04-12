import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SETTLEMENT_METHODS,
  type SettlementMethod,
} from '@splitwise/shared-types';

export class CreateGroupSettlementDto {
  @ApiProperty({
    example: '67f4d1f2c2ab5c2c9b4d1002',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  fromMembershipId!: string;

  @ApiProperty({
    example: '67f4d1f2c2ab5c2c9b4d1001',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  toMembershipId!: string;

  @ApiProperty({
    example: 200,
    description: 'Money in minor units only.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @ApiProperty({
    example: 'INR',
    minLength: 3,
    maxLength: 3,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ApiPropertyOptional({
    example: 'cash',
    enum: SETTLEMENT_METHODS,
    default: 'cash',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsIn(SETTLEMENT_METHODS)
  method: SettlementMethod = 'cash';

  @ApiPropertyOptional({
    example: 'Paid in cash after dinner',
    maxLength: 1000,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}