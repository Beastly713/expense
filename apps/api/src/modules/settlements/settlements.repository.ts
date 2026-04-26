import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { SettlementMethod } from '@splitwise/shared-types';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import {
  Settlement,
  type SettlementDocument,
} from './settlement.schema';

interface CreateSettlementRecord {
  groupId: string;
  fromMembershipId: string;
  toMembershipId: string;
  amountMinor: number;
  currency: string;
  method?: SettlementMethod;
  note?: string | null;
  createdByUserId: string;
  settledAt?: Date;
}

export interface SettlementTotalsSummary {
  settlementTotalMinor: number;
  settlementCount: number;
}

@Injectable()
export class SettlementsRepository {
  constructor(
    @InjectModel(Settlement.name)
    private readonly settlementModel: Model<Settlement>,
  ) {}

  async create(data: CreateSettlementRecord): Promise<SettlementDocument> {
    return this.settlementModel.create(data);
  }

  async findById(settlementId: string): Promise<SettlementDocument | null> {
    return this.settlementModel.findById(settlementId).exec();
  }

  async findByGroupId(groupId: string): Promise<SettlementDocument[]> {
    return this.settlementModel
      .find({ groupId })
      .sort({ settledAt: -1, createdAt: -1 })
      .exec();
  }

  async findPageByGroupId(
    groupId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: SettlementDocument[];
    total: number;
  }> {
    const filter = { groupId };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.settlementModel
        .find(filter)
        .sort({ settledAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.settlementModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
    };
  }

  async getTotalsByGroupId(groupId: string): Promise<SettlementTotalsSummary> {
    const groupObjectId = new Types.ObjectId(groupId);

    const [summary] = await this.settlementModel
      .aggregate<{
        settlementTotalMinor: number;
        settlementCount: number;
      }>([
        {
          $match: {
            groupId: groupObjectId,
          },
        },
        {
          $group: {
            _id: null,
            settlementTotalMinor: {
              $sum: '$amountMinor',
            },
            settlementCount: {
              $sum: 1,
            },
          },
        },
      ])
      .exec();

    return {
      settlementTotalMinor: summary?.settlementTotalMinor ?? 0,
      settlementCount: summary?.settlementCount ?? 0,
    };
  }
}