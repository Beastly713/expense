import type { CookieOptions, Request, Response } from 'express';

import {
  DEFAULT_REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_TOKEN_COOKIE_NAME,
} from './auth.constants';

function parseDurationToMs(duration: string): number {
  const trimmed = duration.trim();
  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) {
    return DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;
  }

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;
  }
}

export function buildRefreshTokenCookieOptions(params: {
  nodeEnv: string;
  apiPrefix: string;
  refreshExpiresIn: string;
}): CookieOptions {
  return {
    httpOnly: true,
    secure: params.nodeEnv === 'production',
    sameSite: 'lax',
    path: `/${params.apiPrefix}/auth`,
    maxAge: parseDurationToMs(params.refreshExpiresIn),
  };
}

export function setRefreshTokenCookie(
  response: Response,
  refreshToken: string,
  options: CookieOptions,
): void {
  response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, options);
}

export function clearRefreshTokenCookie(
  response: Response,
  options: CookieOptions,
): void {
  response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

export function getRefreshTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookiePairs = cookieHeader.split(';');

  for (const cookiePair of cookiePairs) {
    const trimmedPair = cookiePair.trim();
    const separatorIndex = trimmedPair.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedPair.slice(0, separatorIndex).trim();
    const value = trimmedPair.slice(separatorIndex + 1).trim();

    if (key === REFRESH_TOKEN_COOKIE_NAME && value.length > 0) {
      return decodeURIComponent(value);
    }
  }

  return null;
}