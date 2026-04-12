import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { calculateSplitRows } from '../balances';
import { ActivityRepository } from '../activity/activity.repository';
import { GroupBalanceService } from '../groups/group-balance.service';
import { GroupsRepository } from '../groups/groups.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { UsersRepository } from '../users/users.repository';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesRepository } from './expenses.repository';
import { SplitsRepository } from './splits.repository';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly splitsRepository: SplitsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly groupsRepository: GroupsRepository,
    private readonly groupBalanceService: GroupBalanceService,
    private readonly activityRepository: ActivityRepository,
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async getExpenseDetails(expenseId: string, currentUserId: string) {
    const expense = await this.expensesRepository.findById(expenseId);
    if (!expense) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Expense not found.',
      });
    }

    await this.assertActiveGroupMembership(
      expense.groupId.toString(),
      currentUserId,
    );

    const splits = await this.splitsRepository.findByExpenseId(expenseId);

    return {
      expense: {
        id: expense._id.toString(),
        groupId: expense.groupId.toString(),
        title: expense.title,
        notes: expense.notes,
        amountMinor: expense.amountMinor,
        currency: expense.currency,
        dateIncurred: this.toDateOnlyString(expense.dateIncurred),
        payerMembershipId: expense.payerMembershipId.toString(),
        splitMethod: expense.splitMethod,
        isDeleted: expense.isDeleted,
        version: expense.version,
        updatedAt: expense.updatedAt.toISOString(),
      },
      splits: splits.map((split) => ({
        membershipId: split.membershipId.toString(),
        inputType: split.inputType,
        inputValue: split.inputValue,
        owedShareMinor: split.owedShareMinor,
      })),
    };
  }

  async updateExpense(
    expenseId: string,
    dto: UpdateExpenseDto,
    currentUserId: string,
  ) {
    const expense = await this.expensesRepository.findById(expenseId);
    if (!expense) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Expense not found.',
      });
    }

    if (expense.isDeleted) {
      throw new BadRequestException({
        code: 'EXPENSE_ALREADY_DELETED',
        message: 'Deleted expenses cannot be edited.',
      });
    }

    const groupId = expense.groupId.toString();

    const [currentUser, group, memberships, existingSplits] = await Promise.all([
      this.usersRepository.findById(currentUserId),
      this.groupsRepository.findById(groupId),
      this.membershipsRepository.findByGroupId(groupId),
      this.splitsRepository.findByExpenseId(expenseId),
    ]);

    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Access token is invalid or expired.',
      });
    }

    if (!group) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      });
    }

    await this.assertActiveGroupMembership(groupId, currentUserId);

    if (dto.currency !== group.defaultCurrency) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Expense currency must match the group currency (${group.defaultCurrency}).`,
      });
    }

    const membershipById = new Map(
      memberships.map((membership) => [membership._id.toString(), membership] as const),
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

    const updatedExpense = await this.expensesRepository.updateById(expenseId, {
      $set: {
        title: dto.title,
        notes: dto.notes ?? null,
        amountMinor: dto.amountMinor,
        currency: dto.currency,
        dateIncurred: new Date(dto.dateIncurred),
        payerMembershipId: dto.payerMembershipId,
        splitMethod: dto.splitMethod,
        participantCount: calculatedSplits.length,
      },
      $inc: {
        version: 1,
      },
    });

    if (!updatedExpense) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Expense not found.',
      });
    }

    await this.splitsRepository.deleteManyByExpenseId(expenseId);
    await this.splitsRepository.insertMany(
      calculatedSplits.map((split) => ({
        expenseId,
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
      entityId: expenseId,
      actionType: 'expense_edited',
      metadata: {
        before: {
          title: expense.title,
          amountMinor: expense.amountMinor,
          dateIncurred: this.toDateOnlyString(expense.dateIncurred),
          payerMembershipId: expense.payerMembershipId.toString(),
          splitMethod: expense.splitMethod,
          participantCount: expense.participantCount,
          splits: existingSplits.map((split) => ({
            membershipId: split.membershipId.toString(),
            inputType: split.inputType,
            inputValue: split.inputValue,
            owedShareMinor: split.owedShareMinor,
          })),
        },
        after: {
          title: updatedExpense.title,
          amountMinor: updatedExpense.amountMinor,
          dateIncurred: this.toDateOnlyString(updatedExpense.dateIncurred),
          payerMembershipId: updatedExpense.payerMembershipId.toString(),
          splitMethod: updatedExpense.splitMethod,
          participantCount: updatedExpense.participantCount,
          splits: calculatedSplits.map((split) => ({
            membershipId: split.membershipId,
            inputType: split.inputType,
            inputValue: split.inputValue,
            owedShareMinor: split.owedShareMinor,
          })),
        },
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
        type: 'expense_edited' as const,
        entityType: 'expense' as const,
        entityId: expenseId,
        title: `Expense updated in ${group.name}`,
        body: `${currentUser.name} edited ${updatedExpense.title}`,
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
        id: updatedExpense._id.toString(),
        title: updatedExpense.title,
        amountMinor: updatedExpense.amountMinor,
        splitMethod: updatedExpense.splitMethod,
        updatedAt: updatedExpense.updatedAt.toISOString(),
        version: updatedExpense.version,
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
        message: 'You do not have access to this expense.',
      });
    }
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