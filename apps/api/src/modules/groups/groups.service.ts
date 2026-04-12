import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  buildDebtAmountLookup,
  calculateSplitRows,
  validateSettlementAgainstDebtLookup,
} from '../balances';
import { ActivityRepository } from '../activity/activity.repository';
import { ListActivityDto } from '../activity/dto/list-activity.dto';
import { CreateGroupExpenseDto } from '../expenses/dto/create-group-expense.dto';
import { ListGroupExpensesDto } from '../expenses/dto/list-group-expenses.dto';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { SplitsRepository } from '../expenses/splits.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { SettlementsRepository } from '../settlements/settlements.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateGroupSettlementDto } from './dto/create-group-settlement.dto';
import { CreateDirectGroupDto } from './dto/create-direct-group.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { ListGroupSettlementsDto } from './dto/list-group-settlements.dto';
import { ListGroupsDto } from './dto/list-groups.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupBalanceService } from './group-balance.service';
import { GroupsRepository } from './groups.repository';
import type { GroupDocument } from './group.schema';

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
    private readonly settlementsRepository: SettlementsRepository,
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

  async createDirectGroup(dto: CreateDirectGroupDto, currentUserId: string) {
    const [currentUser, targetUser] = await Promise.all([
      this.usersRepository.findById(currentUserId),
      this.usersRepository.findByEmail(dto.email),
    ]);

    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Access token is invalid or expired.',
      });
    }

    if (dto.email === currentUser.email.toLowerCase()) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'You cannot create a direct ledger with yourself.',
      });
    }

    if (!targetUser) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found for direct ledger.',
      });
    }

    const existingDirectGroup = await this.findExistingDirectGroup(
      currentUser._id.toString(),
      targetUser._id.toString(),
    );

    if (existingDirectGroup) {
      return {
        group: {
          id: existingDirectGroup._id.toString(),
          name: existingDirectGroup.name,
          type: existingDirectGroup.type,
          defaultCurrency: existingDirectGroup.defaultCurrency,
          createdByUserId: existingDirectGroup.createdByUserId.toString(),
          createdAt: existingDirectGroup.createdAt.toISOString(),
        },
      };
    }

    const now = new Date();
    const groupName = this.buildDirectGroupName(currentUser.name, targetUser.name);

    const directGroup = await this.groupsRepository.create({
      type: 'direct',
      name: groupName,
      defaultCurrency: currentUser.defaultCurrency,
      createdByUserId: currentUserId,
      simplifyDebts: true,
      status: 'active',
      lastActivityAt: now,
    });

    await this.membershipsRepository.createMany([
      {
        groupId: directGroup._id.toString(),
        userId: currentUser._id.toString(),
        status: 'active',
        role: 'member',
        displayNameSnapshot: currentUser.name,
        emailSnapshot: currentUser.email,
        joinedAt: now,
        invitedAt: null,
        leftAt: null,
        cachedNetBalanceMinor: 0,
      },
      {
        groupId: directGroup._id.toString(),
        userId: targetUser._id.toString(),
        status: 'active',
        role: 'member',
        displayNameSnapshot: targetUser.name,
        emailSnapshot: targetUser.email,
        joinedAt: now,
        invitedAt: null,
        leftAt: null,
        cachedNetBalanceMinor: 0,
      },
    ]);

    await this.activityRepository.create({
      groupId: directGroup._id.toString(),
      actorUserId: currentUserId,
      entityType: 'group',
      entityId: directGroup._id.toString(),
      actionType: 'group_created',
      metadata: {
        name: directGroup.name,
        type: directGroup.type,
        defaultCurrency: directGroup.defaultCurrency,
      },
    });

    return {
      group: {
        id: directGroup._id.toString(),
        name: directGroup.name,
        type: directGroup.type,
        defaultCurrency: directGroup.defaultCurrency,
        createdByUserId: directGroup.createdByUserId.toString(),
        createdAt: directGroup.createdAt.toISOString(),
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

  async listGroupSettlements(
    groupId: string,
    query: ListGroupSettlementsDto,
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
      await this.settlementsRepository.findPageByGroupId(groupId, page, limit);

    return {
      items: items.map((settlement) => ({
        id: settlement._id.toString(),
        fromMembershipId: settlement.fromMembershipId.toString(),
        toMembershipId: settlement.toMembershipId.toString(),
        amountMinor: settlement.amountMinor,
        currency: settlement.currency,
        method: settlement.method,
        note: settlement.note,
        settledAt: settlement.settledAt.toISOString(),
        createdAt: settlement.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async createSettlement(
    groupId: string,
    dto: CreateGroupSettlementDto,
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
        message: `Settlement currency must match the group currency (${group.defaultCurrency}).`,
      });
    }

    const memberships = await this.membershipsRepository.findByGroupId(groupId);
    const membershipById = new Map(
      memberships.map((membership) => [membership._id.toString(), membership] as const),
    );

    const fromMembership = membershipById.get(dto.fromMembershipId);
    const toMembership = membershipById.get(dto.toMembershipId);

    if (
      !fromMembership ||
      !toMembership ||
      fromMembership.status === 'removed' ||
      toMembership.status === 'removed'
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          'Settlement memberships must be valid active or pending group memberships.',
      });
    }

    const { snapshot } =
      await this.groupBalanceService.getGroupBalanceState(groupId);

    try {
      const debtAmountLookup = buildDebtAmountLookup(
        snapshot.normalizedDebtEdges,
      );

      validateSettlementAgainstDebtLookup(
        {
          fromMembershipId: dto.fromMembershipId,
          toMembershipId: dto.toMembershipId,
          amountMinor: dto.amountMinor,
        },
        debtAmountLookup,
      );
    } catch (error) {
      throw this.buildSettlementValidationException(error);
    }

    const now = new Date();

    const settlement = await this.settlementsRepository.create({
      groupId,
      fromMembershipId: dto.fromMembershipId,
      toMembershipId: dto.toMembershipId,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      method: dto.method,
      note: dto.note ?? null,
      createdByUserId: currentUserId,
      settledAt: now,
    });

    await this.groupBalanceService.recomputeAndPersistGroupBalances(groupId);

    await this.activityRepository.create({
      groupId,
      actorUserId: currentUserId,
      entityType: 'settlement',
      entityId: settlement._id.toString(),
      actionType: 'settlement_recorded',
      metadata: {
        amountMinor: settlement.amountMinor,
        fromMembershipId: settlement.fromMembershipId.toString(),
        toMembershipId: settlement.toMembershipId.toString(),
        method: settlement.method,
        note: settlement.note,
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
        type: 'settlement_recorded' as const,
        entityType: 'settlement' as const,
        entityId: settlement._id.toString(),
        title: `Settlement recorded in ${group.name}`,
        body: `${currentUser.name} recorded a cash settlement`,
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
      settlement: {
        id: settlement._id.toString(),
        groupId: settlement.groupId.toString(),
        fromMembershipId: settlement.fromMembershipId.toString(),
        toMembershipId: settlement.toMembershipId.toString(),
        amountMinor: settlement.amountMinor,
        currency: settlement.currency,
        method: settlement.method,
        note: settlement.note,
        settledAt: settlement.settledAt.toISOString(),
      },
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

  private async findExistingDirectGroup(
    currentUserId: string,
    targetUserId: string,
  ): Promise<GroupDocument | null> {
    const [currentUserMemberships, targetUserMemberships] = await Promise.all([
      this.membershipsRepository.findActiveByUserId(currentUserId),
      this.membershipsRepository.findActiveByUserId(targetUserId),
    ]);

    if (
      currentUserMemberships.length === 0 ||
      targetUserMemberships.length === 0
    ) {
      return null;
    }

    const currentUserGroupIds = new Set(
      currentUserMemberships.map((membership) => membership.groupId.toString()),
    );

    const candidateGroupIds = Array.from(
      new Set(
        targetUserMemberships
          .map((membership) => membership.groupId.toString())
          .filter((groupId) => currentUserGroupIds.has(groupId)),
      ),
    );

    if (candidateGroupIds.length === 0) {
      return null;
    }

    const candidateGroups = await this.groupsRepository.findByIds(candidateGroupIds);

    for (const group of candidateGroups) {
      if (group.type !== 'direct') {
        continue;
      }

      const memberships = await this.membershipsRepository.findByGroupId(
        group._id.toString(),
      );

      const activeMemberships = memberships.filter(
        (membership) => membership.status === 'active',
      );

      if (activeMemberships.length !== 2) {
        continue;
      }

      const activeUserIds = activeMemberships
        .map((membership) => membership.userId?.toString() ?? null)
        .filter((value): value is string => value != null)
        .sort();

      const expectedUserIds = [currentUserId, targetUserId].sort();

      if (
        activeUserIds.length === 2 &&
        activeUserIds[0] === expectedUserIds[0] &&
        activeUserIds[1] === expectedUserIds[1]
      ) {
        return group;
      }
    }

    return null;
  }

  private buildDirectGroupName(
    currentUserName: string,
    targetUserName: string,
  ): string {
    return `${currentUserName} & ${targetUserName}`;
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

  private buildSettlementValidationException(
    error: unknown,
  ): BadRequestException {
    const message =
      error instanceof Error ? error.message : 'Settlement input is invalid.';

    const code =
      message.includes('current owed amount') ||
      message.includes('current debt relation') ||
      message.includes('cannot be the same')
        ? 'INVALID_SETTLEMENT_AMOUNT'
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