import { applySettlementsToRawDebts } from './apply-settlements';
import { calculateNetBalances } from './net-balance-calculator';
import { normalizePairwiseDebts } from './pairwise-normalizer';
import { buildRawDebtEdges } from './raw-debt-builder';
import { simplifyDebts } from './simplify-debts';
import type {
  GroupBalanceSnapshot,
  GroupBalanceSnapshotInput,
} from './types';

export function computeGroupBalanceSnapshot(
  input: GroupBalanceSnapshotInput,
): GroupBalanceSnapshot {
  const rawDebtEdges = buildRawDebtEdges(input.expenses, input.splits);
  const settledDebtEdges = applySettlementsToRawDebts(
    rawDebtEdges,
    input.settlements,
  );
  const normalizedDebtEdges = normalizePairwiseDebts(settledDebtEdges);
  const netBalances = calculateNetBalances(
    input.membershipIds,
    normalizedDebtEdges,
  );
  const simplifiedDebts = simplifyDebts(netBalances);

  return {
    rawDebtEdges,
    settledDebtEdges,
    normalizedDebtEdges,
    netBalances,
    simplifiedDebts,
  };
}