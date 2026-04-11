/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import {
  clearDatabase,
  closeTestApp,
  createTestApp,
  type TestAppContext,
} from '../setup/test-app';
import { hashResetToken, uniqueEmail } from '../setup/test-helpers';

describe('Auth integration', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let usersRepository: UsersRepository;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    usersRepository = app.get(UsersRepository);
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('signs up successfully and sets refresh cookie', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/signup`)
      .send({
        name: 'Rahul Sharma',
        email: uniqueEmail('signup'),
        password: 'StrongPass123',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toContain('@example.com');
    expect(response.body.data.accessToken).toEqual(expect.any(String));

    const setCookieHeader = response.headers['set-cookie'];
    const setCookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : typeof setCookieHeader === 'string'
        ? [setCookieHeader]
        : [];

    expect(setCookies.length).toBeGreaterThan(0);
    expect(setCookies.join(';')).toContain('splitwise_refresh_token=');
  });

  it('logs in successfully with valid credentials', async () => {
    const email = uniqueEmail('login-success');
    const password = 'StrongPass123';

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/signup`)
      .send({
        name: 'Aisha Khan',
        email,
        password,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/login`)
      .send({
        email,
        password,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it('rejects login with invalid password', async () => {
    const email = uniqueEmail('login-failure');

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/signup`)
      .send({
        name: 'Wrong Password User',
        email,
        password: 'StrongPass123',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/login`)
      .send({
        email,
        password: 'WrongPass999',
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns current user on /auth/me with bearer token', async () => {
    const email = uniqueEmail('auth-me');

    const signupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/signup`)
      .send({
        name: 'Current User',
        email,
        password: 'StrongPass123',
      })
      .expect(201);

    const accessToken = signupResponse.body.data.accessToken as string;

    const meResponse = await request(app.getHttpServer())
      .get(`/${ctx.apiPrefix}/auth/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data.email).toBe(email);
  });

  it('refreshes access token using refresh cookie and invalidates after logout', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = uniqueEmail('refresh');

    await agent
      .post(`/${ctx.apiPrefix}/auth/signup`)
      .send({
        name: 'Refresh Flow',
        email,
        password: 'StrongPass123',
      })
      .expect(201);

    const refreshResponse = await agent
      .post(`/${ctx.apiPrefix}/auth/refresh`)
      .expect(200);

    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.accessToken).toEqual(expect.any(String));

    await agent
      .post(`/${ctx.apiPrefix}/auth/logout`)
      .expect(200);

    const failedRefreshResponse = await agent
      .post(`/${ctx.apiPrefix}/auth/refresh`)
      .expect(401);

    expect(failedRefreshResponse.body.success).toBe(false);
    expect(failedRefreshResponse.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns generic forgot-password success for existing and non-existing users', async () => {
    const existingEmail = uniqueEmail('forgot-existing');

    await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/signup`)
      .send({
        name: 'Forgot Password User',
        email: existingEmail,
        password: 'StrongPass123',
      })
      .expect(201);

    const existingResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/forgot-password`)
      .send({ email: existingEmail })
      .expect(200);

    const missingResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/forgot-password`)
      .send({ email: uniqueEmail('forgot-missing') })
      .expect(200);

    expect(existingResponse.body.data.message).toBe(
      'Password reset email sent if account exists',
    );
    expect(missingResponse.body.data.message).toBe(
      'Password reset email sent if account exists',
    );
  });

  it('resets password successfully with a valid reset token', async () => {
    const email = uniqueEmail('reset');
    const originalPassword = 'StrongPass123';
    const newPassword = 'NewStrongPass123';

    const signupResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/signup`)
      .send({
        name: 'Reset Password User',
        email,
        password: originalPassword,
      })
      .expect(201);

    const userId = signupResponse.body.data.user.id as string;
    const rawResetToken = 'manual-reset-token-for-test';

    await usersRepository.updateById(userId, {
      $set: {
        passwordResetTokenHash: hashResetToken(rawResetToken),
        passwordResetExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const resetResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/reset-password`)
      .send({
        token: rawResetToken,
        newPassword,
      })
      .expect(200);

    expect(resetResponse.body.success).toBe(true);
    expect(resetResponse.body.data.message).toBe('Password reset successful');

    const loginResponse = await request(app.getHttpServer())
      .post(`/${ctx.apiPrefix}/auth/login`)
      .send({
        email,
        password: newPassword,
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.user.email).toBe(email);
  });
});