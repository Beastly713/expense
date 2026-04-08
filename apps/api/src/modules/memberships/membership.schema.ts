import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  type MembershipRole,
  type MembershipStatus,
} from '@splitwise/shared-types';
import type { HydratedDocument, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

import {
  baseSchemaOptions,
  integerValidator,
} from '../../database/schemas/base.schema';
import { Group } from '../groups/group.schema';
import { Invitation } from '../invitations/invitation.schema';
import { User } from '../users/user.schema';

@Schema(baseSchemaOptions)
export class Membership {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Group.name,
    required: true,
  })
  groupId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    default: null,
  })
  userId!: Types.ObjectId | null;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Invitation.name,
    default: null,
  })
  invitationId!: Types.ObjectId | null;

  @Prop({
    type: String,
    required: true,
    enum: MEMBERSHIP_STATUSES,
  })
  status!: MembershipStatus;

  @Prop({
    type: String,
    required: true,
    enum: MEMBERSHIP_ROLES,
    default: 'member',
  })
  role!: MembershipRole;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  })
  displayNameSnapshot!: string;

  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  })
  emailSnapshot!: string;

  @Prop({
    type: Date,
    default: null,
  })
  joinedAt!: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  invitedAt!: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  leftAt!: Date | null;

  @Prop({
    type: Number,
    default: 0,
    validate: integerValidator,
  })
  cachedNetBalanceMinor!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type MembershipDocument = HydratedDocument<Membership>;
export const MembershipSchema = SchemaFactory.createForClass(Membership);

MembershipSchema.index({ groupId: 1 });
MembershipSchema.index({ userId: 1 });
MembershipSchema.index(
  { groupId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      userId: { $type: 'objectId' },
    },
  },
);