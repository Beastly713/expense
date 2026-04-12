import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  ActivityActionType,
  ActivityEntityType,
} from '@splitwise/shared-types';
import type { Model } from 'mongoose';
import {
  ActivityLog,
  type ActivityLogDocument,
} from './activity-log.schema';

interface CreateActivityLogRecord {
  groupId: string;
  actorUserId: string;
  entityType: ActivityEntityType;
  entityId: string;
  actionType: ActivityActionType;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityRepository {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  async create(
    data: CreateActivityLogRecord,
  ): Promise<ActivityLogDocument> {
    return this.activityLogModel.create({
      ...data,
      metadata: data.metadata ?? {},
    });
  }

  async findByGroupId(
    groupId: string,
    limit = 20,
  ): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({ groupId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findPageByGroupId(
    groupId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: ActivityLogDocument[];
    total: number;
  }> {
    const filter = { groupId };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.activityLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityLogModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
    };
  }

  async findPageByGroupIds(
    groupIds: string[],
    page: number,
    limit: number,
  ): Promise<{
    items: ActivityLogDocument[];
    total: number;
  }> {
    if (groupIds.length === 0) {
      return {
        items: [],
        total: 0,
      };
    }

    const filter = {
      groupId: {
        $in: groupIds,
      },
    };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.activityLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityLogModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
    };
  }
}