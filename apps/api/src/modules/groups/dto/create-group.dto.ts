import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GROUP_TYPES, type GroupType } from '@splitwise/shared-types';

export class CreateGroupDto {
  @ApiProperty({
    example: 'Goa Trip',
    minLength: 2,
    maxLength: 80,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

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
  defaultCurrency!: string;

  @ApiPropertyOptional({
    example: 'group',
    enum: GROUP_TYPES,
    default: 'group',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(GROUP_TYPES)
  type: GroupType = 'group';
}