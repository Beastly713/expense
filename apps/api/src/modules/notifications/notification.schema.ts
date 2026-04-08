import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
  type NotificationEntityType,
  type NotificationType,
} from '@splitwise/shared-types';
import type { HydratedDocument, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

import { baseSchemaOptions } from '../../database/schemas/base.schema';

@Schema({
  _id: false,
  id: false,
  versionKey: false,
})
class NotificationDeliveryChannels {
  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  inApp!: boolean;

  @Prop({
    type: Boolean,
    required: true,
    default: false,
  })
  email!: boolean;
}

const NotificationDeliveryChannelsSchema = SchemaFactory.createForClass(
  NotificationDeliveryChannels,
);

@Schema(baseSchemaOptions)
export class Notification {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Group',
    default: null,
  })
  groupId!: Types.ObjectId | null;

  @Prop({
    type: String,
    required: true,
    enum: NOTIFICATION_TYPES,
  })
  type!: NotificationType;

  @Prop({
    type: String,
    required: true,
    enum: NOTIFICATION_ENTITY_TYPES,
  })
  entityType!: NotificationEntityType;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  entityId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  })
  title!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  })
  body!: string;

  @Prop({
    type: Boolean,
    required: true,
    default: false,
  })
  isRead!: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  readAt!: Date | null;

  @Prop({
    type: NotificationDeliveryChannelsSchema,
    required: true,
    default: () => ({
      inApp: true,
      email: false,
    }),
  })
  deliveryChannels!: NotificationDeliveryChannels;

  @Prop({
    type: String,
    default: null,
    trim: true,
    maxlength: 50,
  })
  emailStatus!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ userId: 1, isRead: 1 });