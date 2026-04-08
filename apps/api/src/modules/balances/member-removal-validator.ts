import type { NetBalanceRow } from './types';

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
): Map<string, number> {
  const balanceByMembershipId = new Map<string, number>();

  netBalances.forEach((row, index) => {
    assertNonEmptyString(row.membershipId, `netBalances[${index}].membershipId`);
    assertInteger(
      row.netBalanceMinor,
      `netBalances[${index}].netBalanceMinor`,
    );

    if (balanceByMembershipId.has(row.membershipId)) {
      throw new Error(`Duplicate membershipId found: ${row.membershipId}.`);
    }

    balanceByMembershipId.set(row.membershipId, row.netBalanceMinor);
  });

  return balanceByMembershipId;
}

export function validateMemberRemoval(
  netBalances: readonly NetBalanceRow[],
  membershipId: string,
): void {
  assertNonEmptyString(membershipId, 'membershipId');

  const balanceByMembershipId = validateNetBalances(netBalances);
  const netBalanceMinor = balanceByMembershipId.get(membershipId);

  if (netBalanceMinor == null) {
    throw new Error(`Membership not found in net balances: ${membershipId}.`);
  }

  if (netBalanceMinor !== 0) {
    throw new Error('Member cannot be removed while net balance is non-zero.');
  }
}