import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  INVITATION_STATUSES,
  type InvitationStatus,
} from '@splitwise/shared-types';
import type { HydratedDocument, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

import { baseSchemaOptions } from '../../database/schemas/base.schema';
import { Group } from '../groups/group.schema';
import { User } from '../users/user.schema';

@Schema(baseSchemaOptions)
export class Invitation {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Group.name,
    required: true,
  })
  groupId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  invitedByUserId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  token!: string;

  @Prop({
    type: String,
    required: true,
    enum: INVITATION_STATUSES,
    default: 'pending',
  })
  status!: InvitationStatus;

  @Prop({
  type: SchemaTypes.ObjectId,
  ref: 'Membership',
  default: null,
})
membershipId!: Types.ObjectId | null;

  @Prop({
    type: Date,
    default: null,
  })
  acceptedAt!: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  expiresAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type InvitationDocument = HydratedDocument<Invitation>;
export const InvitationSchema = SchemaFactory.createForClass(Invitation);

InvitationSchema.index({ token: 1 }, { unique: true });
InvitationSchema.index({ email: 1 });
InvitationSchema.index({ groupId: 1 });