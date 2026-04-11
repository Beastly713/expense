import type { ExpenseSplitMethod } from '@/lib/api/expenses';

export interface ExpenseParticipantFormValue {
  membershipId: string;
  inputValue: string;
}

export interface CreateExpenseFormValues {
  title: string;
  amount: string;
  dateIncurred: string;
  notes: string;
  payerMembershipId: string;
  splitMethod: ExpenseSplitMethod;
  participants: ExpenseParticipantFormValue[];
}

export interface CreateExpenseFormErrors {
  title?: string;
  amount?: string;
  dateIncurred?: string;
  payerMembershipId?: string;
  participants?: string;
  splitInputs?: string;
  form?: string;
}

function parsePositiveMoneyToMinorUnits(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function validateCreateExpenseForm(
  values: CreateExpenseFormValues,
): CreateExpenseFormErrors {
  const errors: CreateExpenseFormErrors = {};

  if (values.title.trim().length === 0) {
    errors.title = 'Title is required.';
  }

  if (parsePositiveMoneyToMinorUnits(values.amount) == null) {
    errors.amount = 'Enter a valid amount greater than 0.';
  }

  if (values.dateIncurred.trim().length === 0) {
    errors.dateIncurred = 'Date is required.';
  }

  if (values.payerMembershipId.trim().length === 0) {
    errors.payerMembershipId = 'Choose who paid.';
  }

  if (values.participants.length < 2) {
    errors.participants = 'Select at least 2 participants.';
  }

  if (
    values.splitMethod === 'exact' ||
    values.splitMethod === 'percent' ||
    values.splitMethod === 'shares'
  ) {
    const hasBlankInput = values.participants.some(
      (participant) => participant.inputValue.trim().length === 0,
    );

    if (hasBlankInput) {
      errors.splitInputs = 'Fill split values for every participant.';
    }
  }

  return errors;
}

export function parseAmountToMinorUnits(value: string): number {
  const normalized = value.trim();
  return Math.round(Number(normalized) * 100);
}