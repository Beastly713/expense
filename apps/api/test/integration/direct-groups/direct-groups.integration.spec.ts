/// <reference types="jest" />
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityRepository } from '../../../src/modules/activity/activity.repository';
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

describe('Direct groups integration', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let membershipsRepository: MembershipsRepository;
  let activityRepository: ActivityRepository;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    membershipsRepository = app.get(MembershipsRepository);
    activityRepository = app.get(ActivityRepository);
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('creates a direct ledger with an existing registered user', async () => {
    const rahul = await createUser('Rahul Sharma', 'direct-rahul');
    const aisha = await createUser('Aisha Khan', 'direct-aisha');

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/direct`)
      .set('Authorization', `Bearer ${rahul.accessToken}`)
      .send({
        email: aisha.email,
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.group.type).toBe('direct');
    expect(response.body.data.group.defaultCurrency).toBe('INR');

    const groupId = response.body.data.group.id as string;

    const memberships = await membershipsRepository.findByGroupId(groupId);
    const activeMemberships = memberships.filter(
      (membership) => membership.status === 'active',
    );

    expect(activeMemberships).toHaveLength(2);

    const activeUserIds = activeMemberships
      .map((membership) => membership.userId?.toString())
      .sort();

    expect(activeUserIds).toEqual([aisha.userId, rahul.userId].sort());

    const detailResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupId}`)
      .set('Authorization', `Bearer ${aisha.accessToken}`)
      .expect(200);

    expect(detailResponse.body.data.group.type).toBe('direct');
    expect(detailResponse.body.data.members).toHaveLength(2);

    const activities = await activityRepository.findByGroupId(groupId, 10);
    expect(
      activities.some((activity) => activity.actionType === 'group_created'),
    ).toBe(true);
  });

  it('returns the same direct group instead of creating duplicates', async () => {
    const rahul = await createUser('Rahul Sharma', 'direct-existing-rahul');
    const aisha = await createUser('Aisha Khan', 'direct-existing-aisha');

    const firstResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/direct`)
      .set('Authorization', `Bearer ${rahul.accessToken}`)
      .send({
        email: aisha.email,
      })
      .expect(201);

    const secondResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/direct`)
      .set('Authorization', `Bearer ${rahul.accessToken}`)
      .send({
        email: aisha.email,
      })
      .expect(201);

    expect(secondResponse.body.data.group.id).toBe(firstResponse.body.data.group.id);

    const memberships = await membershipsRepository.findByGroupId(
      firstResponse.body.data.group.id,
    );

    expect(
      memberships.filter((membership) => membership.status === 'active'),
    ).toHaveLength(2);
  });

  it('rejects creating a direct ledger with yourself', async () => {
    const rahul = await createUser('Rahul Sharma', 'direct-self');

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/direct`)
      .set('Authorization', `Bearer ${rahul.accessToken}`)
      .send({
        email: rahul.email,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects creating a direct ledger for a non-existent user', async () => {
    const rahul = await createUser('Rahul Sharma', 'direct-missing');

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/direct`)
      .set('Authorization', `Bearer ${rahul.accessToken}`)
      .send({
        email: uniqueEmail('missing-user'),
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
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
});