/// <reference types="jest" />

import { calculateSplitRows } from '../../../src/modules/balances';

describe('calculateSplitRows', () => {
  it('calculates equal splits with deterministic preserved-order remainder allocation', () => {
    const result = calculateSplitRows({
      amountMinor: 1000,
      splitMethod: 'equal',
      participants: [
        { membershipId: 'mem_b' },
        { membershipId: 'mem_a' },
        { membershipId: 'mem_c' },
      ],
    });

    expect(result).toEqual([
      {
        membershipId: 'mem_b',
        inputType: 'equal',
        inputValue: null,
        owedShareMinor: 334,
      },
      {
        membershipId: 'mem_a',
        inputType: 'equal',
        inputValue: null,
        owedShareMinor: 333,
      },
      {
        membershipId: 'mem_c',
        inputType: 'equal',
        inputValue: null,
        owedShareMinor: 333,
      },
    ]);
  });

  it('rejects split calculation with fewer than 2 participants', () => {
    expect(() =>
      calculateSplitRows({
        amountMinor: 500,
        splitMethod: 'equal',
        participants: [{ membershipId: 'mem_1' }],
      }),
    ).toThrow('At least 2 participants are required.');
  });

  it('rejects duplicate participant membership ids', () => {
    expect(() =>
      calculateSplitRows({
        amountMinor: 500,
        splitMethod: 'equal',
        participants: [
          { membershipId: 'mem_1' },
          { membershipId: 'mem_1' },
        ],
      }),
    ).toThrow('Duplicate participant membershipId found: mem_1.');
  });

  it('calculates exact splits when totals match amountMinor', () => {
    const result = calculateSplitRows({
      amountMinor: 900,
      splitMethod: 'exact',
      participants: [
        { membershipId: 'mem_1', inputValue: 300 },
        { membershipId: 'mem_2', inputValue: 400 },
        { membershipId: 'mem_3', inputValue: 200 },
      ],
    });

    expect(result).toEqual([
      {
        membershipId: 'mem_1',
        inputType: 'exact',
        inputValue: 300,
        owedShareMinor: 300,
      },
      {
        membershipId: 'mem_2',
        inputType: 'exact',
        inputValue: 400,
        owedShareMinor: 400,
      },
      {
        membershipId: 'mem_3',
        inputType: 'exact',
        inputValue: 200,
        owedShareMinor: 200,
      },
    ]);
  });

  it('rejects exact splits when totals do not match amountMinor', () => {
    expect(() =>
      calculateSplitRows({
        amountMinor: 900,
        splitMethod: 'exact',
        participants: [
          { membershipId: 'mem_1', inputValue: 300 },
          { membershipId: 'mem_2', inputValue: 300 },
          { membershipId: 'mem_3', inputValue: 200 },
        ],
      }),
    ).toThrow('Exact split total must equal amountMinor.');
  });

  it('calculates percentage splits with deterministic rounding', () => {
    const result = calculateSplitRows({
      amountMinor: 1001,
      splitMethod: 'percent',
      participants: [
        { membershipId: 'mem_1', inputValue: 50 },
        { membershipId: 'mem_2', inputValue: 50 },
      ],
    });

    expect(result).toEqual([
      {
        membershipId: 'mem_1',
        inputType: 'percent',
        inputValue: 50,
        owedShareMinor: 501,
      },
      {
        membershipId: 'mem_2',
        inputType: 'percent',
        inputValue: 50,
        owedShareMinor: 500,
      },
    ]);
  });

  it('rejects percentage splits when total percentage is not 100', () => {
    expect(() =>
      calculateSplitRows({
        amountMinor: 1000,
        splitMethod: 'percent',
        participants: [
          { membershipId: 'mem_1', inputValue: 60 },
          { membershipId: 'mem_2', inputValue: 30 },
        ],
      }),
    ).toThrow('Percentage split total must equal 100.');
  });

  it('calculates shares splits with deterministic rounding', () => {
    const result = calculateSplitRows({
      amountMinor: 1000,
      splitMethod: 'shares',
      participants: [
        { membershipId: 'mem_1', inputValue: 1 },
        { membershipId: 'mem_2', inputValue: 2 },
        { membershipId: 'mem_3', inputValue: 3 },
      ],
    });

    expect(result).toEqual([
      {
        membershipId: 'mem_1',
        inputType: 'shares',
        inputValue: 1,
        owedShareMinor: 167,
      },
      {
        membershipId: 'mem_2',
        inputType: 'shares',
        inputValue: 2,
        owedShareMinor: 333,
      },
      {
        membershipId: 'mem_3',
        inputType: 'shares',
        inputValue: 3,
        owedShareMinor: 500,
      },
    ]);
  });

  it('rejects shares splits when a share value is not positive', () => {
    expect(() =>
      calculateSplitRows({
        amountMinor: 1000,
        splitMethod: 'shares',
        participants: [
          { membershipId: 'mem_1', inputValue: 0 },
          { membershipId: 'mem_2', inputValue: 2 },
        ],
      }),
    ).toThrow('participants[0].inputValue must be greater than 0.');
  });
});