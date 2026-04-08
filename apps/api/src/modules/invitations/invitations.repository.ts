import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { InvitationStatus } from '@splitwise/shared-types';
import type { Model, UpdateQuery } from 'mongoose';

import {
  Invitation,
  type InvitationDocument,
} from './invitation.schema';

interface CreateInvitationRecord {
  groupId: string;
  email: string;
  invitedByUserId: string;
  token: string;
  status?: InvitationStatus;
  membershipId?: string | null;
  acceptedAt?: Date | null;
  expiresAt?: Date | null;
}

@Injectable()
export class InvitationsRepository {
  constructor(
    @InjectModel(Invitation.name)
    private readonly invitationModel: Model<Invitation>,
  ) {}

  async create(data: CreateInvitationRecord): Promise<InvitationDocument> {
    return this.invitationModel.create({
      ...data,
      email: data.email.trim().toLowerCase(),
    });
  }

  async findById(invitationId: string): Promise<InvitationDocument | null> {
    return this.invitationModel.findById(invitationId).exec();
  }

  async findByToken(token: string): Promise<InvitationDocument | null> {
    return this.invitationModel.findOne({ token }).exec();
  }

  async findByGroupId(groupId: string): Promise<InvitationDocument[]> {
    return this.invitationModel
      .find({ groupId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateById(
    invitationId: string,
    update: UpdateQuery<Invitation>,
  ): Promise<InvitationDocument | null> {
    return this.invitationModel
      .findByIdAndUpdate(invitationId, update, { new: true })
      .exec();
  }
}