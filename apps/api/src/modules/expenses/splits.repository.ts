import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { SplitInputType } from '@splitwise/shared-types';
import type { Model } from 'mongoose';

import { Split, type SplitDocument } from './split.schema';

interface CreateSplitRecord {
  expenseId: string;
  membershipId: string;
  inputType: SplitInputType;
  inputValue?: number | null;
  owedShareMinor: number;
}

@Injectable()
export class SplitsRepository {
  constructor(
    @InjectModel(Split.name)
    private readonly splitModel: Model<SplitDocument>,
  ) {}

  async insertMany(rows: CreateSplitRecord[]): Promise<SplitDocument[]> {
    const docs = rows.map((row) => new this.splitModel(row));
    return Promise.all(docs.map((doc) => doc.save()));
  }

  async findByExpenseId(expenseId: string): Promise<SplitDocument[]> {
    return this.splitModel
      .find({ expenseId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async deleteManyByExpenseId(expenseId: string): Promise<number> {
    const result = await this.splitModel.deleteMany({ expenseId }).exec();
    return result.deletedCount ?? 0;
  }
}