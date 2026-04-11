import { Injectable } from '@nestjs/common';
import { computeGroupBalanceSnapshot } from '../balances';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { SplitsRepository } from '../expenses/splits.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { SettlementsRepository } from '../settlements/settlements.repository';

@Injectable()
export class GroupBalanceService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly expensesRepository: ExpensesRepository,
    private readonly splitsRepository: SplitsRepository,
    private readonly settlementsRepository: SettlementsRepository,
  ) {}

  async getGroupBalanceState(groupId: string) {
    const memberships = await this.membershipsRepository.findByGroupId(groupId);
    const expenses = await this.expensesRepository.findByGroupId(groupId, true);
    const settlements = await this.settlementsRepository.findByGroupId(groupId);

    const splitGroups = await Promise.all(
      expenses.map((expense) =>
        this.splitsRepository.findByExpenseId(expense._id.toString()),
      ),
    );

    const snapshot = computeGroupBalanceSnapshot({
      membershipIds: memberships.map((membership) => membership._id.toString()),
      expenses: expenses.map((expense) => ({
        expenseId: expense._id.toString(),
        payerMembershipId: expense.payerMembershipId.toString(),
        isDeleted: expense.isDeleted,
      })),
      splits: splitGroups.flat().map((split) => ({
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
      memberships,
      expenses,
      settlements,
      snapshot,
    };
  }

  async recomputeAndPersistGroupBalances(groupId: string) {
    const { memberships, snapshot } =
      await this.getGroupBalanceState(groupId);

    const netBalanceByMembershipId = new Map(
      snapshot.netBalances.map((row) => [row.membershipId, row.netBalanceMinor]),
    );

    await Promise.all(
      memberships.map((membership) =>
        this.membershipsRepository.updateById(membership._id.toString(), {
          $set: {
            cachedNetBalanceMinor:
              netBalanceByMembershipId.get(membership._id.toString()) ?? 0,
          },
        }),
      ),
    );

    return snapshot;
  }
}