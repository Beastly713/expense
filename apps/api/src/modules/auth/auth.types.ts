import type { NotificationPreferences } from '@splitwise/shared-types';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUserDto {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
}

export interface AuthSessionResponse {
  user: AuthenticatedUserDto;
  accessToken: string;
}

export interface AuthMeResponse {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
  notificationPreferences: NotificationPreferences;
}