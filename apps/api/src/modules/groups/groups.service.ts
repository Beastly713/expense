import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { computeGroupBalanceSnapshot } from '../balances';
import { ActivityRepository } from '../activity/activity.repository';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { SplitsRepository } from '../expenses/splits.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { SettlementsRepository } from '../settlements/settlements.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { ListGroupsDto } from './dto/list-groups.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsRepository } from './groups.repository';

@Injectable()
export class GroupsService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly expensesRepository: ExpensesRepository,
    private readonly splitsRepository: SplitsRepository,
    private readonly settlementsRepository: SettlementsRepository,
  ) {}

  async createGroup(dto: CreateGroupDto, currentUserId: string) {
    const currentUser = await this.usersRepository.findById(currentUserId);
    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Access token is invalid or expired.',
      });
    }

    const now = new Date();

    const group = await this.groupsRepository.create({
      type: dto.type ?? 'group',
      name: dto.name,
      defaultCurrency: dto.defaultCurrency,
      createdByUserId: currentUserId,
      simplifyDebts: true,
      status: 'active',
      lastActivityAt: now,
    });

    await this.membershipsRepository.create({
      groupId: group._id.toString(),
      userId: currentUser._id.toString(),
      status: 'active',
      role: 'member',
      displayNameSnapshot: currentUser.name,
      emailSnapshot: currentUser.email,
      joinedAt: now,
      invitedAt: null,
      leftAt: null,
      cachedNetBalanceMinor: 0,
    });

    await this.activityRepository.create({
      groupId: group._id.toString(),
      actorUserId: currentUser._id.toString(),
      entityType: 'group',
      entityId: group._id.toString(),
      actionType: 'group_created',
      metadata: {
        name: group.name,
        type: group.type,
        defaultCurrency: group.defaultCurrency,
      },
    });

    return {
      group: {
        id: group._id.toString(),
        name: group.name,
        type: group.type,
        defaultCurrency: group.defaultCurrency,
        createdByUserId: group.createdByUserId.toString(),
        createdAt: group.createdAt.toISOString(),
      },
    };
  }

  async listGroups(query: ListGroupsDto, currentUserId: string) {
    const activeMemberships =
      await this.membershipsRepository.findActiveByUserId(currentUserId);

    if (activeMemberships.length === 0) {
      return {
        groups: [],
      };
    }

    const membershipByGroupId = new Map(
      activeMemberships.map((membership) => [
        membership.groupId.toString(),
        membership,
      ]),
    );

    const uniqueGroupIds = Array.from(
      new Set(activeMemberships.map((membership) => membership.groupId.toString())),
    );

    const groups = await this.groupsRepository.findByIds(uniqueGroupIds);
    const requestedType = query.type ?? 'all';

    const filteredGroups = groups.filter((group) => {
      if (requestedType === 'all') {
        return true;
      }
      return group.type === requestedType;
    });

    const items = await Promise.all(
      filteredGroups.map(async (group) => {
        const allMemberships = await this.membershipsRepository.findByGroupId(
          group._id.toString(),
        );
        const memberCount = allMemberships.filter(
          (membership) => membership.status !== 'removed',
        ).length;

        const currentMembership = membershipByGroupId.get(group._id.toString());
        const netBalanceMinor = currentMembership?.cachedNetBalanceMinor ?? 0;

        return {
          id: group._id.toString(),
          name: group.name,
          type: group.type,
          defaultCurrency: group.defaultCurrency,
          memberCount,
          youOweMinor: netBalanceMinor < 0 ? Math.abs(netBalanceMinor) : 0,
          youAreOwedMinor: netBalanceMinor > 0 ? netBalanceMinor : 0,
          netBalanceMinor,
          lastActivityAt: group.lastActivityAt.toISOString(),
        };
      }),
    );

    items.sort((left, right) => {
      return (
        new Date(right.lastActivityAt).getTime() -
        new Date(left.lastActivityAt).getTime()
      );
    });

    return {
      groups: items,
    };
  }

  async getGroupDetails(groupId: string, currentUserId: string) {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    const memberships = await this.membershipsRepository.findByGroupId(groupId);
    const visibleMembers = memberships.filter(
      (membership) => membership.status !== 'removed',
    );

    const allExpenses = await this.expensesRepository.findByGroupId(groupId, true);
    const settlements = await this.settlementsRepository.findByGroupId(groupId);
    const expenseSplits = await Promise.all(
      allExpenses.map((expense) =>
        this.splitsRepository.findByExpenseId(expense._id.toString()),
      ),
    );

    const balanceSnapshot = computeGroupBalanceSnapshot({
      membershipIds: memberships.map((membership) => membership._id.toString()),
      expenses: allExpenses.map((expense) => ({
        expenseId: expense._id.toString(),
        payerMembershipId: expense.payerMembershipId.toString(),
        isDeleted: expense.isDeleted,
      })),
      splits: expenseSplits.flat().map((split) => ({
        expenseId: split.expenseId.toString(),
        membershipId: split.membershipId.toString(),
        owedShareMinor: split.owedShareMinor,
      })),
      settlements: settlements.map((settlement) => ({
        fromMembershipId: settlement.fromMembershipId.toString(),
        toMembershipId: settlement.toMembershipId.toString(),
        amountMinor: settlement.amountMinor,
      })),
    });

    return {
      group: {
        id: group._id.toString(),
        name: group.name,
        type: group.type,
        defaultCurrency: group.defaultCurrency,
        simplifyDebts: group.simplifyDebts,
      },
      members: visibleMembers.map((membership) =>
        this.mapMembershipToMemberRow(membership),
      ),
      simplifiedBalances: balanceSnapshot.simplifiedDebts,
      expenseCount: allExpenses.filter((expense) => !expense.isDeleted).length,
    };
  }

  async listGroupMembers(groupId: string, currentUserId: string) {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    const memberships = await this.membershipsRepository.findByGroupId(groupId);
    const visibleMembers = memberships.filter(
      (membership) => membership.status !== 'removed',
    );

    return {
      members: visibleMembers.map((membership) =>
        this.mapMembershipToMemberRow(membership),
      ),
    };
  }

  async updateGroup(
    groupId: string,
    dto: UpdateGroupDto,
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

    if (dto.name == null && dto.defaultCurrency == null) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'At least one editable field is required.',
      });
    }

    const updatePayload: {
      $set: {
        name?: string;
        defaultCurrency?: string;
      };
    } = {
      $set: {},
    };

    if (dto.name != null) {
      updatePayload.$set.name = dto.name;
    }

    if (dto.defaultCurrency != null) {
      updatePayload.$set.defaultCurrency = dto.defaultCurrency;
    }

    const updatedGroup = await this.groupsRepository.updateById(
      groupId,
      updatePayload,
    );

    if (!updatedGroup) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    return {
      group: {
        id: updatedGroup._id.toString(),
        name: updatedGroup.name,
        defaultCurrency: updatedGroup.defaultCurrency,
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

  private mapMembershipToMemberRow(membership: {
    _id: { toString(): string };
    userId: { toString(): string } | null;
    displayNameSnapshot: string;
    emailSnapshot: string;
    status: string;
    cachedNetBalanceMinor: number;
  }) {
    return {
      membershipId: membership._id.toString(),
      userId: membership.userId ? membership.userId.toString() : null,
      name: membership.displayNameSnapshot,
      email: membership.emailSnapshot,
      status: membership.status,
      cachedNetBalanceMinor: membership.cachedNetBalanceMinor,
    };
  }
}