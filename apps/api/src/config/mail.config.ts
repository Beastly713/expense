import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  from: process.env.MAIL_FROM ?? '',
  host: process.env.SMTP_HOST ?? '',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null,
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
}));