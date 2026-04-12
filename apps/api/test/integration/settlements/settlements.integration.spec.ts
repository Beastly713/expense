/// <reference types="jest" />
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityRepository } from '../../../src/modules/activity/activity.repository';
import { InvitationsRepository } from '../../../src/modules/invitations/invitations.repository';
import { MembershipsRepository } from '../../../src/modules/memberships/memberships.repository';
import { NotificationsRepository } from '../../../src/modules/notifications/notifications.repository';
import { SettlementsRepository } from '../../../src/modules/settlements/settlements.repository';
import {
  clearDatabase,
  closeTestApp,
  createTestApp,
  type TestAppContext,
} from '../setup/test-app';
import {
  signupUser,
  uniqueEmail,
  type AuthenticatedUserFixture,
} from '../setup/test-helpers';

describe('Settlements integration', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let invitationsRepository: InvitationsRepository;
  let membershipsRepository: MembershipsRepository;
  let settlementsRepository: SettlementsRepository;
  let activityRepository: ActivityRepository;
  let notificationsRepository: NotificationsRepository;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    invitationsRepository = app.get(InvitationsRepository);
    membershipsRepository = app.get(MembershipsRepository);
    settlementsRepository = app.get(SettlementsRepository);
    activityRepository = app.get(ActivityRepository);
    notificationsRepository = app.get(NotificationsRepository);
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('records a partial settlement, updates balances, logs activity, and creates notifications', async () => {
    const creator = await createUser('Rahul Sharma', 'settlement-creator');
    const invitee = await createUser('Aisha Khan', 'settlement-invitee');
    const groupId = await createGroup(creator, 'Settlement Group');

    await inviteAndAcceptMember(groupId, creator, invitee);

    const creatorMembership = await findMembershipByUserId(
      groupId,
      creator.userId,
    );
    const inviteeMembership = await findMembershipByUserId(
      groupId,
      invitee.userId,
    );

    expect(creatorMembership).not.toBeNull();
    expect(inviteeMembership).not.toBeNull();

    await createEqualExpense(
      groupId,
      creator,
      creatorMembership!.membershipId,
      inviteeMembership!.membershipId,
    );

    const createResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/settlements`)
      .set('Authorization', `Bearer ${invitee.accessToken}`)
      .send({
        fromMembershipId: inviteeMembership!.membershipId,
        toMembershipId: creatorMembership!.membershipId,
        amountMinor: 200,
        currency: 'INR',
        method: 'cash',
        note: 'Paid in cash',
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.settlement.amountMinor).toBe(200);
    expect(createResponse.body.data.settlement.method).toBe('cash');

    const balancesResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupId}/balances`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(balancesResponse.body.data.simplifiedBalances).toEqual([
      {
        fromMembershipId: inviteeMembership!.membershipId,
        toMembershipId: creatorMembership!.membershipId,
        amountMinor: 300,
      },
    ]);

    const historyResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupId}/settlements?page=1&limit=20`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(historyResponse.body.success).toBe(true);
    expect(historyResponse.body.data.items).toHaveLength(1);
    expect(historyResponse.body.data.items[0].amountMinor).toBe(200);

    const activities = await activityRepository.findByGroupId(groupId, 20);
    const settlementActivity = activities.find(
      (item) => item.actionType === 'settlement_recorded',
    );

    expect(settlementActivity).toBeDefined();
    expect(settlementActivity?.metadata).toMatchObject({
      amountMinor: 200,
      fromMembershipId: inviteeMembership!.membershipId,
      toMembershipId: creatorMembership!.membershipId,
    });

    const creatorNotifications = await notificationsRepository.findByUserId(
      creator.userId,
    );
    const settlementNotification = creatorNotifications.find(
      (item) =>
        item.type === 'settlement_recorded' &&
        item.entityId.toString() === createResponse.body.data.settlement.id,
    );

    expect(settlementNotification).toBeDefined();
  });

  it('records a full settlement and clears the current debt relation', async () => {
    const creator = await createUser('Rahul Sharma', 'full-creator');
    const invitee = await createUser('Aisha Khan', 'full-invitee');
    const groupId = await createGroup(creator, 'Full Settlement Group');

    await inviteAndAcceptMember(groupId, creator, invitee);

    const creatorMembership = await findMembershipByUserId(
      groupId,
      creator.userId,
    );
    const inviteeMembership = await findMembershipByUserId(
      groupId,
      invitee.userId,
    );

    expect(creatorMembership).not.toBeNull();
    expect(inviteeMembership).not.toBeNull();

    await createEqualExpense(
      groupId,
      creator,
      creatorMembership!.membershipId,
      inviteeMembership!.membershipId,
    );

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/settlements`)
      .set('Authorization', `Bearer ${invitee.accessToken}`)
      .send({
        fromMembershipId: inviteeMembership!.membershipId,
        toMembershipId: creatorMembership!.membershipId,
        amountMinor: 500,
        currency: 'INR',
        method: 'cash',
      })
      .expect(201);

    const balancesResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupId}/balances`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(balancesResponse.body.data.simplifiedBalances).toEqual([]);
  });

  it('rejects settlement overpayment beyond the current owed amount', async () => {
    const creator = await createUser('Rahul Sharma', 'overpay-creator');
    const invitee = await createUser('Aisha Khan', 'overpay-invitee');
    const groupId = await createGroup(creator, 'Overpay Group');

    await inviteAndAcceptMember(groupId, creator, invitee);

    const creatorMembership = await findMembershipByUserId(
      groupId,
      creator.userId,
    );
    const inviteeMembership = await findMembershipByUserId(
      groupId,
      invitee.userId,
    );

    expect(creatorMembership).not.toBeNull();
    expect(inviteeMembership).not.toBeNull();

    await createEqualExpense(
      groupId,
      creator,
      creatorMembership!.membershipId,
      inviteeMembership!.membershipId,
    );

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/settlements`)
      .set('Authorization', `Bearer ${invitee.accessToken}`)
      .send({
        fromMembershipId: inviteeMembership!.membershipId,
        toMembershipId: creatorMembership!.membershipId,
        amountMinor: 600,
        currency: 'INR',
        method: 'cash',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_SETTLEMENT_AMOUNT');

    const settlements = await settlementsRepository.findByGroupId(groupId);
    expect(settlements).toHaveLength(0);
  });

  it('rejects settlement when there is no current debt relation in that direction', async () => {
    const creator = await createUser('Rahul Sharma', 'direction-creator');
    const invitee = await createUser('Aisha Khan', 'direction-invitee');
    const groupId = await createGroup(creator, 'Direction Group');

    await inviteAndAcceptMember(groupId, creator, invitee);

    const creatorMembership = await findMembershipByUserId(
      groupId,
      creator.userId,
    );
    const inviteeMembership = await findMembershipByUserId(
      groupId,
      invitee.userId,
    );

    expect(creatorMembership).not.toBeNull();
    expect(inviteeMembership).not.toBeNull();

    await createEqualExpense(
      groupId,
      creator,
      creatorMembership!.membershipId,
      inviteeMembership!.membershipId,
    );

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/settlements`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        fromMembershipId: creatorMembership!.membershipId,
        toMembershipId: inviteeMembership!.membershipId,
        amountMinor: 100,
        currency: 'INR',
        method: 'cash',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_SETTLEMENT_AMOUNT');
  });

  async function createUser(
    name: string,
    prefix: string,
  ): Promise<AuthenticatedUserFixture> {
    return signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name,
        email: uniqueEmail(prefix),
        password: 'StrongPass123',
      },
    });
  }

  async function createGroup(
    user: AuthenticatedUserFixture,
    name: string,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name,
        defaultCurrency: 'INR',
        type: 'group',
      })
      .expect(201);

    return response.body.data.group.id as string;
  }

  async function inviteAndAcceptMember(
    groupId: string,
    inviter: AuthenticatedUserFixture,
    invitee: AuthenticatedUserFixture,
  ): Promise<void> {
    const inviteResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${inviter.accessToken}`)
      .send({
        emails: [invitee.email],
      })
      .expect(201);

    const invitationId = inviteResponse.body.data.invites[0]
      .invitationId as string;
    const invitation = await invitationsRepository.findById(invitationId);

    if (!invitation) {
      throw new Error(`Invitation not found after creation: ${invitationId}`);
    }

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/invites/${invitation.token}/accept`)
      .set('Authorization', `Bearer ${invitee.accessToken}`)
      .expect(201);
  }

  async function findMembershipByUserId(
    groupId: string,
    userId: string,
  ): Promise<{
    membershipId: string;
    userId: string | null;
    status: string;
  } | null> {
    const memberships = await membershipsRepository.findByGroupId(groupId);

    const membership =
      memberships.find(
        (item) =>
          item.userId?.toString() === userId && item.status !== 'removed',
      ) ?? null;

    if (!membership) {
      return null;
    }

    return {
      membershipId: membership._id.toString(),
      userId: membership.userId?.toString() ?? null,
      status: membership.status,
    };
  }

  async function createEqualExpense(
    groupId: string,
    actor: AuthenticatedUserFixture,
    payerMembershipId: string,
    otherMembershipId: string,
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${actor.accessToken}`)
      .send({
        title: 'Dinner',
        amountMinor: 1000,
        currency: 'INR',
        dateIncurred: '2026-04-08',
        payerMembershipId,
        splitMethod: 'equal',
        splits: [
          { membershipId: payerMembershipId },
          { membershipId: otherMembershipId },
        ],
      })
      .expect(201);
  }
});