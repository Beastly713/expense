import type { SplitMethod } from '@splitwise/shared-types';

import { allocateRemainderByOrder } from './rounding';
import type {
  CalculatedSplitRow,
  OrderedMinorUnitAllocation,
  SplitCalculationInput,
  SplitParticipantInput,
} from './types';

const PERCENTAGE_TOTAL = 100;
const FLOAT_COMPARISON_EPSILON = 1e-9;

function assertInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
}

function assertPositiveInteger(value: number, fieldName: string): void {
  assertInteger(value, fieldName);

  if (value <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`);
  }
}

function assertNonNegativeInteger(value: number, fieldName: string): void {
  assertInteger(value, fieldName);

  if (value < 0) {
    throw new Error(`${fieldName} must be greater than or equal to 0.`);
  }
}

function assertFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
}

function assertNonNegativeNumber(value: number, fieldName: string): void {
  assertFiniteNumber(value, fieldName);

  if (value < 0) {
    throw new Error(`${fieldName} must be greater than or equal to 0.`);
  }
}

function assertPositiveNumber(value: number, fieldName: string): void {
  assertFiniteNumber(value, fieldName);

  if (value <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`);
  }
}

function assertMembershipId(value: string, index: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`participants[${index}].membershipId is required.`);
  }
}

function getRequiredInputValue(
  participant: SplitParticipantInput,
  index: number,
): number {
  if (participant.inputValue == null) {
    throw new Error(`participants[${index}].inputValue is required.`);
  }

  return participant.inputValue;
}

function validateParticipants(
  participants: readonly SplitParticipantInput[],
): void {
  if (participants.length < 2) {
    throw new Error('At least 2 participants are required.');
  }

  const seenMembershipIds = new Set<string>();

  participants.forEach((participant, index) => {
    assertMembershipId(participant.membershipId, index);

    if (seenMembershipIds.has(participant.membershipId)) {
      throw new Error(
        `Duplicate participant membershipId found: ${participant.membershipId}.`,
      );
    }

    seenMembershipIds.add(participant.membershipId);
  });
}

function mapAllocatedAmountsToSplitRows(
  participants: readonly SplitParticipantInput[],
  allocatedAmounts: readonly OrderedMinorUnitAllocation[],
  inputType: CalculatedSplitRow['inputType'],
): CalculatedSplitRow[] {
  const allocationByMembershipId = new Map(
    allocatedAmounts.map((allocation) => [
      allocation.membershipId,
      allocation.amountMinor,
    ]),
  );

  return participants.map((participant) => {
    const owedShareMinor = allocationByMembershipId.get(participant.membershipId);

    if (owedShareMinor == null) {
      throw new Error(
        `Missing allocated amount for membershipId ${participant.membershipId}.`,
      );
    }

    return {
      membershipId: participant.membershipId,
      inputType,
      inputValue: participant.inputValue ?? null,
      owedShareMinor,
    };
  });
}

function calculateEqualSplitRows(
  amountMinor: number,
  participants: readonly SplitParticipantInput[],
): CalculatedSplitRow[] {
  const baseShareMinor = Math.floor(amountMinor / participants.length);

  const baseAllocations: OrderedMinorUnitAllocation[] = participants.map(
    (participant) => ({
      membershipId: participant.membershipId,
      amountMinor: baseShareMinor,
    }),
  );

  const allocatedAmounts = allocateRemainderByOrder(
    baseAllocations,
    amountMinor,
  );

  return allocatedAmounts.map((allocation) => ({
    membershipId: allocation.membershipId,
    inputType: 'equal',
    inputValue: null,
    owedShareMinor: allocation.amountMinor,
  }));
}

function calculateExactSplitRows(
  amountMinor: number,
  participants: readonly SplitParticipantInput[],
): CalculatedSplitRow[] {
  const rows = participants.map((participant, index) => {
    const inputValue = getRequiredInputValue(participant, index);

    assertNonNegativeInteger(inputValue, `participants[${index}].inputValue`);

    return {
      membershipId: participant.membershipId,
      inputType: 'exact' as const,
      inputValue,
      owedShareMinor: inputValue,
    };
  });

  const totalMinor = rows.reduce((sum, row) => sum + row.owedShareMinor, 0);

  if (totalMinor !== amountMinor) {
    throw new Error('Exact split total must equal amountMinor.');
  }

  return rows;
}

function calculatePercentSplitRows(
  amountMinor: number,
  participants: readonly SplitParticipantInput[],
): CalculatedSplitRow[] {
  const percentages = participants.map((participant, index) => {
    const inputValue = getRequiredInputValue(participant, index);

    assertNonNegativeNumber(inputValue, `participants[${index}].inputValue`);

    return inputValue;
  });

  const totalPercentage = percentages.reduce((sum, value) => sum + value, 0);

  if (
    Math.abs(totalPercentage - PERCENTAGE_TOTAL) > FLOAT_COMPARISON_EPSILON
  ) {
    throw new Error('Percentage split total must equal 100.');
  }

  const baseAllocations: OrderedMinorUnitAllocation[] = participants.map(
    (participant, index) => {
      const percentage = percentages[index];

      if (percentage == null) {
        throw new Error(`Missing percentage input for index ${index}.`);
      }

      return {
        membershipId: participant.membershipId,
        amountMinor: Math.floor((amountMinor * percentage) / PERCENTAGE_TOTAL),
      };
    },
  );

  const allocatedAmounts = allocateRemainderByOrder(
    baseAllocations,
    amountMinor,
  );

  return mapAllocatedAmountsToSplitRows(participants, allocatedAmounts, 'percent');
}

function calculateSharesSplitRows(
  amountMinor: number,
  participants: readonly SplitParticipantInput[],
): CalculatedSplitRow[] {
  const shares = participants.map((participant, index) => {
    const inputValue = getRequiredInputValue(participant, index);

    assertPositiveNumber(inputValue, `participants[${index}].inputValue`);

    return inputValue;
  });

  const totalShares = shares.reduce((sum, value) => sum + value, 0);

  if (totalShares <= 0) {
    throw new Error('Shares split total shares must be greater than 0.');
  }

  const baseAllocations: OrderedMinorUnitAllocation[] = participants.map(
    (participant, index) => {
      const shareValue = shares[index];

      if (shareValue == null) {
        throw new Error(`Missing share input for index ${index}.`);
      }

      return {
        membershipId: participant.membershipId,
        amountMinor: Math.floor((amountMinor * shareValue) / totalShares),
      };
    },
  );

  const allocatedAmounts = allocateRemainderByOrder(
    baseAllocations,
    amountMinor,
  );

  return mapAllocatedAmountsToSplitRows(participants, allocatedAmounts, 'shares');
}

export function calculateSplitRows(
  input: SplitCalculationInput,
): CalculatedSplitRow[] {
  assertPositiveInteger(input.amountMinor, 'amountMinor');
  validateParticipants(input.participants);

  switch (input.splitMethod as SplitMethod) {
    case 'equal':
      return calculateEqualSplitRows(input.amountMinor, input.participants);
    case 'exact':
      return calculateExactSplitRows(input.amountMinor, input.participants);
    case 'percent':
      return calculatePercentSplitRows(input.amountMinor, input.participants);
    case 'shares':
      return calculateSharesSplitRows(input.amountMinor, input.participants);
    default:
      throw new Error(`Unsupported splitMethod: ${input.splitMethod}.`);
  }
}