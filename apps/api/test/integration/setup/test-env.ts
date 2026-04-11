export function ensureTestEnvironment(): void {
  process.env.NODE_ENV = 'test';
  process.env.PORT ??= '4001';
  process.env.FRONTEND_URL ??= 'http://localhost:3000';
  process.env.API_PREFIX ??= 'api/v1';
  process.env.SWAGGER_PATH ??= 'api/docs';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
  process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';
  process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
  process.env.MAIL_FROM ??= 'test@example.com';

  const explicitTestUri = process.env.MONGODB_URI_TEST?.trim();
  const currentMongoUri = process.env.MONGODB_URI?.trim();

  const resolvedMongoUri =
    explicitTestUri && explicitTestUri.length > 0
      ? explicitTestUri
      : currentMongoUri && currentMongoUri.includes('test')
        ? currentMongoUri
        : 'mongodb://127.0.0.1:27017/splitwise_api_test';

  process.env.MONGODB_URI = resolvedMongoUri;

  if (!process.env.MONGODB_URI.includes('test')) {
    throw new Error(
      `Refusing to run integration tests against a non-test Mongo URI: ${process.env.MONGODB_URI}`,
    );
  }
}