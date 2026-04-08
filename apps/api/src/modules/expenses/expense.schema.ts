import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SPLIT_METHODS, type SplitMethod } from '@splitwise/shared-types';
import type { HydratedDocument, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

import {
  baseSchemaOptions,
  integerValidator,
} from '../../database/schemas/base.schema';

@Schema(baseSchemaOptions)
export class Expense {
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
  createdByUserId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200,
  })
  title!: string;

  @Prop({
    type: String,
    default: null,
    maxlength: 2000,
  })
  notes!: string | null;

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
    type: Date,
    required: true,
  })
  dateIncurred!: Date;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Membership',
    required: true,
  })
  payerMembershipId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: SPLIT_METHODS,
  })
  splitMethod!: SplitMethod;

  @Prop({
    type: Number,
    required: true,
    min: 2,
    validate: integerValidator,
  })
  participantCount!: number;

  @Prop({
    type: Boolean,
    required: true,
    default: false,
  })
  isDeleted!: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt!: Date | null;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    default: null,
  })
  deletedByUserId!: Types.ObjectId | null;

  @Prop({
    type: Number,
    required: true,
    default: 1,
    min: 1,
    validate: integerValidator,
  })
  version!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ExpenseDocument = HydratedDocument<Expense>;
export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ groupId: 1 });
ExpenseSchema.index({ payerMembershipId: 1 });
ExpenseSchema.index({ groupId: 1, dateIncurred: -1 });