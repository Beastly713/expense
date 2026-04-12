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
}

describe('Activity integration', () => {
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
        name: 'Activity Group',
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

    const inviteResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [uniqueEmail('activity-pending')],
      })
      .expect(201);

    return {
      groupId,
      creatorMembershipId: creatorMembership!._id.toString(),
      pendingMembershipId: inviteResponse.body.data.invites[0].membershipId as string,
    };
  }

  async function createLifecycleExpense(params: {
    creator: AuthenticatedUserFixture;
    groupId: string;
    creatorMembershipId: string;
    pendingMembershipId: string;
  }): Promise<string> {
    const createResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${params.groupId}/expenses`)
      .set('Authorization', `Bearer ${params.creator.accessToken}`)
      .send({
        title: 'Activity Dinner',
        notes: 'Activity lifecycle seed',
        amountMinor: 1200,
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

    return createResponse.body.data.expense.id as string;
  }

  it('returns expense lifecycle events in both group and global activity feeds', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Activity Creator',
        email: uniqueEmail('activity-creator'),
        password: 'StrongPass123',
      },
    });

    const groupFixture = await createGroupWithPendingMember(creator);

    const expenseId = await createLifecycleExpense({
      creator,
      groupId: groupFixture.groupId,
      creatorMembershipId: groupFixture.creatorMembershipId,
      pendingMembershipId: groupFixture.pendingMembershipId,
    });

    await request(app.getHttpServer())
      .patch(`/${ctx.apiPrefix}/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        title: 'Activity Dinner Edited',
        notes: 'Edited activity lifecycle seed',
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

    await request(app.getHttpServer())
      .delete(`/${ctx.apiPrefix}/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/expenses/${expenseId}/restore`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(201);

    const groupActivityResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupFixture.groupId}/activity?page=1&limit=20`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    const groupActionTypes = groupActivityResponse.body.data.items.map(
      (item: { actionType: string }) => item.actionType,
    );

    expect(groupActionTypes).toEqual(
      expect.arrayContaining([
        'expense_added',
        'expense_edited',
        'expense_deleted',
        'expense_restored',
      ]),
    );

    const globalActivityResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/activity?page=1&limit=20`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    const globalItems = globalActivityResponse.body.data.items as Array<{
      actionType: string;
      groupId: string;
      groupName: string;
      entityId: string;
    }>;

    const globalActionTypes = globalItems.map((item) => item.actionType);

    expect(globalActionTypes).toEqual(
      expect.arrayContaining([
        'expense_added',
        'expense_edited',
        'expense_deleted',
        'expense_restored',
      ]),
    );

    const restoredItem = globalItems.find(
      (item) => item.actionType === 'expense_restored',
    );

    expect(restoredItem).toBeDefined();
    expect(restoredItem?.groupId).toBe(groupFixture.groupId);
    expect(restoredItem?.groupName).toBe('Activity Group');
    expect(restoredItem?.entityId).toBe(expenseId);
  });
});