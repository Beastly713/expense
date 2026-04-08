import type { ApiResponse } from '@splitwise/shared-types';

import { getApiBaseUrl } from '@/lib/env';

interface ApiClientErrorOptions {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Record<string, unknown> | null | undefined;

  constructor(options: ApiClientErrorOptions) {
    super(options.message);

    this.name = 'ApiClientError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  return new URL(normalizedPath, normalizedBaseUrl).toString();
}

export async function apiFetch<TData>(path: string, init?: RequestInit): Promise<TData> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  let parsedBody: ApiResponse<TData> | null = null;

  if (contentType.includes('application/json')) {
    parsedBody = (await response.json()) as ApiResponse<TData>;
  }

  if (!response.ok) {
    if (parsedBody && !parsedBody.success) {
      throw new ApiClientError({
        status: response.status,
        code: parsedBody.error.code,
        message: parsedBody.error.message,
        details: parsedBody.error.details ?? null,
      });
    }

    throw new ApiClientError({
      status: response.status,
      code: 'REQUEST_FAILED',
      message: 'The API request failed.',
    });
  }

  if (!parsedBody || !parsedBody.success) {
    throw new ApiClientError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'The API returned an unexpected response shape.',
    });
  }

  return parsedBody.data;
}