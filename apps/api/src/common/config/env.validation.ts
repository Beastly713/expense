import {
  DEFAULT_API_PREFIX,
  DEFAULT_FRONTEND_URL,
  DEFAULT_PORT,
  DEFAULT_SWAGGER_PATH,
} from '../constants/api.constants';

const ALLOWED_NODE_ENVS = ['development', 'test', 'production'] as const;

export function validateEnv(rawConfig: Record<string, unknown>): Record<string, unknown> {
  const config = { ...rawConfig };

  const port = config.PORT;
  const parsedPort =
    typeof port === 'string' && port.trim().length > 0 ? Number(port) : DEFAULT_PORT;

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  config.PORT = parsedPort;

  const nodeEnv = String(config.NODE_ENV ?? 'development');

  if (!ALLOWED_NODE_ENVS.includes(nodeEnv as (typeof ALLOWED_NODE_ENVS)[number])) {
    throw new Error('NODE_ENV must be one of: development, test, production.');
  }

  config.NODE_ENV = nodeEnv;
  config.FRONTEND_URL =
    typeof config.FRONTEND_URL === 'string' && config.FRONTEND_URL.trim().length > 0
      ? config.FRONTEND_URL
      : DEFAULT_FRONTEND_URL;

  config.API_PREFIX =
    typeof config.API_PREFIX === 'string' && config.API_PREFIX.trim().length > 0
      ? config.API_PREFIX
      : DEFAULT_API_PREFIX;

  config.SWAGGER_PATH =
    typeof config.SWAGGER_PATH === 'string' && config.SWAGGER_PATH.trim().length > 0
      ? config.SWAGGER_PATH
      : DEFAULT_SWAGGER_PATH;

  return config;
}