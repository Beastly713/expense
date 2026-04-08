import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

import { AppModule } from '../../app.module';
import { ActivityRepository } from '../../modules/activity/activity.repository';
import { ExpensesRepository } from '../../modules/expenses/expenses.repository';
import { SplitsRepository } from '../../modules/expenses/splits.repository';
import { GroupsRepository } from '../../modules/groups/groups.repository';
import { InvitationsRepository } from '../../modules/invitations/invitations.repository';
import { MembershipsRepository } from '../../modules/memberships/memberships.repository';
import { NotificationsRepository } from '../../modules/notifications/notifications.repository';
import { SettlementsRepository } from '../../modules/settlements/settlements.repository';
import { UsersRepository } from '../../modules/users/users.repository';

async function run(): Promise<void> {
  const logger = new Logger('Phase2Seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());

    const usersRepository = app.get(UsersRepository);
    const groupsRepository = app.get(GroupsRepository);
    const invitationsRepository = app.get(InvitationsRepository);
    const membershipsRepository = app.get(MembershipsRepository);
    const expensesRepository = app.get(ExpensesRepository);
    const splitsRepository = app.get(SplitsRepository);
    const settlementsRepository = app.get(SettlementsRepository);
    const notificationsRepository = app.get(NotificationsRepository);
    const activityRepository = app.get(ActivityRepository);

    await connection.dropDatabase();
    logger.log('Dropped existing database contents.');

    const rahul = await usersRepository.create({
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      passwordHash: 'seeded_hash_rahul',
      defaultCurrency: 'INR',
      notificationPreferences: {
        emailEnabled: true,
        inAppEnabled: true,
      },
    });

    const aisha = await usersRepository.create({
      name: 'Aisha Khan',
      email: 'aisha@example.com',
      passwordHash: 'seeded_hash_aisha',
      defaultCurrency: 'INR',
      notificationPreferences: {
        emailEnabled: true,
        inAppEnabled: true,
      },
    });

    const goaTripGroup = await groupsRepository.create({
      type: 'group',
      name: 'Goa Trip',
      defaultCurrency: 'INR',
      createdByUserId: rahul._id.toString(),
      simplifyDebts: true,
      status: 'active',
      lastActivityAt: new Date('2026-04-08T12:00:00.000Z'),
    });

    const rahulMembership = await membershipsRepository.create({
      groupId: goaTripGroup._id.toString(),
      userId: rahul._id.toString(),
      status: 'active',
      role: 'member',
      displayNameSnapshot: 'Rahul Sharma',
      emailSnapshot: 'rahul@example.com',
      joinedAt: new Date('2026-04-08T09:00:00.000Z'),
      invitedAt: null,
      leftAt: null,
      cachedNetBalanceMinor: 1000,
    });

    const aishaMembership = await membershipsRepository.create({
      groupId: goaTripGroup._id.toString(),
      userId: aisha._id.toString(),
      status: 'active',
      role: 'member',
      displayNameSnapshot: 'Aisha Khan',
      emailSnapshot: 'aisha@example.com',
      joinedAt: new Date('2026-04-08T09:05:00.000Z'),
      invitedAt: null,
      leftAt: null,
      cachedNetBalanceMinor: -600,
    });

    const pendingInvitation = await invitationsRepository.create({
      groupId: goaTripGroup._id.toString(),
      email: 'sameer@example.com',
      invitedByUserId: rahul._id.toString(),
      token: 'seed-invite-token-sameer',
      status: 'pending',
      membershipId: null,
      acceptedAt: null,
      expiresAt: new Date('2026-04-15T00:00:00.000Z'),
    });

    const sameerPendingMembership = await membershipsRepository.create({
      groupId: goaTripGroup._id.toString(),
      userId: null,
      invitationId: pendingInvitation._id.toString(),
      status: 'pending',
      role: 'member',
      displayNameSnapshot: 'sameer@example.com',
      emailSnapshot: 'sameer@example.com',
      joinedAt: null,
      invitedAt: new Date('2026-04-08T09:10:00.000Z'),
      leftAt: null,
      cachedNetBalanceMinor: -400,
    });

    await invitationsRepository.updateById(pendingInvitation._id.toString(), {
      $set: {
        membershipId: sameerPendingMembership._id,
      },
    });

    const dinnerExpense = await expensesRepository.create({
      groupId: goaTripGroup._id.toString(),
      createdByUserId: rahul._id.toString(),
      title: 'Dinner',
      notes: 'Saturday night dinner',
      amountMinor: 1200,
      currency: 'INR',
      dateIncurred: new Date('2026-04-08T20:00:00.000Z'),
      payerMembershipId: rahulMembership._id.toString(),
      splitMethod: 'equal',
      participantCount: 3,
      isDeleted: false,
      deletedAt: null,
      deletedByUserId: null,
      version: 1,
    });

    await splitsRepository.insertMany([
      {
        expenseId: dinnerExpense._id.toString(),
        membershipId: rahulMembership._id.toString(),
        inputType: 'equal',
        inputValue: null,
        owedShareMinor: 400,
      },
      {
        expenseId: dinnerExpense._id.toString(),
        membershipId: aishaMembership._id.toString(),
        inputType: 'equal',
        inputValue: null,
        owedShareMinor: 400,
      },
      {
        expenseId: dinnerExpense._id.toString(),
        membershipId: sameerPendingMembership._id.toString(),
        inputType: 'equal',
        inputValue: null,
        owedShareMinor: 400,
      },
    ]);

    const partialSettlement = await settlementsRepository.create({
      groupId: goaTripGroup._id.toString(),
      fromMembershipId: aishaMembership._id.toString(),
      toMembershipId: rahulMembership._id.toString(),
      amountMinor: 200,
      currency: 'INR',
      method: 'cash',
      note: 'Paid cash after dinner',
      createdByUserId: aisha._id.toString(),
      settledAt: new Date('2026-04-08T21:00:00.000Z'),
    });

    const directGroup = await groupsRepository.create({
      type: 'direct',
      name: 'Rahul & Aisha',
      defaultCurrency: 'INR',
      createdByUserId: rahul._id.toString(),
      simplifyDebts: true,
      status: 'active',
      lastActivityAt: new Date('2026-04-08T10:00:00.000Z'),
    });

    await membershipsRepository.createMany([
      {
        groupId: directGroup._id.toString(),
        userId: rahul._id.toString(),
        status: 'active',
        role: 'member',
        displayNameSnapshot: 'Rahul Sharma',
        emailSnapshot: 'rahul@example.com',
        joinedAt: new Date('2026-04-08T10:00:00.000Z'),
        invitedAt: null,
        leftAt: null,
        cachedNetBalanceMinor: 0,
      },
      {
        groupId: directGroup._id.toString(),
        userId: aisha._id.toString(),
        status: 'active',
        role: 'member',
        displayNameSnapshot: 'Aisha Khan',
        emailSnapshot: 'aisha@example.com',
        joinedAt: new Date('2026-04-08T10:00:00.000Z'),
        invitedAt: null,
        leftAt: null,
        cachedNetBalanceMinor: 0,
      },
    ]);

    await notificationsRepository.createMany([
      {
        userId: aisha._id.toString(),
        groupId: goaTripGroup._id.toString(),
        type: 'expense_added',
        entityType: 'expense',
        entityId: dinnerExpense._id.toString(),
        title: 'New expense in Goa Trip',
        body: 'Rahul added Dinner',
        isRead: false,
        readAt: null,
        deliveryChannels: {
          inApp: true,
          email: false,
        },
        emailStatus: null,
      },
      {
        userId: rahul._id.toString(),
        groupId: goaTripGroup._id.toString(),
        type: 'settlement_recorded',
        entityType: 'settlement',
        entityId: partialSettlement._id.toString(),
        title: 'Settlement recorded',
        body: 'Aisha recorded a cash settlement',
        isRead: false,
        readAt: null,
        deliveryChannels: {
          inApp: true,
          email: false,
        },
        emailStatus: null,
      },
    ]);

    await activityRepository.create({
      groupId: goaTripGroup._id.toString(),
      actorUserId: rahul._id.toString(),
      entityType: 'invitation',
      entityId: pendingInvitation._id.toString(),
      actionType: 'member_invited',
      metadata: {
        email: 'sameer@example.com',
      },
    });

    await activityRepository.create({
      groupId: goaTripGroup._id.toString(),
      actorUserId: rahul._id.toString(),
      entityType: 'expense',
      entityId: dinnerExpense._id.toString(),
      actionType: 'expense_added',
      metadata: {
        title: 'Dinner',
        amountMinor: 1200,
        payerMembershipId: rahulMembership._id.toString(),
        splitMethod: 'equal',
      },
    });

    await activityRepository.create({
      groupId: goaTripGroup._id.toString(),
      actorUserId: aisha._id.toString(),
      entityType: 'settlement',
      entityId: partialSettlement._id.toString(),
      actionType: 'settlement_recorded',
      metadata: {
        amountMinor: 200,
        fromMembershipId: aishaMembership._id.toString(),
        toMembershipId: rahulMembership._id.toString(),
      },
    });

    logger.log('Phase 2 seed completed successfully.');
  } finally {
    await app.close();
  }
}

void run();