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

interface FindExpensePageParams {
  groupId: string;
  page: number;
  limit: number;
  search?: string;
  includeDeleted?: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  async findPageByGroupId(
    params: FindExpensePageParams,
  ): Promise<{
    items: ExpenseDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {
      groupId: params.groupId,
    };

    if (!params.includeDeleted) {
      filter.isDeleted = false;
    }

    const normalizedSearch = params.search?.trim();

    if (normalizedSearch) {
      const pattern = escapeRegex(normalizedSearch);

      filter.$or = [
        {
          title: {
            $regex: pattern,
            $options: 'i',
          },
        },
        {
          notes: {
            $regex: pattern,
            $options: 'i',
          },
        },
      ];
    }

    const skip = (params.page - 1) * params.limit;

    const [items, total] = await Promise.all([
      this.expenseModel
        .find(filter)
        .sort({ dateIncurred: -1, createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .exec(),
      this.expenseModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
    };
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