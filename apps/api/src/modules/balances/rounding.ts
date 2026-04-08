import type { OrderedMinorUnitAllocation } from './types';

function assertInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
}

function assertNonNegativeInteger(value: number, fieldName: string): void {
  assertInteger(value, fieldName);

  if (value < 0) {
    throw new Error(`${fieldName} must be greater than or equal to 0.`);
  }
}

function assertMembershipId(value: string, index: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`allocations[${index}].membershipId is required.`);
  }
}

function validateAllocations(
  allocations: readonly OrderedMinorUnitAllocation[],
): void {
  const seenMembershipIds = new Set<string>();

  allocations.forEach((allocation, index) => {
    assertMembershipId(allocation.membershipId, index);
    assertNonNegativeInteger(
      allocation.amountMinor,
      `allocations[${index}].amountMinor`,
    );

    if (seenMembershipIds.has(allocation.membershipId)) {
      throw new Error(
        `Duplicate membershipId found in allocations: ${allocation.membershipId}.`,
      );
    }

    seenMembershipIds.add(allocation.membershipId);
  });
}

export function sumAmountMinor(
  allocations: readonly OrderedMinorUnitAllocation[],
): number {
  validateAllocations(allocations);

  return allocations.reduce((total, allocation) => {
    return total + allocation.amountMinor;
  }, 0);
}

export function allocateRemainderByOrder(
  allocations: readonly OrderedMinorUnitAllocation[],
  targetTotalMinor: number,
): OrderedMinorUnitAllocation[] {
  assertNonNegativeInteger(targetTotalMinor, 'targetTotalMinor');
  validateAllocations(allocations);

  if (allocations.length === 0) {
    if (targetTotalMinor !== 0) {
      throw new Error(
        'Cannot allocate a non-zero target total across zero allocations.',
      );
    }

    return [];
  }

  const baseTotalMinor = sumAmountMinor(allocations);

  if (baseTotalMinor > targetTotalMinor) {
    throw new Error(
      'Base allocation total cannot be greater than targetTotalMinor.',
    );
  }

  const remainderMinor = targetTotalMinor - baseTotalMinor;

  const adjustedAllocations = allocations.map((allocation) => ({
    ...allocation,
  }));

  for (let index = 0; index < remainderMinor; index += 1) {
    const targetIndex = index % adjustedAllocations.length;
    const currentAllocation = adjustedAllocations[targetIndex];

    if (!currentAllocation) {
      throw new Error('Failed to resolve allocation target for remainder.');
    }

    adjustedAllocations[targetIndex] = {
      ...currentAllocation,
      amountMinor: currentAllocation.amountMinor + 1,
    };
  }

  return adjustedAllocations;
}