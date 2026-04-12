import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Group, type GroupDocument } from '../groups/group.schema';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { ActivityRepository } from './activity.repository';
import { ListActivityDto } from './dto/list-activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly membershipsRepository: MembershipsRepository,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
  ) {}

  async getGlobalActivity(currentUserId: string, query: ListActivityDto) {
    const activeMemberships =
      await this.membershipsRepository.findActiveByUserId(currentUserId);

    if (activeMemberships.length === 0) {
      return {
        items: [],
        pagination: {
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          total: 0,
        },
      };
    }

    const groupIds = Array.from(
      new Set(activeMemberships.map((membership) => membership.groupId.toString())),
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [{ items, total }, groups] = await Promise.all([
      this.activityRepository.findPageByGroupIds(groupIds, page, limit),
      this.groupModel.find({ _id: { $in: groupIds } }).exec(),
    ]);

    const groupNameById = new Map(
      groups.map((group) => [group._id.toString(), group.name] as const),
    );

    return {
      items: items.map((activity) => ({
        id: activity._id.toString(),
        groupId: activity.groupId.toString(),
        groupName: groupNameById.get(activity.groupId.toString()) ?? 'Unknown group',
        actionType: activity.actionType,
        entityType: activity.entityType,
        entityId: activity.entityId.toString(),
        actorUserId: activity.actorUserId.toString(),
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }
}   