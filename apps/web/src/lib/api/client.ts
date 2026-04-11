import { env } from '@/lib/env';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string | null;
}

interface ApiEnvelopeSuccess<TData> {
  success: true;
  data: TData;
}

interface ApiEnvelopeError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
}

type ApiEnvelope<TData> = ApiEnvelopeSuccess<TData> | ApiEnvelopeError;

export class ApiError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown> | null | undefined;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown> | null;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}

export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TData> {
  const headers = new Headers({
    Accept: 'application/json',
  });

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  const requestInit: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    cache: 'no-store',
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, requestInit);

  let payload: ApiEnvelope<TData> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<TData>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (payload && !payload.success) {
      throw new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        status: response.status,
        details: payload.error.details ?? null,
      });
    }

    throw new ApiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Request failed.',
      status: response.status,
      details: null,
    });
  }

  if (!payload || !payload.success) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Invalid API response.',
      status: response.status,
      details: null,
    });
  }

  return payload.data;
}