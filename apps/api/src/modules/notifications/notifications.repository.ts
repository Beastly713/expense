import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  NotificationEntityType,
  NotificationType,
} from '@splitwise/shared-types';
import type { Model, UpdateQuery } from 'mongoose';

import {
  Notification,
  type NotificationDocument,
} from './notification.schema';

interface CreateNotificationRecord {
  userId: string;
  groupId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  title: string;
  body: string;
  isRead?: boolean;
  readAt?: Date | null;
  deliveryChannels?: {
    inApp: boolean;
    email: boolean;
  };
  emailStatus?: string | null;
}

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(
    data: CreateNotificationRecord,
  ): Promise<NotificationDocument> {
    return new this.notificationModel(data).save();
  }

  async createMany(
    rows: CreateNotificationRecord[],
  ): Promise<NotificationDocument[]> {
    const docs = rows.map((row) => new this.notificationModel(row));
    return Promise.all(docs.map((doc) => doc.save()));
  }

  async findByUserId(
    userId: string,
    unreadOnly = false,
  ): Promise<NotificationDocument[]> {
    const filter = unreadOnly ? { userId, isRead: false } : { userId };

    return this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateById(
    notificationId: string,
    update: UpdateQuery<Notification>,
  ): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findByIdAndUpdate(notificationId, update, { returnDocument: 'after' })
      .exec();
  }
}