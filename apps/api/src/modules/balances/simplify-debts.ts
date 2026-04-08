import type { NetBalanceRow, SimplifiedDebtRow } from './types';

interface WorkingBalanceRow {
  membershipId: string;
  remainingAmountMinor: number;
}

function assertInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
}

function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function validateNetBalances(
  netBalances: readonly NetBalanceRow[],
): void {
  const seenMembershipIds = new Set<string>();

  netBalances.forEach((row, index) => {
    assertNonEmptyString(row.membershipId, `netBalances[${index}].membershipId`);
    assertInteger(row.netBalanceMinor, `netBalances[${index}].netBalanceMinor`);

    if (seenMembershipIds.has(row.membershipId)) {
      throw new Error(`Duplicate membershipId found: ${row.membershipId}.`);
    }

    seenMembershipIds.add(row.membershipId);
  });

  const totalNetBalanceMinor = netBalances.reduce((total, row) => {
    return total + row.netBalanceMinor;
  }, 0);

  if (totalNetBalanceMinor !== 0) {
    throw new Error('Net balances must sum to zero.');
  }
}

export function simplifyDebts(
  netBalances: readonly NetBalanceRow[],
): SimplifiedDebtRow[] {
  validateNetBalances(netBalances);

  const debtors: WorkingBalanceRow[] = netBalances
    .filter((row) => row.netBalanceMinor < 0)
    .map((row) => ({
      membershipId: row.membershipId,
      remainingAmountMinor: Math.abs(row.netBalanceMinor),
    }));

  const creditors: WorkingBalanceRow[] = netBalances
    .filter((row) => row.netBalanceMinor > 0)
    .map((row) => ({
      membershipId: row.membershipId,
      remainingAmountMinor: row.netBalanceMinor,
    }));

  const simplifiedDebts: SimplifiedDebtRow[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    if (!debtor || !creditor) {
      throw new Error('Failed to resolve debtor or creditor during simplification.');
    }

    const settledAmountMinor = Math.min(
      debtor.remainingAmountMinor,
      creditor.remainingAmountMinor,
    );

    if (settledAmountMinor <= 0) {
      throw new Error('Simplification encountered a non-positive settlement amount.');
    }

    simplifiedDebts.push({
      fromMembershipId: debtor.membershipId,
      toMembershipId: creditor.membershipId,
      amountMinor: settledAmountMinor,
    });

    debtor.remainingAmountMinor -= settledAmountMinor;
    creditor.remainingAmountMinor -= settledAmountMinor;

    if (debtor.remainingAmountMinor === 0) {
      debtorIndex += 1;
    }

    if (creditor.remainingAmountMinor === 0) {
      creditorIndex += 1;
    }
  }

  const hasRemainingDebtor = debtors.some(
    (debtor) => debtor.remainingAmountMinor !== 0,
  );
  const hasRemainingCreditor = creditors.some(
    (creditor) => creditor.remainingAmountMinor !== 0,
  );

  if (hasRemainingDebtor || hasRemainingCreditor) {
    throw new Error('Simplification did not fully resolve all net balances.');
  }

  return simplifiedDebts;
}