import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  SETTLEMENT_METHODS,
  type SettlementMethod,
} from '@splitwise/shared-types';
import type { HydratedDocument, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

import {
  baseSchemaOptions,
  integerValidator,
} from '../../database/schemas/base.schema';

@Schema(baseSchemaOptions)
export class Settlement {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Group',
    required: true,
  })
  groupId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Membership',
    required: true,
  })
  fromMembershipId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Membership',
    required: true,
  })
  toMembershipId!: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    validate: integerValidator,
  })
  amountMinor!: number;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 3,
  })
  currency!: string;

  @Prop({
    type: String,
    required: true,
    enum: SETTLEMENT_METHODS,
    default: 'cash',
  })
  method!: SettlementMethod;

  @Prop({
    type: String,
    default: null,
    maxlength: 1000,
  })
  note!: string | null;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  createdByUserId!: Types.ObjectId;

  @Prop({
    type: Date,
    required: true,
    default: () => new Date(),
  })
  settledAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type SettlementDocument = HydratedDocument<Settlement>;
export const SettlementSchema = SchemaFactory.createForClass(Settlement);

SettlementSchema.index({ groupId: 1 });
SettlementSchema.index({ fromMembershipId: 1, toMembershipId: 1 });