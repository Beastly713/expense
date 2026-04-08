/// <reference types="jest" />

import { validateSettlementAgainstRawDebts } from '../../../src/modules/balances';

describe('validateSettlementAgainstRawDebts', () => {
  const rawDebtEdges = [
    {
      fromMembershipId: 'mem_a',
      toMembershipId: 'mem_b',
      amountMinor: 500,
    },
    {
      fromMembershipId: 'mem_c',
      toMembershipId: 'mem_b',
      amountMinor: 300,
    },
  ] as const;

  it('accepts a valid full settlement amount', () => {
    expect(() =>
      validateSettlementAgainstRawDebts(rawDebtEdges, {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 500,
      }),
    ).not.toThrow();
  });

  it('accepts a valid partial settlement amount', () => {
    expect(() =>
      validateSettlementAgainstRawDebts(rawDebtEdges, {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 200,
      }),
    ).not.toThrow();
  });

  it('rejects when payer and receiver are the same', () => {
    expect(() =>
      validateSettlementAgainstRawDebts(rawDebtEdges, {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_a',
        amountMinor: 100,
      }),
    ).toThrow('Settlement payer and receiver cannot be the same.');
  });

  it('rejects when no current debt relation exists', () => {
    expect(() =>
      validateSettlementAgainstRawDebts(rawDebtEdges, {
        fromMembershipId: 'mem_b',
        toMembershipId: 'mem_a',
        amountMinor: 100,
      }),
    ).toThrow('Settlement must map to a current debt relation.');
  });

  it('rejects when settlement amount exceeds currently owed amount', () => {
    expect(() =>
      validateSettlementAgainstRawDebts(rawDebtEdges, {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 501,
      }),
    ).toThrow('Settlement amount cannot exceed current owed amount.');
  });

  it('rejects non-positive settlement amounts', () => {
    expect(() =>
      validateSettlementAgainstRawDebts(rawDebtEdges, {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 0,
      }),
    ).toThrow('amountMinor must be greater than 0.');
  });
});