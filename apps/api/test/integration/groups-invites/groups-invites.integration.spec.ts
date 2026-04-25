/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { InvitationsRepository } from '../../../src/modules/invitations/invitations.repository';
import { MembershipsRepository } from '../../../src/modules/memberships/memberships.repository';
import {
  clearDatabase,
  closeTestApp,
  createTestApp,
  type TestAppContext,
} from '../setup/test-app';
import { signupUser, uniqueEmail } from '../setup/test-helpers';

describe('Groups and invitations integration', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let invitationsRepository: InvitationsRepository;
  let membershipsRepository: MembershipsRepository;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    invitationsRepository = app.get(InvitationsRepository);
    membershipsRepository = app.get(MembershipsRepository);
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('creates a group and bootstraps creator membership', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Rahul Sharma',
        email: uniqueEmail('group-creator'),
        password: 'StrongPass123',
      },
    });

    const createResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Goa Trip',
        defaultCurrency: 'INR',
        type: 'group',
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.group.name).toBe('Goa Trip');

    const groupId = createResponse.body.data.group.id as string;
    const membership = await membershipsRepository.findActiveByGroupIdAndUserId(
      groupId,
      creator.userId,
    );

    expect(membership).not.toBeNull();
    expect(membership?.status).toBe('active');
    expect(membership?.emailSnapshot).toBe(creator.email);
  });

  it('lists groups and returns group details + members', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Aisha Khan',
        email: uniqueEmail('group-list'),
        password: 'StrongPass123',
      },
    });

    const createResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Flat Rent',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = createResponse.body.data.group.id as string;

    const listResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.groups).toHaveLength(1);

    const detailsResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupId}`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(detailsResponse.body.data.group.id).toBe(groupId);
    expect(detailsResponse.body.data.members).toHaveLength(1);

    const membersResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    expect(membersResponse.body.data.members).toHaveLength(1);
    expect(membersResponse.body.data.members[0].email).toBe(creator.email);
  });

  it('patches a group with basic details', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Patch User',
        email: uniqueEmail('group-patch'),
        password: 'StrongPass123',
      },
    });

    const createResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Old Name',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = createResponse.body.data.group.id as string;

    const patchResponse = await request(app.getHttpServer())
      .patch(`/${ctx.apiPrefix}/groups/${groupId}`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'New Name',
        defaultCurrency: 'USD',
      })
      .expect(200);

    expect(patchResponse.body.data.group.name).toBe('New Name');
    expect(patchResponse.body.data.group.defaultCurrency).toBe('USD');
  });

  it('invites a member and creates linked pending membership', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Invite Creator',
        email: uniqueEmail('invite-creator'),
        password: 'StrongPass123',
      },
    });

    const invitedEmail = uniqueEmail('invite-target');

    const groupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Trip Group',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = groupResponse.body.data.group.id as string;

    const inviteResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [invitedEmail],
      })
      .expect(201);

    expect(inviteResponse.body.success).toBe(true);
    expect(inviteResponse.body.data.invites).toHaveLength(1);

    const pendingInvite = await invitationsRepository.findPendingByGroupIdAndEmail(
      groupId,
      invitedEmail,
    );
    expect(pendingInvite).not.toBeNull();

    const pendingMembership = await membershipsRepository.findByInvitationId(
      pendingInvite!._id.toString(),
    );

    expect(pendingMembership).not.toBeNull();
    expect(pendingMembership?.status).toBe('pending');
    expect(pendingMembership?.userId).toBeNull();
    expect(pendingMembership?.emailSnapshot).toBe(invitedEmail);
    expect(pendingInvite?.membershipId?.toString()).toBe(
      pendingMembership?._id.toString(),
    );
  });

  it('rejects duplicate pending invite for same group/email', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Duplicate Invite Creator',
        email: uniqueEmail('duplicate-invite-creator'),
        password: 'StrongPass123',
      },
    });

    const groupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Duplicate Invite Group',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = groupResponse.body.data.group.id as string;
    const invitedEmail = uniqueEmail('duplicate-invite-target');

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [invitedEmail],
      })
      .expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [invitedEmail],
      })
      .expect(409);

    expect(duplicateResponse.body.success).toBe(false);
    expect(duplicateResponse.body.error.code).toBe('ALREADY_INVITED');
  });

  it('resends and cancels a pending invite', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Resend Cancel Creator',
        email: uniqueEmail('resend-cancel-creator'),
        password: 'StrongPass123',
      },
    });

    const groupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Resend Cancel Group',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = groupResponse.body.data.group.id as string;
    const invitedEmail = uniqueEmail('resend-cancel-target');

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [invitedEmail],
      })
      .expect(201);

    const pendingInvite = await invitationsRepository.findPendingByGroupIdAndEmail(
      groupId,
      invitedEmail,
    );
    expect(pendingInvite).not.toBeNull();

    const oldToken = pendingInvite!.token;

    await request(app.getHttpServer())
      .post(
        `/${ctx.apiPrefix}/groups/${groupId}/invites/${pendingInvite!._id.toString()}/resend`,
      )
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(201);

    const refreshedInvite = await invitationsRepository.findById(
      pendingInvite!._id.toString(),
    );
    expect(refreshedInvite?.token).not.toBe(oldToken);

    await request(app.getHttpServer())
      .delete(
        `/${ctx.apiPrefix}/groups/${groupId}/invites/${pendingInvite!._id.toString()}`,
      )
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .expect(200);

    const cancelledInvite = await invitationsRepository.findById(
      pendingInvite!._id.toString(),
    );
    const removedMembership = await membershipsRepository.findByInvitationId(
      pendingInvite!._id.toString(),
    );

    expect(cancelledInvite?.status).toBe('cancelled');
    expect(removedMembership?.status).toBe('removed');
  });

  it('accepts invite with matching email and activates the same membership id', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Creator',
        email: uniqueEmail('accept-creator'),
        password: 'StrongPass123',
      },
    });

    const invitedEmail = uniqueEmail('accept-target');

    const groupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Acceptance Group',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = groupResponse.body.data.group.id as string;

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [invitedEmail],
      })
      .expect(201);

    const pendingInvite = await invitationsRepository.findPendingByGroupIdAndEmail(
      groupId,
      invitedEmail,
    );
    expect(pendingInvite).not.toBeNull();

    const pendingMembership = await membershipsRepository.findByInvitationId(
      pendingInvite!._id.toString(),
    );
    expect(pendingMembership).not.toBeNull();

    const invitedUser = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Invited User',
        email: invitedEmail,
        password: 'StrongPass123',
      },
    });

    const acceptResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/invites/${pendingInvite!.token}/accept`)
      .set('Authorization', `Bearer ${invitedUser.accessToken}`)
      .expect(201);

    expect(acceptResponse.body.success).toBe(true);
    expect(acceptResponse.body.data.group.id).toBe(groupId);
    expect(acceptResponse.body.data.membership.membershipId).toBe(
      pendingMembership!._id.toString(),
    );

    const activatedMembership = await membershipsRepository.findById(
      pendingMembership!._id.toString(),
    );
    expect(activatedMembership?.status).toBe('active');
    expect(activatedMembership?.userId?.toString()).toBe(invitedUser.userId);
  });

  it('lists received pending invites and accepts by invitation id', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Inbox Creator',
        email: uniqueEmail('invite-inbox-creator'),
        password: 'StrongPass123',
      },
    });

    const invitedUser = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Inbox Target',
        email: uniqueEmail('invite-inbox-target'),
        password: 'StrongPass123',
      },
    });

    const groupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Inbox Invite Group',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = groupResponse.body.data.group.id as string;

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [invitedUser.email],
      })
      .expect(201);

    const pendingInvite = await invitationsRepository.findPendingByGroupIdAndEmail(
      groupId,
      invitedUser.email,
    );
    expect(pendingInvite).not.toBeNull();

    const pendingMembership = await membershipsRepository.findByInvitationId(
      pendingInvite!._id.toString(),
    );
    expect(pendingMembership).not.toBeNull();

    const pendingInvitesResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/invites/pending`)
      .set('Authorization', `Bearer ${invitedUser.accessToken}`)
      .expect(200);

    expect(pendingInvitesResponse.body.success).toBe(true);
    expect(pendingInvitesResponse.body.data.invites).toHaveLength(1);
    expect(pendingInvitesResponse.body.data.invites[0].invitationId).toBe(
      pendingInvite!._id.toString(),
    );
    expect(pendingInvitesResponse.body.data.invites[0].membershipId).toBe(
      pendingMembership!._id.toString(),
    );
    expect(pendingInvitesResponse.body.data.invites[0].group.id).toBe(groupId);
    expect(pendingInvitesResponse.body.data.invites[0].group.name).toBe(
      'Inbox Invite Group',
    );

    const acceptResponse = await request(app.getHttpServer())
      .post(
        `/${ctx.apiPrefix}/invites/pending/${pendingInvite!._id.toString()}/accept`,
      )
      .set('Authorization', `Bearer ${invitedUser.accessToken}`)
      .expect(201);

    expect(acceptResponse.body.success).toBe(true);
    expect(acceptResponse.body.data.group.id).toBe(groupId);
    expect(acceptResponse.body.data.membership.membershipId).toBe(
      pendingMembership!._id.toString(),
    );

    const activatedMembership = await membershipsRepository.findById(
      pendingMembership!._id.toString(),
    );
    expect(activatedMembership?.status).toBe('active');
    expect(activatedMembership?.userId?.toString()).toBe(invitedUser.userId);

    const pendingInvitesAfterAcceptResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/invites/pending`)
      .set('Authorization', `Bearer ${invitedUser.accessToken}`)
      .expect(200);

    expect(pendingInvitesAfterAcceptResponse.body.data.invites).toHaveLength(0);
  });

  it('rejects invite acceptance for mismatched authenticated email', async () => {
    const creator = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Mismatch Creator',
        email: uniqueEmail('mismatch-creator'),
        password: 'StrongPass123',
      },
    });

    const invitedEmail = uniqueEmail('mismatch-target');

    const groupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        name: 'Mismatch Group',
        defaultCurrency: 'INR',
      })
      .expect(201);

    const groupId = groupResponse.body.data.group.id as string;

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/groups/${groupId}/invites`)
      .set('Authorization', `Bearer ${creator.accessToken}`)
      .send({
        emails: [invitedEmail],
      })
      .expect(201);

    const pendingInvite = await invitationsRepository.findPendingByGroupIdAndEmail(
      groupId,
      invitedEmail,
    );
    expect(pendingInvite).not.toBeNull();

    const wrongUser = await signupUser({
      server: app.getHttpServer(),
      apiPrefix: ctx.apiPrefix,
      user: {
        name: 'Wrong User',
        email: uniqueEmail('mismatch-wrong-user'),
        password: 'StrongPass123',
      },
    });

    const acceptResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/invites/${pendingInvite!.token}/accept`)
      .set('Authorization', `Bearer ${wrongUser.accessToken}`)
      .expect(403);

    expect(acceptResponse.body.success).toBe(false);
    expect(acceptResponse.body.error.code).toBe('FORBIDDEN');
  });
});