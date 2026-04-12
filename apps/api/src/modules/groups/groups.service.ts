import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { calculateSplitRows } from '../balances';
import { ActivityRepository } from '../activity/activity.repository';
import { ListActivityDto } from '../activity/dto/list-activity.dto';
import { CreateGroupExpenseDto } from '../expenses/dto/create-group-expense.dto';
import { ListGroupExpensesDto } from '../expenses/dto/list-group-expenses.dto';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { SplitsRepository } from '../expenses/splits.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { ListGroupsDto } from './dto/list-groups.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupBalanceService } from './group-balance.service';
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
    private readonly notificationsRepository: NotificationsRepository,
    private readonly groupBalanceService: GroupBalanceService,
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

    const { memberships, expenses, snapshot } =
      await this.groupBalanceService.getGroupBalanceState(groupId);

    const visibleMembers = memberships.filter(
      (membership) => membership.status !== 'removed',
    );

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
      simplifiedBalances: snapshot.simplifiedDebts,
      expenseCount: expenses.filter((expense) => !expense.isDeleted).length,
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

  async getGroupActivity(
    groupId: string,
    query: ListActivityDto,
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

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } =
      await this.activityRepository.findPageByGroupId(groupId, page, limit);

    return {
      items: items.map((activity) => ({
        id: activity._id.toString(),
        actionType: activity.actionType,
        entityType: activity.entityType,
        entityId: activity.entityId.toString(),
        actorUserId: activity.actorUserId.toString(),
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async listGroupExpenses(
    groupId: string,
    query: ListGroupExpensesDto,
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

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const findExpensesParams: {
      groupId: string;
      page: number;
      limit: number;
      includeDeleted?: boolean;
      search?: string;
    } = {
      groupId,
      page,
      limit,
      includeDeleted: query.includeDeleted ?? false,
    };

    if (query.search && query.search.trim().length > 0) {
      findExpensesParams.search = query.search.trim();
    }

    const { items, total } =
      await this.expensesRepository.findPageByGroupId(findExpensesParams);

    return {
      items: items.map((expense) => ({
        id: expense._id.toString(),
        title: expense.title,
        amountMinor: expense.amountMinor,
        currency: expense.currency,
        dateIncurred: this.toDateOnlyString(expense.dateIncurred),
        payerMembershipId: expense.payerMembershipId.toString(),
        splitMethod: expense.splitMethod,
        isDeleted: expense.isDeleted,
        createdAt: expense.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async getGroupBalances(groupId: string, currentUserId: string) {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    const { snapshot } =
      await this.groupBalanceService.getGroupBalanceState(groupId);

    return {
      memberNetBalances: snapshot.netBalances,
      simplifiedBalances: snapshot.simplifiedDebts,
    };
  }

  async createExpense(
    groupId: string,
    dto: CreateGroupExpenseDto,
    currentUserId: string,
  ) {
    const [group, currentUser] = await Promise.all([
      this.groupsRepository.findById(groupId),
      this.usersRepository.findById(currentUserId),
    ]);

    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Access token is invalid or expired.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    if (dto.currency !== group.defaultCurrency) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Expense currency must match the group currency (${group.defaultCurrency}).`,
      });
    }

    const memberships = await this.membershipsRepository.findByGroupId(groupId);
    const membershipById = new Map(
      memberships.map((membership) => [membership._id.toString(), membership]),
    );

    const payerMembership = membershipById.get(dto.payerMembershipId);
    if (!payerMembership || payerMembership.status === 'removed') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Payer must be a valid active or pending group membership.',
      });
    }

    dto.splits.forEach((split) => {
      const membership = membershipById.get(split.membershipId);
      if (!membership || membership.status === 'removed') {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `Participant ${split.membershipId} is not a valid group membership.`,
        });
      }
    });

    let calculatedSplits: ReturnType<typeof calculateSplitRows>;

    try {
      calculatedSplits = calculateSplitRows({
        amountMinor: dto.amountMinor,
        splitMethod: dto.splitMethod,
        participants: dto.splits.map((split) => ({
          membershipId: split.membershipId,
          inputValue: split.inputValue ?? null,
        })),
      });
    } catch (error) {
      throw this.buildSplitValidationException(error);
    }

    const expense = await this.expensesRepository.create({
      groupId,
      createdByUserId: currentUserId,
      title: dto.title,
      notes: dto.notes ?? null,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      dateIncurred: new Date(dto.dateIncurred),
      payerMembershipId: dto.payerMembershipId,
      splitMethod: dto.splitMethod,
      participantCount: calculatedSplits.length,
      isDeleted: false,
      deletedAt: null,
      deletedByUserId: null,
      version: 1,
    });

    await this.splitsRepository.insertMany(
      calculatedSplits.map((split) => ({
        expenseId: expense._id.toString(),
        membershipId: split.membershipId,
        inputType: split.inputType,
        inputValue: split.inputValue,
        owedShareMinor: split.owedShareMinor,
      })),
    );

    await this.groupBalanceService.recomputeAndPersistGroupBalances(groupId);

    const now = new Date();

    await this.activityRepository.create({
      groupId,
      actorUserId: currentUserId,
      entityType: 'expense',
      entityId: expense._id.toString(),
      actionType: 'expense_added',
      metadata: {
        title: expense.title,
        amountMinor: expense.amountMinor,
        payerMembershipId: expense.payerMembershipId.toString(),
        splitMethod: expense.splitMethod,
      },
    });

    const notificationRows = memberships
      .filter(
        (membership) =>
          membership.status === 'active' &&
          membership.userId != null &&
          membership.userId.toString() !== currentUserId,
      )
      .map((membership) => ({
        userId: membership.userId!.toString(),
        groupId,
        type: 'expense_added' as const,
        entityType: 'expense' as const,
        entityId: expense._id.toString(),
        title: `New expense in ${group.name}`,
        body: `${currentUser.name} added ${expense.title}`,
        isRead: false,
        readAt: null,
        deliveryChannels: {
          inApp: true,
          email: false,
        },
        emailStatus: null,
      }));

    if (notificationRows.length > 0) {
      await this.notificationsRepository.createMany(notificationRows);
    }

    await this.groupsRepository.updateById(groupId, {
      $set: {
        lastActivityAt: now,
      },
    });

    return {
      expense: {
        id: expense._id.toString(),
        groupId: expense.groupId.toString(),
        title: expense.title,
        amountMinor: expense.amountMinor,
        currency: expense.currency,
        payerMembershipId: expense.payerMembershipId.toString(),
        splitMethod: expense.splitMethod,
        dateIncurred: this.toDateOnlyString(expense.dateIncurred),
        isDeleted: expense.isDeleted,
      },
      splits: calculatedSplits.map((split) => ({
        membershipId: split.membershipId,
        owedShareMinor: split.owedShareMinor,
      })),
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

  private buildSplitValidationException(error: unknown): BadRequestException {
    const message =
      error instanceof Error ? error.message : 'Expense input is invalid.';
    const code =
      message.includes('must equal amountMinor') ||
      message.includes('must equal 100')
        ? 'INVALID_SPLIT_TOTAL'
        : 'VALIDATION_ERROR';

    return new BadRequestException({
      code,
      message,
    });
  }

  private toDateOnlyString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}