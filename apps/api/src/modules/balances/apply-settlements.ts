import {
  buildDebtAmountLookup,
  validateSettlementAgainstDebtLookup,
} from './settlement-validator';
import type { RawDebtEdge, SettlementInput } from './types';

function buildDebtKey(
  fromMembershipId: string,
  toMembershipId: string,
): string {
  return `${fromMembershipId}::${toMembershipId}`;
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

export function applySettlementsToRawDebts(
  rawDebtEdges: readonly RawDebtEdge[],
  settlements: readonly SettlementInput[],
): RawDebtEdge[] {
  const debtAmountLookup = buildDebtAmountLookup(rawDebtEdges);

  settlements.forEach((settlement) => {
    validateSettlementAgainstDebtLookup(settlement, debtAmountLookup);

    const debtKey = buildDebtKey(
      settlement.fromMembershipId,
      settlement.toMembershipId,
    );
    const currentDebtAmount = debtAmountLookup.get(debtKey);

    if (currentDebtAmount == null) {
      throw new Error('Settlement must map to a current debt relation.');
    }

    const nextDebtAmount = currentDebtAmount - settlement.amountMinor;

    if (nextDebtAmount === 0) {
      debtAmountLookup.delete(debtKey);
      return;
    }

    debtAmountLookup.set(debtKey, nextDebtAmount);
  });

  return Array.from(debtAmountLookup.entries()).map(([debtKey, amountMinor]) => {
    const { fromMembershipId, toMembershipId } = parseDebtKey(debtKey);

    return {
      fromMembershipId,
      toMembershipId,
      amountMinor,
    };
  });
}