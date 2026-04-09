import { apiRequest } from './client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
  accessToken: string;
}

export interface AuthMeResponse {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
  notificationPreferences: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
  };
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LogoutResponse {
  message: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function signup(input: SignupInput) {
  return apiRequest<AuthSessionResponse>('/auth/signup', {
    method: 'POST',
    body: input,
  });
}

export function login(input: LoginInput) {
  return apiRequest<AuthSessionResponse>('/auth/login', {
    method: 'POST',
    body: input,
  });
}

export function getMe(accessToken: string) {
  return apiRequest<AuthMeResponse>('/auth/me', {
    method: 'GET',
    accessToken,
  });
}

export function refreshAccessToken() {
  return apiRequest<RefreshResponse>('/auth/refresh', {
    method: 'POST',
  });
}

export function logout() {
  return apiRequest<LogoutResponse>('/auth/logout', {
    method: 'POST',
  });
}