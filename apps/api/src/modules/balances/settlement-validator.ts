import type { RawDebtEdge, SettlementInput } from './types';

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

export function buildDebtAmountLookup(
  rawDebtEdges: readonly RawDebtEdge[],
): Map<string, number> {
  const debtAmountLookup = new Map<string, number>();

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

    const debtKey = buildDebtKey(edge.fromMembershipId, edge.toMembershipId);
    const currentAmount = debtAmountLookup.get(debtKey) ?? 0;

    debtAmountLookup.set(debtKey, currentAmount + edge.amountMinor);
  });

  return debtAmountLookup;
}

export function validateSettlementAgainstDebtLookup(
  settlement: SettlementInput,
  debtAmountLookup: ReadonlyMap<string, number>,
): void {
  assertNonEmptyString(settlement.fromMembershipId, 'fromMembershipId');
  assertNonEmptyString(settlement.toMembershipId, 'toMembershipId');
  assertPositiveInteger(settlement.amountMinor, 'amountMinor');

  if (settlement.fromMembershipId === settlement.toMembershipId) {
    throw new Error('Settlement payer and receiver cannot be the same.');
  }

  const debtKey = buildDebtKey(
    settlement.fromMembershipId,
    settlement.toMembershipId,
  );
  const currentDebtAmount = debtAmountLookup.get(debtKey) ?? 0;

  if (currentDebtAmount <= 0) {
    throw new Error('Settlement must map to a current debt relation.');
  }

  if (settlement.amountMinor > currentDebtAmount) {
    throw new Error('Settlement amount cannot exceed current owed amount.');
  }
}

export function validateSettlementAgainstRawDebts(
  rawDebtEdges: readonly RawDebtEdge[],
  settlement: SettlementInput,
): void {
  const debtAmountLookup = buildDebtAmountLookup(rawDebtEdges);

  validateSettlementAgainstDebtLookup(settlement, debtAmountLookup);
}