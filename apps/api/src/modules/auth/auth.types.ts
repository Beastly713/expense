import type { NotificationPreferences } from '@splitwise/shared-types';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  type: 'refresh';
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

export interface AuthSessionArtifacts extends AuthSessionResponse {
  refreshToken: string;
}

export interface AuthMeResponse {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
  notificationPreferences: NotificationPreferences;
}

export interface RefreshAccessTokenResponse {
  accessToken: string;
}

export interface LogoutResponse {
  message: string;
}