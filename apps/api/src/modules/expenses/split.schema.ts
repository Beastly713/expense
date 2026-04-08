import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  SPLIT_INPUT_TYPES,
  type SplitInputType,
} from '@splitwise/shared-types';
import type { HydratedDocument, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

import {
  baseSchemaOptions,
  integerValidator,
} from '../../database/schemas/base.schema';

@Schema(baseSchemaOptions)
export class Split {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Expense',
    required: true,
  })
  expenseId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Membership',
    required: true,
  })
  membershipId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: SPLIT_INPUT_TYPES,
  })
  inputType!: SplitInputType;

  @Prop({
    type: Number,
    default: null,
  })
  inputValue!: number | null;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    validate: integerValidator,
  })
  owedShareMinor!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type SplitDocument = HydratedDocument<Split>;
export const SplitSchema = SchemaFactory.createForClass(Split);

SplitSchema.index({ expenseId: 1 });
SplitSchema.index({ membershipId: 1 });