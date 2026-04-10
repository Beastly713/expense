import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(params: {
    email: string;
    resetToken: string;
  }): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${params.resetToken}`;
    const fromAddress =
      this.configService.get<string>('mail.from') || 'no-reply@example.com';

    this.logger.log(
      `Password reset link for ${params.email} from ${fromAddress}: ${resetUrl}`,
    );
  }
}