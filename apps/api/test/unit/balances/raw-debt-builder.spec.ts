/// <reference types="jest" />

import { buildRawDebtEdges } from '../../../src/modules/balances';

describe('buildRawDebtEdges', () => {
  it('builds debts for non-payer participants and skips the payer self-share', () => {
    const result = buildRawDebtEdges(
      [
        {
          expenseId: 'exp_1',
          payerMembershipId: 'mem_payer',
          isDeleted: false,
        },
      ],
      [
        {
          expenseId: 'exp_1',
          membershipId: 'mem_payer',
          owedShareMinor: 400,
        },
        {
          expenseId: 'exp_1',
          membershipId: 'mem_a',
          owedShareMinor: 400,
        },
        {
          expenseId: 'exp_1',
          membershipId: 'mem_b',
          owedShareMinor: 400,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_payer',
        amountMinor: 400,
      },
      {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_payer',
        amountMinor: 400,
      },
    ]);
  });

  it('aggregates repeated debts across multiple active expenses', () => {
    const result = buildRawDebtEdges(
      [
        {
          expenseId: 'exp_1',
          payerMembershipId: 'mem_a',
          isDeleted: false,
        },
        {
          expenseId: 'exp_2',
          payerMembershipId: 'mem_a',
          isDeleted: false,
        },
      ],
      [
        {
          expenseId: 'exp_1',
          membershipId: 'mem_a',
          owedShareMinor: 300,
        },
        {
          expenseId: 'exp_1',
          membershipId: 'mem_b',
          owedShareMinor: 300,
        },
        {
          expenseId: 'exp_2',
          membershipId: 'mem_a',
          owedShareMinor: 200,
        },
        {
          expenseId: 'exp_2',
          membershipId: 'mem_b',
          owedShareMinor: 200,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_a',
        amountMinor: 500,
      },
    ]);
  });

  it('excludes deleted expenses from raw debt building', () => {
    const result = buildRawDebtEdges(
      [
        {
          expenseId: 'exp_active',
          payerMembershipId: 'mem_a',
          isDeleted: false,
        },
        {
          expenseId: 'exp_deleted',
          payerMembershipId: 'mem_a',
          isDeleted: true,
        },
      ],
      [
        {
          expenseId: 'exp_active',
          membershipId: 'mem_a',
          owedShareMinor: 250,
        },
        {
          expenseId: 'exp_active',
          membershipId: 'mem_b',
          owedShareMinor: 250,
        },
        {
          expenseId: 'exp_deleted',
          membershipId: 'mem_a',
          owedShareMinor: 300,
        },
        {
          expenseId: 'exp_deleted',
          membershipId: 'mem_b',
          owedShareMinor: 300,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_a',
        amountMinor: 250,
      },
    ]);
  });

  it('includes restored expenses when isDeleted is false again', () => {
    const result = buildRawDebtEdges(
      [
        {
          expenseId: 'exp_restored',
          payerMembershipId: 'mem_a',
          isDeleted: false,
        },
      ],
      [
        {
          expenseId: 'exp_restored',
          membershipId: 'mem_a',
          owedShareMinor: 300,
        },
        {
          expenseId: 'exp_restored',
          membershipId: 'mem_b',
          owedShareMinor: 300,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_a',
        amountMinor: 300,
      },
    ]);
  });

  it('keeps pending memberships valid as regular membership ids', () => {
    const result = buildRawDebtEdges(
      [
        {
          expenseId: 'exp_1',
          payerMembershipId: 'mem_active',
          isDeleted: false,
        },
      ],
      [
        {
          expenseId: 'exp_1',
          membershipId: 'mem_active',
          owedShareMinor: 400,
        },
        {
          expenseId: 'exp_1',
          membershipId: 'mem_pending',
          owedShareMinor: 400,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_pending',
        toMembershipId: 'mem_active',
        amountMinor: 400,
      },
    ]);
  });

  it('rejects splits that reference unknown expense ids', () => {
    expect(() =>
      buildRawDebtEdges(
        [
          {
            expenseId: 'exp_1',
            payerMembershipId: 'mem_a',
            isDeleted: false,
          },
        ],
        [
          {
            expenseId: 'exp_missing',
            membershipId: 'mem_b',
            owedShareMinor: 100,
          },
        ],
      ),
    ).toThrow('Split references unknown expenseId: exp_missing.');
  });

  it('rejects duplicate participant splits within the same expense', () => {
    expect(() =>
      buildRawDebtEdges(
        [
          {
            expenseId: 'exp_1',
            payerMembershipId: 'mem_a',
            isDeleted: false,
          },
        ],
        [
          {
            expenseId: 'exp_1',
            membershipId: 'mem_a',
            owedShareMinor: 100,
          },
          {
            expenseId: 'exp_1',
            membershipId: 'mem_b',
            owedShareMinor: 100,
          },
          {
            expenseId: 'exp_1',
            membershipId: 'mem_b',
            owedShareMinor: 100,
          },
        ],
      ),
    ).toThrow(
      'Duplicate split membershipId found for expenseId exp_1: mem_b.',
    );
  });
});