import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GROUP_TYPES, type GroupType } from '@splitwise/shared-types';

const GROUP_LIST_TYPES = [...GROUP_TYPES, 'all'] as const;

export type ListGroupsType = GroupType | 'all';

export class ListGroupsDto {
  @ApiPropertyOptional({
    example: 'all',
    enum: GROUP_LIST_TYPES,
    default: 'all',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsIn(GROUP_LIST_TYPES)
  type?: ListGroupsType;
}