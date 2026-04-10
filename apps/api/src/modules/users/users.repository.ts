import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { NotificationPreferences } from '@splitwise/shared-types';
import type { Model, UpdateQuery } from 'mongoose';

import { User, type UserDocument } from './user.schema';

interface CreateUserRecord {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
  defaultCurrency?: string;
  notificationPreferences?: NotificationPreferences;
  lastLoginAt?: Date | null;
  refreshTokenHash?: string | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async create(data: CreateUserRecord): Promise<UserDocument> {
    return this.userModel.create({
      ...data,
      email: data.email.trim().toLowerCase(),
    });
  }

  async findById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      email: email.trim().toLowerCase(),
    }).exec();
  }

  async findByPasswordResetTokenHash(
    passwordResetTokenHash: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ passwordResetTokenHash }).exec();
  }

  async updateById(
    userId: string,
    update: UpdateQuery<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .exec();
  }
}