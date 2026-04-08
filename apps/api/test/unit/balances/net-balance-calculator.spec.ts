/// <reference types="jest" />

import { calculateNetBalances } from '../../../src/modules/balances';

describe('calculateNetBalances', () => {
  it('calculates net balances from normalized debt edges', () => {
    const result = calculateNetBalances(
      ['mem_a', 'mem_b', 'mem_c'],
      [
        {
          fromMembershipId: 'mem_b',
          toMembershipId: 'mem_a',
          amountMinor: 500,
        },
        {
          fromMembershipId: 'mem_c',
          toMembershipId: 'mem_a',
          amountMinor: 300,
        },
      ],
    );

    expect(result).toEqual([
      {
        membershipId: 'mem_a',
        netBalanceMinor: 800,
      },
      {
        membershipId: 'mem_b',
        netBalanceMinor: -500,
      },
      {
        membershipId: 'mem_c',
        netBalanceMinor: -300,
      },
    ]);
  });

  it('includes zero-balance members and preserves provided membership order', () => {
    const result = calculateNetBalances(
      ['mem_active', 'mem_pending', 'mem_zero'],
      [
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_active',
          amountMinor: 400,
        },
      ],
    );

    expect(result).toEqual([
      {
        membershipId: 'mem_active',
        netBalanceMinor: 400,
      },
      {
        membershipId: 'mem_pending',
        netBalanceMinor: -400,
      },
      {
        membershipId: 'mem_zero',
        netBalanceMinor: 0,
      },
    ]);
  });

  it('returns zero balances for all members when there are no debt edges', () => {
    const result = calculateNetBalances(['mem_a', 'mem_b'], []);

    expect(result).toEqual([
      {
        membershipId: 'mem_a',
        netBalanceMinor: 0,
      },
      {
        membershipId: 'mem_b',
        netBalanceMinor: 0,
      },
    ]);
  });

  it('rejects duplicate membership ids in the membership list', () => {
    expect(() =>
      calculateNetBalances(['mem_a', 'mem_a'], []),
    ).toThrow('Duplicate membershipId found: mem_a.');
  });

  it('rejects debt edges that reference unknown memberships', () => {
    expect(() =>
      calculateNetBalances(
        ['mem_a', 'mem_b'],
        [
          {
            fromMembershipId: 'mem_c',
            toMembershipId: 'mem_a',
            amountMinor: 100,
          },
        ],
      ),
    ).toThrow('Debt edge references unknown membershipId: mem_c.');
  });
});