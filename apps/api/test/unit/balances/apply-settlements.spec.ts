/// <reference types="jest" />

import { applySettlementsToRawDebts } from '../../../src/modules/balances';

describe('applySettlementsToRawDebts', () => {
  it('removes a debt edge after a full settlement', () => {
    const result = applySettlementsToRawDebts(
      [
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_b',
          amountMinor: 500,
        },
      ],
      [
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_b',
          amountMinor: 500,
        },
      ],
    );

    expect(result).toEqual([]);
  });

  it('reduces a debt edge after a partial settlement', () => {
    const result = applySettlementsToRawDebts(
      [
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_b',
          amountMinor: 500,
        },
      ],
      [
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_b',
          amountMinor: 200,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 300,
      },
    ]);
  });

  it('applies multiple partial settlements sequentially against the evolving debt amount', () => {
    const result = applySettlementsToRawDebts(
      [
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_b',
          amountMinor: 500,
        },
      ],
      [
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_b',
          amountMinor: 200,
        },
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_b',
          amountMinor: 150,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 150,
      },
    ]);
  });

  it('rejects cumulative overpayment across multiple settlements', () => {
    expect(() =>
      applySettlementsToRawDebts(
        [
          {
            fromMembershipId: 'mem_a',
            toMembershipId: 'mem_b',
            amountMinor: 500,
          },
        ],
        [
          {
            fromMembershipId: 'mem_a',
            toMembershipId: 'mem_b',
            amountMinor: 300,
          },
          {
            fromMembershipId: 'mem_a',
            toMembershipId: 'mem_b',
            amountMinor: 300,
          },
        ],
      ),
    ).toThrow('Settlement amount cannot exceed current owed amount.');
  });

  it('preserves unrelated debt edges while applying settlements to one relation', () => {
    const result = applySettlementsToRawDebts(
      [
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
      ],
      [
        {
          fromMembershipId: 'mem_a',
          toMembershipId: 'mem_b',
          amountMinor: 200,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_a',
        toMembershipId: 'mem_b',
        amountMinor: 300,
      },
      {
        fromMembershipId: 'mem_c',
        toMembershipId: 'mem_b',
        amountMinor: 300,
      },
    ]);
  });

  it('treats pending memberships as normal membership ids during settlement application', () => {
    const result = applySettlementsToRawDebts(
      [
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_active',
          amountMinor: 400,
        },
      ],
      [
        {
          fromMembershipId: 'mem_pending',
          toMembershipId: 'mem_active',
          amountMinor: 150,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromMembershipId: 'mem_pending',
        toMembershipId: 'mem_active',
        amountMinor: 250,
      },
    ]);
  });
});