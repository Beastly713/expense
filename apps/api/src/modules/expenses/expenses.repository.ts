import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { SplitMethod } from '@splitwise/shared-types';
import type { Model, UpdateQuery } from 'mongoose';

import { Expense, type ExpenseDocument } from './expense.schema';

interface CreateExpenseRecord {
  groupId: string;
  createdByUserId: string;
  title: string;
  notes?: string | null;
  amountMinor: number;
  currency: string;
  dateIncurred: Date;
  payerMembershipId: string;
  splitMethod: SplitMethod;
  participantCount: number;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedByUserId?: string | null;
  version?: number;
}

@Injectable()
export class ExpensesRepository {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<Expense>,
  ) {}

  async create(data: CreateExpenseRecord): Promise<ExpenseDocument> {
    return this.expenseModel.create(data);
  }

  async findById(expenseId: string): Promise<ExpenseDocument | null> {
    return this.expenseModel.findById(expenseId).exec();
  }

  async findByGroupId(
    groupId: string,
    includeDeleted = false,
  ): Promise<ExpenseDocument[]> {
    const filter = includeDeleted ? { groupId } : { groupId, isDeleted: false };

    return this.expenseModel
      .find(filter)
      .sort({ dateIncurred: -1, createdAt: -1 })
      .exec();
  }

  async updateById(
    expenseId: string,
    update: UpdateQuery<Expense>,
  ): Promise<ExpenseDocument | null> {
    return this.expenseModel
      .findByIdAndUpdate(expenseId, update, { returnDocument: 'after' })
      .exec();
  }
}