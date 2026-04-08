/// <reference types="jest" />

import { simplifyDebts } from '../../../src/modules/balances';

describe('simplifyDebts', () => {
  it('simplifies one creditor with multiple debtors', () => {
    const result = simplifyDebts([
      { membershipId: 'mem_a', netBalanceMinor: 800 },
      { membershipId: 'mem_b', netBalanceMinor: -500 },
      { membershipId: 'mem_c', netBalanceMinor: -300 },
    ]);

    expect(result).toEqual([
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
    ]);
  });

  it('simplifies one debtor with multiple creditors', () => {
    const result = simplifyDebts([
      { membershipId: 'mem_a', netBalanceMinor: -700 },
      { membershipId: 'mem_b', netBalanceMinor: 400 },
      { membershipId: 'mem_c', netBalanceMinor: 300 },
    ]);

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 400,
      },
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_c',
        amountMinor: 300,
      },
    ]);
  });

  it('handles multiple debtors and creditors greedily in provided order', () => {
    const result = simplifyDebts([
      { membershipId: 'mem_a', netBalanceMinor: -500 },
      { membershipId: 'mem_b', netBalanceMinor: -200 },
      { membershipId: 'mem_c', netBalanceMinor: 300 },
      { membershipId: 'mem_d', netBalanceMinor: 400 },
    ]);

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_c',
        amountMinor: 300,
      },
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_d',
        amountMinor: 200,
      },
      {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_d',
        amountMinor: 200,
      },
    ]);
  });

  it('ignores zero-balance members', () => {
    const result = simplifyDebts([
      { membershipId: 'mem_zero', netBalanceMinor: 0 },
      { membershipId: 'mem_active', netBalanceMinor: 400 },
      { membershipId: 'mem_pending', netBalanceMinor: -400 },
    ]);

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_pending',
        toMembershipId: 'mem_active',
        amountMinor: 400,
      },
    ]);
  });

  it('returns an empty list when everyone is settled up', () => {
    const result = simplifyDebts([
      { membershipId: 'mem_a', netBalanceMinor: 0 },
      { membershipId: 'mem_b', netBalanceMinor: 0 },
    ]);

    expect(result).toEqual([]);
  });

  it('supports pending memberships as normal membership ids', () => {
    const result = simplifyDebts([
      { membershipId: 'mem_pending', netBalanceMinor: -250 },
      { membershipId: 'mem_active', netBalanceMinor: 250 },
    ]);

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_pending',
        toMembershipId: 'mem_active',
        amountMinor: 250,
      },
    ]);
  });

  it('rejects duplicate membership ids', () => {
    expect(() =>
      simplifyDebts([
        { membershipId: 'mem_a', netBalanceMinor: -100 },
        { membershipId: 'mem_a', netBalanceMinor: 100 },
      ]),
    ).toThrow('Duplicate membershipId found: mem_a.');
  });

  it('rejects net balances that do not sum to zero', () => {
    expect(() =>
      simplifyDebts([
        { membershipId: 'mem_a', netBalanceMinor: -100 },
        { membershipId: 'mem_b', netBalanceMinor: 50 },
      ]),
    ).toThrow('Net balances must sum to zero.');
  });
});