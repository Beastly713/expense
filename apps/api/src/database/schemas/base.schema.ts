import type { SchemaOptions } from 'mongoose';

export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
};

export const integerValidator = {
  validator: Number.isInteger,
  message: '{PATH} must be an integer.',
};