import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { GroupStatus, GroupType } from '@splitwise/shared-types';
import type { Model, UpdateQuery } from 'mongoose';

import { Group, type GroupDocument } from './group.schema';

interface CreateGroupRecord {
  type: GroupType;
  name: string;
  defaultCurrency: string;
  createdByUserId: string;
  simplifyDebts?: boolean;
  status?: GroupStatus;
  lastActivityAt?: Date;
}

@Injectable()
export class GroupsRepository {
  constructor(
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
  ) {}

  async create(data: CreateGroupRecord): Promise<GroupDocument> {
    return this.groupModel.create(data);
  }

  async findById(groupId: string): Promise<GroupDocument | null> {
    return this.groupModel.findById(groupId).exec();
  }

  async findByIds(groupIds: string[]): Promise<GroupDocument[]> {
    return this.groupModel.find({ _id: { $in: groupIds } }).exec();
  }

  async updateById(
    groupId: string,
    update: UpdateQuery<Group>,
  ): Promise<GroupDocument | null> {
    return this.groupModel
      .findByIdAndUpdate(groupId, update, { new: true })
      .exec();
  }
}