import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import {
  DEFAULT_API_PREFIX,
  DEFAULT_FRONTEND_URL,
  DEFAULT_PORT,
  DEFAULT_SWAGGER_PATH,
} from './common/constants/api.constants';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = configService.get<number>('app.port') ?? DEFAULT_PORT;
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? DEFAULT_API_PREFIX;
  const swaggerPath = configService.get<string>('app.swaggerPath') ?? DEFAULT_SWAGGER_PATH;
  const frontendUrl =
    configService.get<string>('app.frontendUrl') ?? DEFAULT_FRONTEND_URL;

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Splitwise Clone API')
    .setDescription('Baseline API setup for the expense-sharing MVP.')
    .setVersion('1.0.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, swaggerDocument, {
    customSiteTitle: 'Splitwise Clone API Docs',
  });

  await app.listen(port);

  logger.log(`API running at http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger running at http://localhost:${port}/${swaggerPath}`);
}

void bootstrap();