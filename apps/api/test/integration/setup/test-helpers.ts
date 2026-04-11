/// <reference types="jest" />
import { createHash } from 'crypto';
import request from 'supertest';

export interface SignupFixture {
  name: string;
  email: string;
  password: string;
}

export interface AuthenticatedUserFixture extends SignupFixture {
  userId: string;
  accessToken: string;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

export async function signupUser(params: {
  server: Parameters<typeof request>[0];
  apiPrefix: string;
  user: SignupFixture;
}): Promise<AuthenticatedUserFixture> {
  const response = await request(params.server)
    .post(`/${params.apiPrefix}/auth/signup`)
    .send(params.user)
    .expect(201);

  return {
    ...params.user,
    userId: response.body.data.user.id as string,
    accessToken: response.body.data.accessToken as string,
  };
}

export function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}