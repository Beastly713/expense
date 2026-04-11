import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import type { AuthenticatedRequestUser } from '../../common/types/authenticated-request-user';
import { CreateGroupInvitesDto } from './dto/create-group-invites.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('groups/:groupId/invites')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  createInvites(
    @Param('groupId') groupId: string,
    @Body() dto: CreateGroupInvitesDto,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.invitationsService.createInvites(
      groupId,
      dto,
      currentUser.userId,
    );
  }

  @Get()
  listInvites(
    @Param('groupId') groupId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.invitationsService.listPendingInvites(
      groupId,
      currentUser.userId,
    );
  }

  @Post(':invitationId/resend')
  resendInvite(
    @Param('groupId') groupId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.invitationsService.resendInvite(
      groupId,
      invitationId,
      currentUser.userId,
    );
  }

  @Delete(':invitationId')
  cancelInvite(
    @Param('groupId') groupId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.invitationsService.cancelInvite(
      groupId,
      invitationId,
      currentUser.userId,
    );
  }
}