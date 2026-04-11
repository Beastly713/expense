/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { ActivityRepository } from '../../../src/modules/activity/activity.repository';
import { ExpensesRepository } from '../../../src/modules/expenses/expenses.repository';
import { SplitsRepository } from '../../../src/modules/expenses/splits.repository';
import { InvitationsRepository } from '../../../src/modules/invitations/invitations.repository';
import { MembershipsRepository } from '../../../src/modules/memberships/memberships.repository';
import { NotificationsRepository } from '../../../src/modules/notifications/notifications.repository';
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

describe('Expenses integration', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let expensesRepository: ExpensesRepository;
  let splitsRepository: SplitsRepository;
  let membershipsRepository: MembershipsRepository;
  let invitationsRepository: InvitationsRepository;
  let activityRepository: ActivityRepository;
  let notificationsRepository: NotificationsRepository;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    expensesRepository = app.get(ExpensesRepository);
    splitsRepository = app.get(SplitsRepository);
    membershipsRepository = app.get(MembershipsRepository);
    invitationsRepository = app.get(InvitationsRepository);
    activityRepository = app.get(ActivityRepository);
    notificationsRepository = app.get(NotificationsRepository);
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('creates an equal-split expense with active and pending participants, updates caches, logs activity, and notifies active members', async () => {
    const creator = await createUser('Rahul Sharma', 'expense-creator');
    const activeMember = await createUser('Aisha Khan', 'expense-active');
    const pendingEmail = uniqueEmail('expense-pending');

    const groupId = await createGroup(creator, {
      name: 'Goa Trip',
      defaultCurrency: 'INR',
    });

    await inviteAndAcceptMember(groupId, creator, activeMember);
    await inviteMember(groupId, creator, pendingEmail);

    const creatorMembership = await findMembershipByUserId(groupId, creator.userId);
    const activeMembership = await findMembershipByUserId(
      groupId,
      activeMember.userId,
    );
    const pendingMembership = await findMembershipByEmail(groupId, pendingEmail);

    expect(creatorMembership).not.toBeNull();
    expect(activeMembership).not.toBeNull();
    expect(pendingMembership).not.toBeNull();
    expect(pendingMembership?.status).toBe('pending');

    const createResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        title: 'Dinner',
        notes: 'Saturday night dinner',
        amountMinor: 1200,
        currency: 'INR',
        dateIncurred: '2026-04-08',
        payerMembershipId: creatorMembership!._id.toString(),
        splitMethod: 'equal',
        splits: [
          { membershipId: creatorMembership!._id.toString() },
          { membershipId: activeMembership!._id.toString() },
          { membershipId: pendingMembership!._id.toString() },
        ],
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.expense.title).toBe('Dinner');
    expect(createResponse.body.data.expense.amountMinor).toBe(1200);
    expect(createResponse.body.data.expense.splitMethod).toBe('equal');
    expect(createResponse.body.data.splits).toEqual([
      {
        membershipId: creatorMembership!._id.toString(),
        owedShareMinor: 400,
      },
      {
        membershipId: activeMembership!._id.toString(),
        owedShareMinor: 400,
      },
      {
        membershipId: pendingMembership!._id.toString(),
        owedShareMinor: 400,
      },
    ]);

    const expenseId = createResponse.body.data.expense.id as string;

    const persistedExpense = await expensesRepository.findById(expenseId);
    expect(persistedExpense).not.toBeNull();
    expect(persistedExpense?.participantCount).toBe(3);
    expect(persistedExpense?.isDeleted).toBe(false);

    const persistedSplits = await splitsRepository.findByExpenseId(expenseId);
    expect(persistedSplits).toHaveLength(3);
    expect(persistedSplits.map((split) => split.owedShareMinor)).toEqual([
      400,
      400,
      400,
    ]);

    const refreshedCreatorMembership = await membershipsRepository.findById(
      creatorMembership!._id.toString(),
    );
    const refreshedActiveMembership = await membershipsRepository.findById(
      activeMembership!._id.toString(),
    );
    const refreshedPendingMembership = await membershipsRepository.findById(
      pendingMembership!._id.toString(),
    );

    expect(refreshedCreatorMembership?.cachedNetBalanceMinor).toBe(800);
    expect(refreshedActiveMembership?.cachedNetBalanceMinor).toBe(-400);
    expect(refreshedPendingMembership?.cachedNetBalanceMinor).toBe(-400);

    const activityItems = await activityRepository.findByGroupId(groupId, 20);
    const expenseAddedActivity = activityItems.find(
      (item) =>
        item.actionType === 'expense_added' &&
        item.entityId.toString() === expenseId,
    );

    expect(expenseAddedActivity).toBeDefined();
    expect(expenseAddedActivity?.metadata).toMatchObject({
      title: 'Dinner',
      amountMinor: 1200,
      splitMethod: 'equal',
    });

    const activeMemberNotifications = await notificationsRepository.findByUserId(
      activeMember.userId,
    );

    expect(activeMemberNotifications).toHaveLength(1);
    expect(activeMemberNotifications[0]?.type).toBe('expense_added');
    expect(activeMemberNotifications[0]?.entityType).toBe('expense');
    expect(activeMemberNotifications[0]?.entityId.toString()).toBe(expenseId);

    const groupDetailsResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupId}`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(groupDetailsResponse.body.success).toBe(true);
    expect(groupDetailsResponse.body.data.expenseCount).toBe(1);
    expect(groupDetailsResponse.body.data.simplifiedBalances).toEqual(
      expect.arrayContaining([
        {
          fromMembershipId: activeMembership!._id.toString(),
          toMembershipId: creatorMembership!._id.toString(),
          amountMinor: 400,
        },
        {
          fromMembershipId: pendingMembership!._id.toString(),
          toMembershipId: creatorMembership!._id.toString(),
          amountMinor: 400,
        },
      ]),
    );
  });

  it('creates an exact-split expense', async () => {
    const creator = await createUser('Rahul Sharma', 'exact-creator');
    const member = await createUser('Aisha Khan', 'exact-member');

    const groupId = await createGroup(creator, {
      name: 'Cab Shares',
      defaultCurrency: 'INR',
    });

    await inviteAndAcceptMember(groupId, creator, member);

    const creatorMembership = await findMembershipByUserId(groupId, creator.userId);
    const memberMembership = await findMembershipByUserId(groupId, member.userId);

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        title: 'Cab',
        amountMinor: 900,
        currency: 'INR',
        dateIncurred: '2026-04-08',
        payerMembershipId: creatorMembership!._id.toString(),
        splitMethod: 'exact',
        splits: [
          {
            membershipId: creatorMembership!._id.toString(),
            inputValue: 300,
          },
          {
            membershipId: memberMembership!._id.toString(),
            inputValue: 600,
          },
        ],
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.splits).toEqual([
      {
        membershipId: creatorMembership!._id.toString(),
        owedShareMinor: 300,
      },
      {
        membershipId: memberMembership!._id.toString(),
        owedShareMinor: 600,
      },
    ]);

    const refreshedCreatorMembership = await membershipsRepository.findById(
      creatorMembership!._id.toString(),
    );
    const refreshedMemberMembership = await membershipsRepository.findById(
      memberMembership!._id.toString(),
    );

    expect(refreshedCreatorMembership?.cachedNetBalanceMinor).toBe(600);
    expect(refreshedMemberMembership?.cachedNetBalanceMinor).toBe(-600);
  });

  it('creates a percent-split expense', async () => {
    const creator = await createUser('Rahul Sharma', 'percent-creator');
    const member = await createUser('Aisha Khan', 'percent-member');

    const groupId = await createGroup(creator, {
      name: 'Hotel Split',
      defaultCurrency: 'INR',
    });

    await inviteAndAcceptMember(groupId, creator, member);

    const creatorMembership = await findMembershipByUserId(groupId, creator.userId);
    const memberMembership = await findMembershipByUserId(groupId, member.userId);

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        title: 'Hotel',
        amountMinor: 1000,
        currency: 'INR',
        dateIncurred: '2026-04-08',
        payerMembershipId: creatorMembership!._id.toString(),
        splitMethod: 'percent',
        splits: [
          {
            membershipId: creatorMembership!._id.toString(),
            inputValue: 25,
          },
          {
            membershipId: memberMembership!._id.toString(),
            inputValue: 75,
          },
        ],
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.splits).toEqual([
      {
        membershipId: creatorMembership!._id.toString(),
        owedShareMinor: 250,
      },
      {
        membershipId: memberMembership!._id.toString(),
        owedShareMinor: 750,
      },
    ]);

    const refreshedCreatorMembership = await membershipsRepository.findById(
      creatorMembership!._id.toString(),
    );
    const refreshedMemberMembership = await membershipsRepository.findById(
      memberMembership!._id.toString(),
    );

    expect(refreshedCreatorMembership?.cachedNetBalanceMinor).toBe(750);
    expect(refreshedMemberMembership?.cachedNetBalanceMinor).toBe(-750);
  });

  it('creates a shares-split expense', async () => {
    const creator = await createUser('Rahul Sharma', 'shares-creator');
    const member = await createUser('Aisha Khan', 'shares-member');

    const groupId = await createGroup(creator, {
      name: 'Fuel Split',
      defaultCurrency: 'INR',
    });

    await inviteAndAcceptMember(groupId, creator, member);

    const creatorMembership = await findMembershipByUserId(groupId, creator.userId);
    const memberMembership = await findMembershipByUserId(groupId, member.userId);

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        title: 'Fuel',
        amountMinor: 1200,
        currency: 'INR',
        dateIncurred: '2026-04-08',
        payerMembershipId: creatorMembership!._id.toString(),
        splitMethod: 'shares',
        splits: [
          {
            membershipId: creatorMembership!._id.toString(),
            inputValue: 1,
          },
          {
            membershipId: memberMembership!._id.toString(),
            inputValue: 2,
          },
        ],
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.splits).toEqual([
      {
        membershipId: creatorMembership!._id.toString(),
        owedShareMinor: 400,
      },
      {
        membershipId: memberMembership!._id.toString(),
        owedShareMinor: 800,
      },
    ]);

    const refreshedCreatorMembership = await membershipsRepository.findById(
      creatorMembership!._id.toString(),
    );
    const refreshedMemberMembership = await membershipsRepository.findById(
      memberMembership!._id.toString(),
    );

    expect(refreshedCreatorMembership?.cachedNetBalanceMinor).toBe(800);
    expect(refreshedMemberMembership?.cachedNetBalanceMinor).toBe(-800);
  });

  it('rejects an invalid exact split total', async () => {
    const creator = await createUser('Rahul Sharma', 'invalid-split-creator');
    const member = await createUser('Aisha Khan', 'invalid-split-member');

    const groupId = await createGroup(creator, {
      name: 'Invalid Split Group',
      defaultCurrency: 'INR',
    });

    await inviteAndAcceptMember(groupId, creator, member);

    const creatorMembership = await findMembershipByUserId(groupId, creator.userId);
    const memberMembership = await findMembershipByUserId(groupId, member.userId);

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        title: 'Broken Split',
        amountMinor: 600,
        currency: 'INR',
        dateIncurred: '2026-04-08',
        payerMembershipId: creatorMembership!._id.toString(),
        splitMethod: 'exact',
        splits: [
          {
            membershipId: creatorMembership!._id.toString(),
            inputValue: 200,
          },
          {
            membershipId: memberMembership!._id.toString(),
            inputValue: 300,
          },
        ],
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_SPLIT_TOTAL');

    const expenses = await expensesRepository.findByGroupId(groupId, true);
    expect(expenses).toHaveLength(0);
  });

  it('rejects an invalid payer membership', async () => {
    const creator = await createUser('Rahul Sharma', 'invalid-payer-creator');
    const member = await createUser('Aisha Khan', 'invalid-payer-member');

    const groupId = await createGroup(creator, {
      name: 'Invalid Payer Group',
      defaultCurrency: 'INR',
    });

    await inviteAndAcceptMember(groupId, creator, member);

    const memberships = await membershipsRepository.findByGroupId(groupId);
    const validMembershipIds = memberships.map((membership) =>
      membership._id.toString(),
    );

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        title: 'Dinner',
        amountMinor: 1000,
        currency: 'INR',
        dateIncurred: '2026-04-08',
        payerMembershipId: 'not-a-real-membership-id',
        splitMethod: 'equal',
        splits: validMembershipIds.slice(0, 2).map((membershipId) => ({
          membershipId,
        })),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');

    const expenses = await expensesRepository.findByGroupId(groupId, true);
    expect(expenses).toHaveLength(0);
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
    input: {
      name: string;
      defaultCurrency: string;
    },
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: input.name,
        defaultCurrency: input.defaultCurrency,
        type: 'group',
      })
      .expect(201);

    return response.body.data.group.id as string;
  }

  async function inviteMember(
    groupId: string,
    inviter: AuthenticatedUserFixture,
    email: string,
  ) {
    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${inviter.accessToken}`)
      .send({
        emails: [email],
      })
      .expect(201);

    const invitationId = response.body.data.invites[0].invitationId as string;
    const invitation = await invitationsRepository.findById(invitationId);

    if (!invitation) {
      throw new Error(`Invitation not found after creation: ${invitationId}`);
    }

    return invitation;
  }

  async function inviteAndAcceptMember(
    groupId: string,
    inviter: AuthenticatedUserFixture,
    invitee: AuthenticatedUserFixture,
  ): Promise<void> {
    const invitation = await inviteMember(groupId, inviter, invitee.email);

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/invites/${invitation.token}/accept`)
      .set('Authorization', `Bearer ${invitee.accessToken}`)
      .expect(201);
  }

  async function findMembershipByUserId(groupId: string, userId: string) {
    const memberships = await membershipsRepository.findByGroupId(groupId);
    return (
      memberships.find(
        (membership) =>
          membership.userId?.toString() === userId &&
          membership.status !== 'removed',
      ) ?? null
    );
  }

  async function findMembershipByEmail(groupId: string, email: string) {
    const memberships = await membershipsRepository.findByGroupId(groupId);
    return (
      memberships.find(
        (membership) =>
          membership.emailSnapshot === email.trim().toLowerCase() &&
          membership.status !== 'removed',
      ) ?? null
    );
  }
});