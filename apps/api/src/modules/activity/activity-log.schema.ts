import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  ACTIVITY_ACTION_TYPES,
  ACTIVITY_ENTITY_TYPES,
  type ActivityActionType,
  type ActivityEntityType,
} from '@splitwise/shared-types';
import type { HydratedDocument, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

import { baseSchemaOptions } from '../../database/schemas/base.schema';

@Schema(baseSchemaOptions)
export class ActivityLog {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Group',
    required: true,
  })
  groupId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  actorUserId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ACTIVITY_ENTITY_TYPES,
  })
  entityType!: ActivityEntityType;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  entityId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ACTIVITY_ACTION_TYPES,
  })
  actionType!: ActivityActionType;

  @Prop({
    type: SchemaTypes.Mixed,
    required: true,
    default: {},
  })
  metadata!: Record<string, unknown>;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ActivityLogDocument = HydratedDocument<ActivityLog>;
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ groupId: 1 });
ActivityLogSchema.index({ groupId: 1, createdAt: -1 });