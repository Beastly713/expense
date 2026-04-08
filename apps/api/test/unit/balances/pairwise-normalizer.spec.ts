/// <reference types="jest" />

import { normalizePairwiseDebts } from '../../../src/modules/balances';

describe('normalizePairwiseDebts', () => {
  it('normalizes opposite-direction debts into one net edge', () => {
    const result = normalizePairwiseDebts([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 500,
      },
      {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_a',
        amountMinor: 200,
      },
    ]);

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 300,
      },
    ]);
  });

  it('aggregates repeated same-direction debts before normalization', () => {
    const result = normalizePairwiseDebts([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 300,
      },
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 200,
      },
      {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_a',
        amountMinor: 100,
      },
    ]);

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 400,
      },
    ]);
  });

  it('drops debts that fully cancel each other out', () => {
    const result = normalizePairwiseDebts([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 300,
      },
      {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_a',
        amountMinor: 300,
      },
    ]);

    expect(result).toEqual([]);
  });

  it('preserves unrelated normalized debt edges deterministically', () => {
    const result = normalizePairwiseDebts([
      {
        fromMembershipId: 'mem_pending',
        toMembershipId: 'mem_active',
        amountMinor: 400,
      },
      {
        fromMembershipId: 'mem_c',
        toMembershipId: 'mem_b',
        amountMinor: 300,
      },
    ]);

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_c',
        toMembershipId: 'mem_b',
        amountMinor: 300,
      },
      {
        fromMembershipId: 'mem_pending',
        toMembershipId: 'mem_active',
        amountMinor: 400,
      },
    ]);
  });

  it('rejects self-referential debt edges', () => {
    expect(() =>
      normalizePairwiseDebts([
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_a',
          amountMinor: 100,
        },
      ]),
    ).toThrow(
      'rawDebtEdges[0] cannot reference the same membership in both directions.',
    );
  });
});