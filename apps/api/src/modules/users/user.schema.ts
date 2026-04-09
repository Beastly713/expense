import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { NotificationPreferences } from '@splitwise/shared-types';
import type { HydratedDocument } from 'mongoose';

import { baseSchemaOptions } from '../../database/schemas/base.schema';

@Schema({
  _id: false,
  id: false,
  versionKey: false,
})
class UserNotificationPreferences implements NotificationPreferences {
  @Prop({ type: Boolean, required: true, default: true })
  emailEnabled!: boolean;

  @Prop({ type: Boolean, required: true, default: true })
  inAppEnabled!: boolean;
}

const UserNotificationPreferencesSchema = SchemaFactory.createForClass(
  UserNotificationPreferences,
);

@Schema(baseSchemaOptions)
export class User {
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 60,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    type: String,
    required: true,
  })
  passwordHash!: string;

  @Prop({
    type: String,
    default: null,
  })
  avatarUrl!: string | null;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 3,
    default: 'INR',
  })
  defaultCurrency!: string;

  @Prop({
    type: UserNotificationPreferencesSchema,
    required: true,
    default: () => ({
      emailEnabled: true,
      inAppEnabled: true,
    }),
  })
  notificationPreferences!: NotificationPreferences;

  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt!: Date | null;

  @Prop({
    type: String,
    default: null,
  })
  refreshTokenHash!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });