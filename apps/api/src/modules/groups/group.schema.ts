import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  GROUP_STATUSES,
  GROUP_TYPES,
  type GroupStatus,
  type GroupType,
} from '@splitwise/shared-types';
import type { HydratedDocument, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

import { baseSchemaOptions } from '../../database/schemas/base.schema';
import { User } from '../users/user.schema';

@Schema(baseSchemaOptions)
export class Group {
  @Prop({
    type: String,
    required: true,
    enum: GROUP_TYPES,
  })
  type!: GroupType;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 3,
  })
  defaultCurrency!: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  createdByUserId!: Types.ObjectId;

  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  simplifyDebts!: boolean;

  @Prop({
    type: String,
    required: true,
    enum: GROUP_STATUSES,
    default: 'active',
  })
  status!: GroupStatus;

  @Prop({
    type: Date,
    required: true,
    default: () => new Date(),
  })
  lastActivityAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type GroupDocument = HydratedDocument<Group>;
export const GroupSchema = SchemaFactory.createForClass(Group);

GroupSchema.index({ createdByUserId: 1 });
GroupSchema.index({ type: 1 });