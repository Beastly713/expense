import { registerAs } from '@nestjs/config';

import {
  DEFAULT_API_PREFIX,
  DEFAULT_FRONTEND_URL,
  DEFAULT_PORT,
  DEFAULT_SWAGGER_PATH,
} from '../common/constants/api.constants';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  frontendUrl: process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL,
  apiPrefix: process.env.API_PREFIX ?? DEFAULT_API_PREFIX,
  swaggerPath: process.env.SWAGGER_PATH ?? DEFAULT_SWAGGER_PATH,
}));