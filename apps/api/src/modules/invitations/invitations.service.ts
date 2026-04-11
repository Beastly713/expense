import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ActivityRepository } from '../activity/activity.repository';
import { GroupsRepository } from '../groups/groups.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateGroupInvitesDto } from './dto/create-group-invites.dto';
import { InvitationsEmailService } from './invitations-email.service';
import { InvitationsRepository } from './invitations.repository';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationsRepository: InvitationsRepository,
    private readonly invitationsEmailService: InvitationsEmailService,
    private readonly groupsRepository: GroupsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async createInvites(
    groupId: string,
    dto: CreateGroupInvitesDto,
    currentUserId: string,
  ) {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    const createdInvites = [];

    for (const rawEmail of dto.emails) {
      const email = this.normalizeEmail(rawEmail);

      const existingActiveMembership =
        await this.membershipsRepository.findActiveByGroupIdAndEmailSnapshot(
          groupId,
          email,
        );

      if (existingActiveMembership) {
        throw new ConflictException({
          code: 'ALREADY_MEMBER',
          message: `${email} is already an active member of this group.`,
        });
      }

      const existingPendingInvitation =
        await this.invitationsRepository.findPendingByGroupIdAndEmail(
          groupId,
          email,
        );

      if (existingPendingInvitation) {
        throw new ConflictException({
          code: 'ALREADY_INVITED',
          message: `${email} already has a pending invite for this group.`,
        });
      }

      const now = new Date();
      const token = this.generateInviteToken();
      const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

      const invitation = await this.invitationsRepository.create({
        groupId,
        email,
        invitedByUserId: currentUserId,
        token,
        status: 'pending',
        membershipId: null,
        acceptedAt: null,
        expiresAt,
      });

      const pendingMembership = await this.membershipsRepository.create({
        groupId,
        userId: null,
        invitationId: invitation._id.toString(),
        status: 'pending',
        role: 'member',
        displayNameSnapshot: email,
        emailSnapshot: email,
        joinedAt: null,
        invitedAt: now,
        leftAt: null,
        cachedNetBalanceMinor: 0,
      });

      await this.invitationsRepository.updateById(invitation._id.toString(), {
        $set: {
          membershipId: pendingMembership._id,
        },
      });

      await this.activityRepository.create({
        groupId,
        actorUserId: currentUserId,
        entityType: 'invitation',
        entityId: invitation._id.toString(),
        actionType: 'member_invited',
        metadata: {
          email,
          membershipId: pendingMembership._id.toString(),
        },
      });

      await this.groupsRepository.updateById(groupId, {
        $set: {
          lastActivityAt: now,
        },
      });

      await this.invitationsEmailService.sendGroupInviteEmail({
        email,
        groupName: group.name,
        inviteToken: token,
      });

      createdInvites.push({
        invitationId: invitation._id.toString(),
        email: invitation.email,
        status: invitation.status,
        membershipId: pendingMembership._id.toString(),
      });
    }

    return {
      invites: createdInvites,
    };
  }

  async listPendingInvites(groupId: string, currentUserId: string) {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    const invites = await this.invitationsRepository.findPendingByGroupId(groupId);

    return {
      invites: invites.map((invite) => ({
        invitationId: invite._id.toString(),
        email: invite.email,
        status: invite.status,
        invitedAt: invite.createdAt.toISOString(),
      })),
    };
  }

  async resendInvite(
    groupId: string,
    invitationId: string,
    currentUserId: string,
  ) {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    const invitation = await this.invitationsRepository.findById(invitationId);
    if (!invitation || invitation.groupId.toString() !== groupId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Invite not found.',
      });
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Only pending invites can be resent.',
      });
    }

    const nextToken = this.generateInviteToken();
    const nextExpiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const updatedInvitation = await this.invitationsRepository.updateById(
      invitationId,
      {
        $set: {
          token: nextToken,
          expiresAt: nextExpiresAt,
        },
      },
    );

    if (!updatedInvitation) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Invite not found.',
      });
    }

    await this.invitationsEmailService.sendGroupInviteEmail({
      email: updatedInvitation.email,
      groupName: group.name,
      inviteToken: nextToken,
    });

    return {
      message: 'Invite resent successfully',
    };
  }

  async cancelInvite(
    groupId: string,
    invitationId: string,
    currentUserId: string,
  ) {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    const invitation = await this.invitationsRepository.findById(invitationId);
    if (!invitation || invitation.groupId.toString() !== groupId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Invite not found.',
      });
    }

    if (invitation.status === 'accepted') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Accepted invites cannot be cancelled.',
      });
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Only pending invites can be cancelled.',
      });
    }

    const now = new Date();

    await this.invitationsRepository.updateById(invitationId, {
      $set: {
        status: 'cancelled',
      },
    });

    if (invitation.membershipId) {
      const pendingMembership = await this.membershipsRepository.findById(
        invitation.membershipId.toString(),
      );

      if (pendingMembership && pendingMembership.status === 'pending') {
        await this.membershipsRepository.updateById(
          pendingMembership._id.toString(),
          {
            $set: {
              status: 'removed',
              leftAt: now,
            },
          },
        );
      }
    }

    return {
      message: 'Invite cancelled successfully',
    };
  }

  async acceptInvite(token: string, currentUserId: string) {
    const currentUser = await this.usersRepository.findById(currentUserId);
    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required.',
      });
    }

    const invitation = await this.invitationsRepository.findByToken(token);
    if (!invitation) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Invite token is invalid.',
      });
    }

    if (invitation.status === 'accepted') {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Invite has already been accepted.',
      });
    }

    if (invitation.status === 'expired') {
      throw new BadRequestException({
        code: 'EXPIRED_TOKEN',
        message: 'Invite has expired.',
      });
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Invite token is invalid.',
      });
    }

    if (
      invitation.expiresAt &&
      invitation.expiresAt.getTime() < Date.now()
    ) {
      await this.invitationsRepository.updateById(invitation._id.toString(), {
        $set: {
          status: 'expired',
        },
      });

      throw new BadRequestException({
        code: 'EXPIRED_TOKEN',
        message: 'Invite has expired.',
      });
    }

    const normalizedUserEmail = this.normalizeEmail(currentUser.email);
    const normalizedInviteEmail = this.normalizeEmail(invitation.email);

    if (normalizedUserEmail !== normalizedInviteEmail) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Invite email does not match the logged-in account.',
      });
    }

    const groupId = invitation.groupId.toString();
    const group = await this.groupsRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    const existingActiveMembership =
      await this.membershipsRepository.findActiveByGroupIdAndUserId(
        groupId,
        currentUserId,
      );

    if (existingActiveMembership) {
      throw new ConflictException({
        code: 'ALREADY_MEMBER',
        message: 'You are already an active member of this group.',
      });
    }

    const pendingMembership = invitation.membershipId
      ? await this.membershipsRepository.findById(
          invitation.membershipId.toString(),
        )
      : await this.membershipsRepository.findByInvitationId(
          invitation._id.toString(),
        );

    if (!pendingMembership) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Invite token is invalid.',
      });
    }

    if (pendingMembership.status === 'active') {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Invite has already been accepted.',
      });
    }

    if (pendingMembership.status !== 'pending') {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Invite token is invalid.',
      });
    }

    const now = new Date();

    const updatedMembership = await this.membershipsRepository.updateById(
      pendingMembership._id.toString(),
      {
        $set: {
          userId: currentUserId,
          status: 'active',
          displayNameSnapshot: currentUser.name,
          emailSnapshot: normalizedUserEmail,
          joinedAt: now,
          leftAt: null,
        },
      },
    );

    if (!updatedMembership) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Invite token is invalid.',
      });
    }

    await this.invitationsRepository.updateById(invitation._id.toString(), {
      $set: {
        status: 'accepted',
        acceptedAt: now,
        membershipId: updatedMembership._id,
      },
    });

    await this.activityRepository.create({
      groupId,
      actorUserId: currentUserId,
      entityType: 'invitation',
      entityId: invitation._id.toString(),
      actionType: 'invite_accepted',
      metadata: {
        email: normalizedUserEmail,
        membershipId: updatedMembership._id.toString(),
        acceptedByUserId: currentUserId,
      },
    });

    await this.groupsRepository.updateById(groupId, {
      $set: {
        lastActivityAt: now,
      },
    });

    return {
      group: {
        id: group._id.toString(),
        name: group.name,
      },
      membership: {
        membershipId: updatedMembership._id.toString(),
        status: updatedMembership.status,
      },
    };
  }

  private async assertActiveGroupMembership(
    groupId: string,
    userId: string,
  ): Promise<void> {
    const membership =
      await this.membershipsRepository.findActiveByGroupIdAndUserId(
        groupId,
        userId,
      );

    if (!membership) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this group.',
      });
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateInviteToken(): string {
    return randomBytes(24).toString('hex');
  }
}