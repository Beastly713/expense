import type { NormalizedDebtEdge, RawDebtEdge } from './types';

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

function buildDebtKey(
  fromMembershipId: string,
  toMembershipId: string,
): string {
  return `${fromMembershipId}::${toMembershipId}`;
}

function buildPairKey(
  firstMembershipId: string,
  secondMembershipId: string,
): string {
  const [left, right] = [firstMembershipId, secondMembershipId].sort();

  return `${left}::${right}`;
}

function parseDebtKey(debtKey: string): {
  fromMembershipId: string;
  toMembershipId: string;
} {
  const [fromMembershipId, toMembershipId] = debtKey.split('::');

  if (!fromMembershipId || !toMembershipId) {
    throw new Error(`Invalid debt key: ${debtKey}.`);
  }

  return {
    fromMembershipId,
    toMembershipId,
  };
}

function validateDebtEdges(rawDebtEdges: readonly RawDebtEdge[]): void {
  rawDebtEdges.forEach((edge, index) => {
    assertNonEmptyString(
      edge.fromMembershipId,
      `rawDebtEdges[${index}].fromMembershipId`,
    );
    assertNonEmptyString(
      edge.toMembershipId,
      `rawDebtEdges[${index}].toMembershipId`,
    );
    assertPositiveInteger(
      edge.amountMinor,
      `rawDebtEdges[${index}].amountMinor`,
    );

    if (edge.fromMembershipId === edge.toMembershipId) {
      throw new Error(
        `rawDebtEdges[${index}] cannot reference the same membership in both directions.`,
      );
    }
  });
}

export function normalizePairwiseDebts(
  rawDebtEdges: readonly RawDebtEdge[],
): NormalizedDebtEdge[] {
  validateDebtEdges(rawDebtEdges);

  const directionalAmounts = new Map<string, number>();

  rawDebtEdges.forEach((edge) => {
    const debtKey = buildDebtKey(edge.fromMembershipId, edge.toMembershipId);
    const currentAmount = directionalAmounts.get(debtKey) ?? 0;

    directionalAmounts.set(debtKey, currentAmount + edge.amountMinor);
  });

  const processedPairs = new Set<string>();
  const normalizedDebtEdges: NormalizedDebtEdge[] = [];

  directionalAmounts.forEach((amountMinor, debtKey) => {
    const { fromMembershipId, toMembershipId } = parseDebtKey(debtKey);
    const pairKey = buildPairKey(fromMembershipId, toMembershipId);

    if (processedPairs.has(pairKey)) {
      return;
    }

    processedPairs.add(pairKey);

    const reverseDebtKey = buildDebtKey(toMembershipId, fromMembershipId);
    const reverseAmountMinor = directionalAmounts.get(reverseDebtKey) ?? 0;
    const netAmountMinor = amountMinor - reverseAmountMinor;

    if (netAmountMinor > 0) {
      normalizedDebtEdges.push({
        fromMembershipId,
        toMembershipId,
        amountMinor: netAmountMinor,
      });

      return;
    }

    if (netAmountMinor < 0) {
      normalizedDebtEdges.push({
        fromMembershipId: toMembershipId,
        toMembershipId: fromMembershipId,
        amountMinor: Math.abs(netAmountMinor),
      });
    }
  });

  return normalizedDebtEdges.sort((left, right) => {
    if (left.fromMembershipId !== right.fromMembershipId) {
      return left.fromMembershipId.localeCompare(right.fromMembershipId);
    }

    return left.toMembershipId.localeCompare(right.toMembershipId);
  });
}