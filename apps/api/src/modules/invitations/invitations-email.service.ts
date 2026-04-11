import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvitationsEmailService {
  private readonly logger = new Logger(InvitationsEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendGroupInviteEmail(params: {
    email: string;
    groupName: string;
    inviteToken: string;
  }): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ??
      'http://localhost:3000';

    const inviteUrl = `${frontendUrl}/invite/${params.inviteToken}`;

    this.logger.log(
      `Invite link for ${params.email} to group "${params.groupName}": ${inviteUrl}`,
    );
  }
}