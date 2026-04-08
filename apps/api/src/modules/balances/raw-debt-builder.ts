import type {
  RawDebtBuilderExpenseInput,
  RawDebtBuilderSplitInput,
  RawDebtEdge,
} from './types';

function assertInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
}

function assertNonNegativeInteger(value: number, fieldName: string): void {
  assertInteger(value, fieldName);

  if (value < 0) {
    throw new Error(`${fieldName} must be greater than or equal to 0.`);
  }
}

function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function validateExpenses(
  expenses: readonly RawDebtBuilderExpenseInput[],
): void {
  const seenExpenseIds = new Set<string>();

  expenses.forEach((expense, index) => {
    assertNonEmptyString(expense.expenseId, `expenses[${index}].expenseId`);
    assertNonEmptyString(
      expense.payerMembershipId,
      `expenses[${index}].payerMembershipId`,
    );

    if (typeof expense.isDeleted !== 'boolean') {
      throw new Error(`expenses[${index}].isDeleted must be a boolean.`);
    }

    if (seenExpenseIds.has(expense.expenseId)) {
      throw new Error(`Duplicate expenseId found: ${expense.expenseId}.`);
    }

    seenExpenseIds.add(expense.expenseId);
  });
}

function validateSplits(splits: readonly RawDebtBuilderSplitInput[]): void {
  splits.forEach((split, index) => {
    assertNonEmptyString(split.expenseId, `splits[${index}].expenseId`);
    assertNonEmptyString(split.membershipId, `splits[${index}].membershipId`);
    assertNonNegativeInteger(
      split.owedShareMinor,
      `splits[${index}].owedShareMinor`,
    );
  });
}

function buildDebtKey(
  fromMembershipId: string,
  toMembershipId: string,
): string {
  return `${fromMembershipId}::${toMembershipId}`;
}

export function buildRawDebtEdges(
  expenses: readonly RawDebtBuilderExpenseInput[],
  splits: readonly RawDebtBuilderSplitInput[],
): RawDebtEdge[] {
  validateExpenses(expenses);
  validateSplits(splits);

  const expenseById = new Map(
    expenses.map((expense) => [expense.expenseId, expense] as const),
  );

  const splitsByExpenseId = new Map<string, RawDebtBuilderSplitInput[]>();

  splits.forEach((split) => {
    const expense = expenseById.get(split.expenseId);

    if (!expense) {
      throw new Error(`Split references unknown expenseId: ${split.expenseId}.`);
    }

    const existingSplits = splitsByExpenseId.get(split.expenseId) ?? [];

    if (
      existingSplits.some(
        (existingSplit) => existingSplit.membershipId === split.membershipId,
      )
    ) {
      throw new Error(
        `Duplicate split membershipId found for expenseId ${split.expenseId}: ${split.membershipId}.`,
      );
    }

    existingSplits.push(split);
    splitsByExpenseId.set(split.expenseId, existingSplits);
  });

  const aggregatedDebtAmounts = new Map<string, RawDebtEdge>();

  expenses.forEach((expense) => {
    if (expense.isDeleted) {
      return;
    }

    const expenseSplits = splitsByExpenseId.get(expense.expenseId) ?? [];

    if (expenseSplits.length === 0) {
      throw new Error(
        `Active expense must have at least one split: ${expense.expenseId}.`,
      );
    }

    expenseSplits.forEach((split) => {
      if (split.membershipId === expense.payerMembershipId) {
        return;
      }

      if (split.owedShareMinor === 0) {
        return;
      }

      const debtKey = buildDebtKey(
        split.membershipId,
        expense.payerMembershipId,
      );

      const existingDebt = aggregatedDebtAmounts.get(debtKey);

      if (existingDebt) {
        existingDebt.amountMinor += split.owedShareMinor;
        return;
      }

      aggregatedDebtAmounts.set(debtKey, {
        fromMembershipId: split.membershipId,
        toMembershipId: expense.payerMembershipId,
        amountMinor: split.owedShareMinor,
      });
    });
  });

  return Array.from(aggregatedDebtAmounts.values());
}