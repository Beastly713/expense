const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  'http://localhost:4000/api/v1';

const appName =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Splitwise Clone';

export const env = {
  apiBaseUrl,
  appName,
} as const;