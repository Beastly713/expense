import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  MembershipRole,
  MembershipStatus,
} from '@splitwise/shared-types';
import type { Model, UpdateQuery } from 'mongoose';

import {
  Membership,
  type MembershipDocument,
} from './membership.schema';

interface CreateMembershipRecord {
  groupId: string;
  userId?: string | null;
  invitationId?: string | null;
  status: MembershipStatus;
  role?: MembershipRole;
  displayNameSnapshot: string;
  emailSnapshot: string;
  joinedAt?: Date | null;
  invitedAt?: Date | null;
  leftAt?: Date | null;
  cachedNetBalanceMinor?: number;
}

@Injectable()
export class MembershipsRepository {
  constructor(
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,
  ) {}

  async create(data: CreateMembershipRecord): Promise<MembershipDocument> {
    return new this.membershipModel({
      ...data,
      emailSnapshot: data.emailSnapshot.trim().toLowerCase(),
    }).save();
  }

  async createMany(
    rows: CreateMembershipRecord[],
  ): Promise<MembershipDocument[]> {
    const docs = rows.map(
      (row) =>
        new this.membershipModel({
          ...row,
          emailSnapshot: row.emailSnapshot.trim().toLowerCase(),
        }),
    );

    return Promise.all(docs.map((doc) => doc.save()));
  }

  async findById(membershipId: string): Promise<MembershipDocument | null> {
    return this.membershipModel.findById(membershipId).exec();
  }

  async findByGroupId(groupId: string): Promise<MembershipDocument[]> {
    return this.membershipModel
      .find({ groupId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async findByGroupIdAndUserId(
    groupId: string,
    userId: string,
  ): Promise<MembershipDocument | null> {
    return this.membershipModel.findOne({ groupId, userId }).exec();
  }

  async findByInvitationId(
    invitationId: string,
  ): Promise<MembershipDocument | null> {
    return this.membershipModel.findOne({ invitationId }).exec();
  }

  async updateById(
    membershipId: string,
    update: UpdateQuery<Membership>,
  ): Promise<MembershipDocument | null> {
    return this.membershipModel
      .findByIdAndUpdate(membershipId, update, { new: true })
      .exec();
  }
}