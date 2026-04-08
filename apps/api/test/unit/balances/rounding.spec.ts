/// <reference types="jest" />

import {
  allocateRemainderByOrder,
  sumAmountMinor,
  type OrderedMinorUnitAllocation,
} from '../../../src/modules/balances';

describe('rounding helpers', () => {
  describe('sumAmountMinor', () => {
    it('returns the integer sum of all allocations', () => {
      const allocations: OrderedMinorUnitAllocation[] = [
        { membershipId: 'mem_1', amountMinor: 334 },
        { membershipId: 'mem_2', amountMinor: 333 },
        { membershipId: 'mem_3', amountMinor: 333 },
      ];

      expect(sumAmountMinor(allocations)).toBe(1000);
    });

    it('rejects duplicate membership ids', () => {
      const allocations: OrderedMinorUnitAllocation[] = [
        { membershipId: 'mem_1', amountMinor: 100 },
        { membershipId: 'mem_1', amountMinor: 200 },
      ];

      expect(() => sumAmountMinor(allocations)).toThrow(
        'Duplicate membershipId found in allocations: mem_1.',
      );
    });
  });

  describe('allocateRemainderByOrder', () => {
    it('distributes a one-unit remainder to the first participant in order', () => {
      const allocations: OrderedMinorUnitAllocation[] = [
        { membershipId: 'mem_1', amountMinor: 333 },
        { membershipId: 'mem_2', amountMinor: 333 },
        { membershipId: 'mem_3', amountMinor: 333 },
      ];

      const result = allocateRemainderByOrder(allocations, 1000);

      expect(result).toEqual([
        { membershipId: 'mem_1', amountMinor: 334 },
        { membershipId: 'mem_2', amountMinor: 333 },
        { membershipId: 'mem_3', amountMinor: 333 },
      ]);
      expect(sumAmountMinor(result)).toBe(1000);
    });

    it('distributes multiple remainder units in preserved input order', () => {
      const allocations: OrderedMinorUnitAllocation[] = [
        { membershipId: 'mem_1', amountMinor: 250 },
        { membershipId: 'mem_2', amountMinor: 250 },
        { membershipId: 'mem_3', amountMinor: 250 },
        { membershipId: 'mem_4', amountMinor: 250 },
      ];

      const result = allocateRemainderByOrder(allocations, 1002);

      expect(result).toEqual([
        { membershipId: 'mem_1', amountMinor: 251 },
        { membershipId: 'mem_2', amountMinor: 251 },
        { membershipId: 'mem_3', amountMinor: 250 },
        { membershipId: 'mem_4', amountMinor: 250 },
      ]);
      expect(sumAmountMinor(result)).toBe(1002);
    });

    it('returns a cloned array unchanged when no remainder exists', () => {
      const allocations: OrderedMinorUnitAllocation[] = [
        { membershipId: 'mem_1', amountMinor: 400 },
        { membershipId: 'mem_2', amountMinor: 400 },
        { membershipId: 'mem_3', amountMinor: 400 },
      ];

      const result = allocateRemainderByOrder(allocations, 1200);

      expect(result).toEqual(allocations);
      expect(result).not.toBe(allocations);
      expect(sumAmountMinor(result)).toBe(1200);
    });

    it('supports zero allocations only when target total is zero', () => {
      expect(allocateRemainderByOrder([], 0)).toEqual([]);

      expect(() => allocateRemainderByOrder([], 1)).toThrow(
        'Cannot allocate a non-zero target total across zero allocations.',
      );
    });

    it('rejects when base allocation total exceeds target total', () => {
      const allocations: OrderedMinorUnitAllocation[] = [
        { membershipId: 'mem_1', amountMinor: 500 },
        { membershipId: 'mem_2', amountMinor: 500 },
      ];

      expect(() => allocateRemainderByOrder(allocations, 999)).toThrow(
        'Base allocation total cannot be greater than targetTotalMinor.',
      );
    });

    it('rejects negative allocation amounts', () => {
      const allocations: OrderedMinorUnitAllocation[] = [
        { membershipId: 'mem_1', amountMinor: -1 },
      ];

      expect(() => allocateRemainderByOrder(allocations, 0)).toThrow(
        'allocations[0].amountMinor must be greater than or equal to 0.',
      );
    });
  });
});