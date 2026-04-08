const DEFAULT_APP_NAME = 'Splitwise Clone';

export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? DEFAULT_APP_NAME,
};

export function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!value) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is missing. Copy apps/web/.env.example to apps/web/.env.local.',
    );
  }

  return value;
}