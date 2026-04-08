import type { NetBalanceRow, NormalizedDebtEdge } from './types';

function assertInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
}

function assertPositiveInteger(value: number, fieldName: string): void {
  assertInteger(value, fieldName);

  if (value <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`);
  }
}

function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function validateMembershipIds(
  membershipIds: readonly string[],
): Set<string> {
  const seenMembershipIds = new Set<string>();

  membershipIds.forEach((membershipId, index) => {
    assertNonEmptyString(membershipId, `membershipIds[${index}]`);

    if (seenMembershipIds.has(membershipId)) {
      throw new Error(`Duplicate membershipId found: ${membershipId}.`);
    }

    seenMembershipIds.add(membershipId);
  });

  return seenMembershipIds;
}

function validateDebtEdges(
  debtEdges: readonly NormalizedDebtEdge[],
  membershipIdSet: ReadonlySet<string>,
): void {
  debtEdges.forEach((edge, index) => {
    assertNonEmptyString(
      edge.fromMembershipId,
      `debtEdges[${index}].fromMembershipId`,
    );
    assertNonEmptyString(
      edge.toMembershipId,
      `debtEdges[${index}].toMembershipId`,
    );
    assertPositiveInteger(edge.amountMinor, `debtEdges[${index}].amountMinor`);

    if (!membershipIdSet.has(edge.fromMembershipId)) {
      throw new Error(
        `Debt edge references unknown membershipId: ${edge.fromMembershipId}.`,
      );
    }

    if (!membershipIdSet.has(edge.toMembershipId)) {
      throw new Error(
        `Debt edge references unknown membershipId: ${edge.toMembershipId}.`,
      );
    }
  });
}

export function calculateNetBalances(
  membershipIds: readonly string[],
  debtEdges: readonly NormalizedDebtEdge[],
): NetBalanceRow[] {
  const membershipIdSet = validateMembershipIds(membershipIds);

  validateDebtEdges(debtEdges, membershipIdSet);

  const netBalanceByMembershipId = new Map<string, number>(
    membershipIds.map((membershipId) => [membershipId, 0] as const),
  );

  debtEdges.forEach((edge) => {
    const currentFromBalance = netBalanceByMembershipId.get(edge.fromMembershipId);
    const currentToBalance = netBalanceByMembershipId.get(edge.toMembershipId);

    if (currentFromBalance == null || currentToBalance == null) {
      throw new Error('Debt edge references unknown membershipId.');
    }

    netBalanceByMembershipId.set(
      edge.fromMembershipId,
      currentFromBalance - edge.amountMinor,
    );
    netBalanceByMembershipId.set(
      edge.toMembershipId,
      currentToBalance + edge.amountMinor,
    );
  });

  return membershipIds.map((membershipId) => {
    const netBalanceMinor = netBalanceByMembershipId.get(membershipId);

    if (netBalanceMinor == null) {
      throw new Error(`Missing net balance for membershipId ${membershipId}.`);
    }

    return {
      membershipId,
      netBalanceMinor,
    };
  });
}