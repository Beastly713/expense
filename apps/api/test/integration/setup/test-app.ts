/// <reference types="jest" />
import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from '../../../src/app.module';
import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from '../../../src/common/interceptors/response.interceptor';
import { ensureTestEnvironment } from './test-env';

export interface TestAppContext {
  app: INestApplication;
  connection: Connection;
  apiPrefix: string;
}

export async function createTestApp(): Promise<TestAppContext> {
  ensureTestEnvironment();

  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = testingModule.createNestApplication();
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();

  const connection = app.get<Connection>(getConnectionToken());

  if (!connection.db) {
    throw new Error('Mongo database connection is not available for tests.');
  }

  return {
    app,
    connection,
    apiPrefix,
  };
}

export async function clearDatabase(connection: Connection): Promise<void> {
  if (!connection.db) {
    throw new Error('Mongo database connection is not available for cleanup.');
  }

  await connection.db.dropDatabase();
}

export async function closeTestApp(
  app?: INestApplication | null,
): Promise<void> {
  if (!app) {
    return;
  }

  await app.close();
}

export function apiPath(apiPrefix: string, path: string): string {
  const normalizedPrefix = apiPrefix.startsWith('/')
    ? apiPrefix
    : `/${apiPrefix}`;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedPrefix}${normalizedPath}`;
}