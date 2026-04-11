import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { ExpensesRepository } from './expenses.repository';
import { SplitsRepository } from './splits.repository';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly splitsRepository: SplitsRepository,
    private readonly membershipsRepository: MembershipsRepository,
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
      },
      splits: splits.map((split) => ({
        membershipId: split.membershipId.toString(),
        owedShareMinor: split.owedShareMinor,
      })),
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

  private toDateOnlyString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}