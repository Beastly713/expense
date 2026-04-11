import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import type { AuthenticatedRequestUser } from '../../common/types/authenticated-request-user';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('invites')
export class InviteAcceptanceController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post(':token/accept')
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.invitationsService.acceptInvite(token, currentUser.userId);
  }
}