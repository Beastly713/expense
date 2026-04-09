import { env } from '../env';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string | null;
  headers?: HeadersInit;
}

interface ApiErrorShape {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown> | null;
  readonly status: number;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const payload = (await response.json()) as
    | { success: true; data: TResponse }
    | ApiErrorShape;

  if (!response.ok || payload.success === false) {
    const errorPayload =
      payload && 'error' in payload
        ? payload.error
        : {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Request failed.',
            details: null,
          };

    throw new ApiError({
      status: response.status,
      code: errorPayload.code,
      message: errorPayload.message,
      details: errorPayload.details ?? null,
    });
  }

  return payload.data;
}