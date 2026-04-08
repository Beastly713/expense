/// <reference types="jest" />

import { computeGroupBalanceSnapshot } from '../../../src/modules/balances';

describe('computeGroupBalanceSnapshot', () => {
  it('computes balances end to end with deleted expense exclusion, pending member inclusion, partial settlements, normalization, and simplification', () => {
    const result = computeGroupBalanceSnapshot({
      membershipIds: ['mem_rahul', 'mem_aisha', 'mem_pending'],
      expenses: [
        {
          expenseId: 'exp_1',
          payerMembershipId: 'mem_rahul',
          isDeleted: false,
        },
        {
          expenseId: 'exp_2',
          payerMembershipId: 'mem_aisha',
          isDeleted: false,
        },
        {
          expenseId: 'exp_deleted',
          payerMembershipId: 'mem_rahul',
          isDeleted: true,
        },
      ],
      splits: [
        {
          expenseId: 'exp_1',
          membershipId: 'mem_rahul',
          owedShareMinor: 400,
        },
        {
          expenseId: 'exp_1',
          membershipId: 'mem_aisha',
          owedShareMinor: 400,
        },
        {
          expenseId: 'exp_1',
          membershipId: 'mem_pending',
          owedShareMinor: 400,
        },
        {
          expenseId: 'exp_2',
          membershipId: 'mem_aisha',
          owedShareMinor: 300,
        },
        {
          expenseId: 'exp_2',
          membershipId: 'mem_rahul',
          owedShareMinor: 300,
        },
        {
          expenseId: 'exp_deleted',
          membershipId: 'mem_rahul',
          owedShareMinor: 500,
        },
        {
          expenseId: 'exp_deleted',
          membershipId: 'mem_aisha',
          owedShareMinor: 500,
        },
      ],
      settlements: [
        {
          fromMembershipId: 'mem_aisha',
          toMembershipId: 'mem_rahul',
          amountMinor: 200,
        },
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_rahul',
          amountMinor: 100,
        },
      ],
    });

    expect(result).toEqual({
      rawDebtEdges: [
        {
          fromMembershipId: 'mem_aisha',
          toMembershipId: 'mem_rahul',
          amountMinor: 400,
        },
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_rahul',
          amountMinor: 400,
        },
        {
          fromMembershipId: 'mem_rahul',
          toMembershipId: 'mem_aisha',
          amountMinor: 300,
        },
      ],
      settledDebtEdges: [
        {
          fromMembershipId: 'mem_aisha',
          toMembershipId: 'mem_rahul',
          amountMinor: 200,
        },
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_rahul',
          amountMinor: 300,
        },
        {
          fromMembershipId: 'mem_rahul',
          toMembershipId: 'mem_aisha',
          amountMinor: 300,
        },
      ],
      normalizedDebtEdges: [
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_rahul',
          amountMinor: 300,
        },
        {
          fromMembershipId: 'mem_rahul',
          toMembershipId: 'mem_aisha',
          amountMinor: 100,
        },
      ],
      netBalances: [
        {
          membershipId: 'mem_rahul',
          netBalanceMinor: 200,
        },
        {
          membershipId: 'mem_aisha',
          netBalanceMinor: 100,
        },
        {
          membershipId: 'mem_pending',
          netBalanceMinor: -300,
        },
      ],
      simplifiedDebts: [
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_rahul',
          amountMinor: 200,
        },
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_aisha',
          amountMinor: 100,
        },
      ],
    });
  });

  it('fully settles a debt relation to zero across the whole pipeline', () => {
    const result = computeGroupBalanceSnapshot({
      membershipIds: ['mem_a', 'mem_b'],
      expenses: [
        {
          expenseId: 'exp_1',
          payerMembershipId: 'mem_a',
          isDeleted: false,
        },
      ],
      splits: [
        {
          expenseId: 'exp_1',
          membershipId: 'mem_a',
          owedShareMinor: 500,
        },
        {
          expenseId: 'exp_1',
          membershipId: 'mem_b',
          owedShareMinor: 500,
        },
      ],
      settlements: [
        {
          fromMembershipId: 'mem_b',
          toMembershipId: 'mem_a',
          amountMinor: 500,
        },
      ],
    });

    expect(result).toEqual({
      rawDebtEdges: [
        {
          fromMembershipId: 'mem_b',
          toMembershipId: 'mem_a',
          amountMinor: 500,
        },
      ],
      settledDebtEdges: [],
      normalizedDebtEdges: [],
      netBalances: [
        {
          membershipId: 'mem_a',
          netBalanceMinor: 0,
        },
        {
          membershipId: 'mem_b',
          netBalanceMinor: 0,
        },
      ],
      simplifiedDebts: [],
    });
  });

  it('includes a restored expense again when it is no longer marked deleted', () => {
    const deletedSnapshot = computeGroupBalanceSnapshot({
      membershipIds: ['mem_a', 'mem_b'],
      expenses: [
        {
          expenseId: 'exp_restore',
          payerMembershipId: 'mem_a',
          isDeleted: true,
        },
      ],
      splits: [
        {
          expenseId: 'exp_restore',
          membershipId: 'mem_a',
          owedShareMinor: 400,
        },
        {
          expenseId: 'exp_restore',
          membershipId: 'mem_b',
          owedShareMinor: 400,
        },
      ],
      settlements: [],
    });

    const restoredSnapshot = computeGroupBalanceSnapshot({
      membershipIds: ['mem_a', 'mem_b'],
      expenses: [
        {
          expenseId: 'exp_restore',
          payerMembershipId: 'mem_a',
          isDeleted: false,
        },
      ],
      splits: [
        {
          expenseId: 'exp_restore',
          membershipId: 'mem_a',
          owedShareMinor: 400,
        },
        {
          expenseId: 'exp_restore',
          membershipId: 'mem_b',
          owedShareMinor: 400,
        },
      ],
      settlements: [],
    });

    expect(deletedSnapshot).toEqual({
      rawDebtEdges: [],
      settledDebtEdges: [],
      normalizedDebtEdges: [],
      netBalances: [
        {
          membershipId: 'mem_a',
          netBalanceMinor: 0,
        },
        {
          membershipId: 'mem_b',
          netBalanceMinor: 0,
        },
      ],
      simplifiedDebts: [],
    });

    expect(restoredSnapshot).toEqual({
      rawDebtEdges: [
        {
          fromMembershipId: 'mem_b',
          toMembershipId: 'mem_a',
          amountMinor: 400,
        },
      ],
      settledDebtEdges: [
        {
          fromMembershipId: 'mem_b',
          toMembershipId: 'mem_a',
          amountMinor: 400,
        },
      ],
      normalizedDebtEdges: [
        {
          fromMembershipId: 'mem_b',
          toMembershipId: 'mem_a',
          amountMinor: 400,
        },
      ],
      netBalances: [
        {
          membershipId: 'mem_a',
          netBalanceMinor: 400,
        },
        {
          membershipId: 'mem_b',
          netBalanceMinor: -400,
        },
      ],
      simplifiedDebts: [
        {
          fromMembershipId: 'mem_b',
          toMembershipId: 'mem_a',
          amountMinor: 400,
        },
      ],
    });
  });
});