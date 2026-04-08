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
    private readonly activityLogModel: Model<ActivityLog>,
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
}