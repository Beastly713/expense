import type { SplitInputType, SplitMethod } from '@splitwise/shared-types';

export interface OrderedMinorUnitAllocation {
  membershipId: string;
  amountMinor: number;
}

export interface SplitParticipantInput {
  membershipId: string;
  inputValue?: number | null;
}

export interface SplitCalculationInput {
  amountMinor: number;
  splitMethod: SplitMethod;
  participants: readonly SplitParticipantInput[];
}

export interface CalculatedSplitRow {
  membershipId: string;
  inputType: SplitInputType;
  inputValue: number | null;
  owedShareMinor: number;
}