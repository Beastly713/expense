import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupInvitesDto {
  @ApiProperty({
    example: ['aayush@example.com', 'riya@example.com'],
    type: [String],
  })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) {
      return value;
    }

    return value.map((email) =>
      typeof email === 'string' ? email.trim().toLowerCase() : email,
    );
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEmail({}, { each: true })
  emails!: string[];
}