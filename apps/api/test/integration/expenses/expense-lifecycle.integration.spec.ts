/// <reference types="jest" />

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MembershipsRepository } from '../../../src/modules/memberships/memberships.repository';
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

interface GroupWithPendingMemberFixture {
  groupId: string;
  creatorMembershipId: string;
  pendingMembershipId: string;
  pendingEmail: string;
}

describe('Expense lifecycle integration', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let membershipsRepository: MembershipsRepository;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    membershipsRepository = app.get(MembershipsRepository);
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  async function createGroupWithPendingMember(
    creator: AuthenticatedUserFixture,
  ): Promise<GroupWithPendingMemberFixture> {
    const groupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Lifecycle Group',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = groupResponse.body.data.group.id as string;

    const creatorMembership =
      await membershipsRepository.findActiveByGroupIdAndUserId(
        groupId,
        creator.userId,
      );

    expect(creatorMembership).not.toBeNull();

    const pendingEmail = uniqueEmail('expense-lifecycle-pending');

    const inviteResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [pendingEmail],
      })
      .expect(201);

    const pendingMembershipId = inviteResponse.body.data.invites[0]
      .membershipId as string;

    return {
      groupId,
      creatorMembershipId: creatorMembership!._id.toString(),
      pendingMembershipId,
      pendingEmail,
    };
  }

  async function createEqualExpense(params: {
    creator: AuthenticatedUserFixture;
    groupId: string;
    creatorMembershipId: string;
    pendingMembershipId: string;
    title?: string;
    amountMinor?: number;
  }): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${params.groupId}/expenses`)
      .set('Authorization', `Bearer ${params.creator.accessToken}`)
      .send({
        title: params.title ?? 'Dinner',
        notes: 'Initial lifecycle expense',
        amountMinor: params.amountMinor ?? 1200,
        currency: 'INR',
        dateIncurred: '2026-04-12',
        payerMembershipId: params.creatorMembershipId,
        splitMethod: 'equal',
        splits: [
          {
            membershipId: params.creatorMembershipId,
          },
          {
            membershipId: params.pendingMembershipId,
          },
        ],
      })
      .expect(201);

    return response.body.data.expense.id as string;
  }

  it('edits, deletes, and restores an expense while recomputing balances correctly', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Lifecycle Creator',
        email: uniqueEmail('expense-lifecycle-creator'),
        password: 'StrongPass123',
      },
    });

    const groupFixture = await createGroupWithPendingMember(creator);

    const expenseId = await createEqualExpense({
      creator,
      groupId: groupFixture.groupId,
      creatorMembershipId: groupFixture.creatorMembershipId,
      pendingMembershipId: groupFixture.pendingMembershipId,
      amountMinor: 1200,
    });

    const initialBalancesResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupFixture.groupId}/balances`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(initialBalancesResponse.body.data.simplifiedBalances).toEqual([
      {
        fromMembershipId: groupFixture.pendingMembershipId,
        toMembershipId: groupFixture.creatorMembershipId,
        amountMinor: 600,
      },
    ]);

    const editResponse = await request(app.getHttpServer())
      .patch(`/${ctx.apiPrefix}/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        title: 'Edited Dinner',
        notes: 'Edited lifecycle expense',
        amountMinor: 2000,
        currency: 'INR',
        dateIncurred: '2026-04-13',
        payerMembershipId: groupFixture.creatorMembershipId,
        splitMethod: 'equal',
        splits: [
          {
            membershipId: groupFixture.creatorMembershipId,
          },
          {
            membershipId: groupFixture.pendingMembershipId,
          },
        ],
      })
      .expect(200);

    expect(editResponse.body.success).toBe(true);
    expect(editResponse.body.data.expense.id).toBe(expenseId);
    expect(editResponse.body.data.expense.title).toBe('Edited Dinner');
    expect(editResponse.body.data.expense.amountMinor).toBe(2000);
    expect(editResponse.body.data.expense.version).toBe(2);

    const editedBalancesResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupFixture.groupId}/balances`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(editedBalancesResponse.body.data.simplifiedBalances).toEqual([
      {
        fromMembershipId: groupFixture.pendingMembershipId,
        toMembershipId: groupFixture.creatorMembershipId,
        amountMinor: 1000,
      },
    ]);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/${ctx.apiPrefix}/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(deleteResponse.body.success).toBe(true);
    expect(deleteResponse.body.data.message).toBe('Expense deleted successfully');

    const balancesAfterDeleteResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupFixture.groupId}/balances`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(balancesAfterDeleteResponse.body.data.simplifiedBalances).toEqual([]);
    expect(balancesAfterDeleteResponse.body.data.memberNetBalances).toEqual(
      expect.arrayContaining([
        {
          membershipId: groupFixture.creatorMembershipId,
          netBalanceMinor: 0,
        },
        {
          membershipId: groupFixture.pendingMembershipId,
          netBalanceMinor: 0,
        },
      ]),
    );

    const visibleExpensesResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupFixture.groupId}/expenses`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(visibleExpensesResponse.body.data.items).toEqual([]);

    const restoreResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/expenses/${expenseId}/restore`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(201);

    expect(restoreResponse.body.success).toBe(true);
    expect(restoreResponse.body.data.message).toBe('Expense restored successfully');

    const balancesAfterRestoreResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupFixture.groupId}/balances`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(balancesAfterRestoreResponse.body.data.simplifiedBalances).toEqual([
      {
        fromMembershipId: groupFixture.pendingMembershipId,
        toMembershipId: groupFixture.creatorMembershipId,
        amountMinor: 1000,
      },
    ]);
  });
});