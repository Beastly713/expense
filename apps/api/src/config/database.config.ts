import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  mongoUri: process.env.MONGODB_URI ?? '',
}));