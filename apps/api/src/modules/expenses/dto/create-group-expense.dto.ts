import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SPLIT_METHODS, type SplitMethod } from '@splitwise/shared-types';

export class CreateGroupExpenseSplitDto {
  @ApiProperty({
    example: '67f4d1f2c2ab5c2c9b4d1001',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  membershipId!: string;

  @ApiPropertyOptional({
    example: 400,
    description:
      'Used for exact / percent / shares split methods. Ignored for equal.',
  })
  @IsOptional()
  @Type(() => Number)
  inputValue?: number;
}

export class CreateGroupExpenseDto {
  @ApiProperty({
    example: 'Dinner',
    minLength: 1,
    maxLength: 200,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({
    example: 'Saturday night dinner',
    maxLength: 2000,
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
  @MaxLength(2000)
  notes?: string | null;

  @ApiProperty({
    example: 2400,
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

  @ApiProperty({
    example: '2026-04-08',
  })
  @IsDateString()
  dateIncurred!: string;

  @ApiProperty({
    example: '67f4d1f2c2ab5c2c9b4d1001',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  payerMembershipId!: string;

  @ApiProperty({
    example: 'equal',
    enum: SPLIT_METHODS,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(SPLIT_METHODS)
  splitMethod!: SplitMethod;

  @ApiProperty({
    type: [CreateGroupExpenseSplitDto],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateGroupExpenseSplitDto)
  splits!: CreateGroupExpenseSplitDto[];
}