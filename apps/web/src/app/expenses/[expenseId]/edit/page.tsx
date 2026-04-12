'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  getExpenseDetails,
  getGroupDetails,
  updateExpense,
  type ExpenseDetailsResponse,
  type ExpenseSplitMethod,
  type GroupDetailsResponse,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';
import {
  parseAmountToMinorUnits,
  validateCreateExpenseForm,
  type CreateExpenseFormErrors,
  type CreateExpenseFormValues,
} from '@/lib/validations/expenses';

function formatCurrencyFromMinor(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function parseMinorToAmountInput(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export default function EditExpensePage() {
  const params = useParams<{ expenseId: string }>();
  const router = useRouter();
  const expenseId =
    typeof params?.expenseId === 'string' ? params.expenseId.trim() : '';

  const { accessToken } = useAuth();

  const [groupDetails, setGroupDetails] = useState<GroupDetailsResponse | null>(null);
  const [expenseDetails, setExpenseDetails] = useState<ExpenseDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<CreateExpenseFormErrors>({});

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dateIncurred, setDateIncurred] = useState('');
  const [notes, setNotes] = useState('');
  const [payerMembershipId, setPayerMembershipId] = useState('');
  const [splitMethod, setSplitMethod] = useState<ExpenseSplitMethod>('equal');
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<string[]>([]);
  const [inputValuesByMembershipId, setInputValuesByMembershipId] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    async function loadExpenseAndGroup() {
      if (!accessToken || !expenseId) {
        setExpenseDetails(null);
        setGroupDetails(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        const expenseResponse = await getExpenseDetails(expenseId, accessToken);
        const groupResponse = await getGroupDetails(
          expenseResponse.expense.groupId,
          accessToken,
        );

        setExpenseDetails(expenseResponse);
        setGroupDetails(groupResponse);

        setTitle(expenseResponse.expense.title);
        setAmount(parseMinorToAmountInput(expenseResponse.expense.amountMinor));
        setDateIncurred(expenseResponse.expense.dateIncurred);
        setNotes(expenseResponse.expense.notes ?? '');
        setPayerMembershipId(expenseResponse.expense.payerMembershipId);
        setSplitMethod(expenseResponse.expense.splitMethod);
        setSelectedMembershipIds(
          expenseResponse.splits.map((split) => split.membershipId),
        );

        const nextInputValuesByMembershipId: Record<string, string> = {};
        expenseResponse.splits.forEach((split) => {
          nextInputValuesByMembershipId[split.membershipId] =
            split.inputValue != null ? String(split.inputValue) : '';
        });
        setInputValuesByMembershipId(nextInputValuesByMembershipId);
      } catch (error) {
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError('Failed to load expense details.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadExpenseAndGroup();
  }, [accessToken, expenseId]);

  const visibleMembers = useMemo(() => {
    return (groupDetails?.members ?? []).filter((member) => member.status !== 'removed');
  }, [groupDetails]);

  const selectedParticipants = useMemo(() => {
    return visibleMembers
      .filter((member) => selectedMembershipIds.includes(member.membershipId))
      .map((member) => ({
        membershipId: member.membershipId,
        name: member.name,
        inputValue: inputValuesByMembershipId[member.membershipId] ?? '',
      }));
  }, [inputValuesByMembershipId, selectedMembershipIds, visibleMembers]);

  const equalPreview = useMemo(() => {
    if (!groupDetails || splitMethod !== 'equal' || selectedParticipants.length === 0) {
      return [];
    }

    const amountMinor = parseAmountToMinorUnits(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      return [];
    }

    const baseShare = Math.floor(amountMinor / selectedParticipants.length);
    let remainder = amountMinor - baseShare * selectedParticipants.length;

    return selectedParticipants.map((participant) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) {
        remainder -= 1;
      }
      return {
        membershipId: participant.membershipId,
        name: participant.name,
        shareMinor: baseShare + extra,
      };
    });
  }, [amount, groupDetails, selectedParticipants, splitMethod]);

  function setParticipantSelected(membershipId: string, checked: boolean) {
    setSelectedMembershipIds((current) => {
      if (checked) {
        if (current.includes(membershipId)) {
          return current;
        }
        return [...current, membershipId];
      }

      return current.filter((id) => id !== membershipId);
    });
  }

  function setParticipantInputValue(membershipId: string, value: string) {
    setInputValuesByMembershipId((current) => ({
      ...current,
      [membershipId]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !groupDetails || !expenseDetails) {
      setErrors({
        form: 'You must be logged in to edit this expense.',
      });
      return;
    }

    const formValues: CreateExpenseFormValues = {
      title,
      amount,
      dateIncurred,
      notes,
      payerMembershipId,
      splitMethod,
      participants: selectedParticipants.map((participant) => ({
        membershipId: participant.membershipId,
        inputValue: participant.inputValue,
      })),
    };

    const nextErrors = validateCreateExpenseForm(formValues);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await updateExpense(
        expenseId,
        {
          title: title.trim(),
          notes: notes.trim().length > 0 ? notes.trim() : null,
          amountMinor: parseAmountToMinorUnits(amount),
          currency: groupDetails.group.defaultCurrency,
          dateIncurred,
          payerMembershipId,
          splitMethod,
          splits: selectedParticipants.map((participant) => {
            const rawValue = participant.inputValue.trim();

            if (splitMethod === 'equal') {
              return {
                membershipId: participant.membershipId,
              };
            }

            return {
              membershipId: participant.membershipId,
              inputValue: Number(rawValue),
            };
          }),
        },
        accessToken,
      );

      router.push(`/groups/${expenseDetails.expense.groupId}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          form: error.message,
        });
      } else {
        setErrors({
          form: 'Failed to update expense.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href={
              expenseDetails?.expense.groupId
                ? `/groups/${expenseDetails.expense.groupId}`
                : '/dashboard'
            }
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            ← Back
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            Edit expense
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Update the expense details and save changes. Backend validation and final
            split math still remain the source of truth.
          </p>
        </div>

        {isLoading ? (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-600">Loading expense details...</p>
          </section>
        ) : null}

        {!isLoading && loadError ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-red-900">Could not load expense</h2>
            <p className="mt-2 text-sm text-red-700">{loadError}</p>
          </section>
        ) : null}

        {!isLoading && !loadError && groupDetails && expenseDetails ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-amber-900">
                Balance recalculation warning
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Editing this expense will recalculate balances.
              </p>
            </section>

            {expenseDetails.expense.isDeleted ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <p className="text-sm text-red-700">
                  This expense is deleted and cannot be edited.
                </p>
              </section>
            ) : null}

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Basic info</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-neutral-700">Title</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                    placeholder="Dinner"
                  />
                  {errors.title ? (
                    <p className="mt-1 text-xs text-red-600">{errors.title}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-neutral-700">Amount</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                    placeholder="1200.00"
                  />
                  {errors.amount ? (
                    <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-neutral-700">Date</span>
                  <input
                    type="date"
                    value={dateIncurred}
                    onChange={(event) => setDateIncurred(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                  />
                  {errors.dateIncurred ? (
                    <p className="mt-1 text-xs text-red-600">{errors.dateIncurred}</p>
                  ) : null}
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-neutral-700">Notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                    placeholder="Optional notes"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Who paid</h2>
              <div className="mt-4">
                <label className="block">
                  <span className="text-sm font-medium text-neutral-700">Payer</span>
                  <select
                    value={payerMembershipId}
                    onChange={(event) => setPayerMembershipId(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                  >
                    <option value="">Select payer</option>
                    {visibleMembers.map((member) => (
                      <option key={member.membershipId} value={member.membershipId}>
                        {member.name} {member.status === 'pending' ? '(pending)' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.payerMembershipId ? (
                    <p className="mt-1 text-xs text-red-600">{errors.payerMembershipId}</p>
                  ) : null}
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Who is involved</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Select at least 2 participants. Pending invitees remain valid participants.
              </p>

              <div className="mt-4 space-y-3">
                {visibleMembers.map((member) => {
                  const checked = selectedMembershipIds.includes(member.membershipId);
                  return (
                    <label
                      key={member.membershipId}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-neutral-900">
                          {member.name}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {member.email}
                          {member.status === 'pending' ? ' · Pending' : ''}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setParticipantSelected(
                            member.membershipId,
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                    </label>
                  );
                })}
              </div>

              {errors.participants ? (
                <p className="mt-3 text-xs text-red-600">{errors.participants}</p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Split method</h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(['equal', 'exact', 'percent', 'shares'] as const).map((method) => {
                  const selected = splitMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSplitMethod(method)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                        selected
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      <span className="font-medium capitalize">{method}</span>
                    </button>
                  );
                })}
              </div>

              {splitMethod !== 'equal' ? (
                <div className="mt-5 space-y-3">
                  {selectedParticipants.map((participant) => (
                    <label
                      key={participant.membershipId}
                      className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 text-sm text-neutral-800">
                        {participant.name}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={participant.inputValue}
                        onChange={(event) =>
                          setParticipantInputValue(
                            participant.membershipId,
                            event.target.value,
                          )
                        }
                        className="w-36 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-500"
                        placeholder={
                          splitMethod === 'exact'
                            ? 'Amount'
                            : splitMethod === 'percent'
                            ? 'Percent'
                            : 'Shares'
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              {errors.splitInputs ? (
                <p className="mt-3 text-xs text-red-600">{errors.splitInputs}</p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Review</h2>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Group</span>
                  <span className="font-medium text-neutral-900">
                    {groupDetails.group.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Currency</span>
                  <span className="font-medium text-neutral-900">
                    {groupDetails.group.defaultCurrency}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Participants</span>
                  <span className="font-medium text-neutral-900">
                    {selectedParticipants.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Split method</span>
                  <span className="font-medium capitalize text-neutral-900">
                    {splitMethod}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Payer</span>
                  <span className="font-medium text-neutral-900">
                    {visibleMembers.find(
                      (member) => member.membershipId === payerMembershipId,
                    )?.name ?? 'Not selected'}
                  </span>
                </div>
              </div>

              {splitMethod === 'equal' && equalPreview.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {equalPreview.map((item) => (
                    <div
                      key={item.membershipId}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                    >
                      <span className="text-neutral-800">{item.name}</span>
                      <span className="font-medium text-neutral-900">
                        {formatCurrencyFromMinor(
                          item.shareMinor,
                          groupDetails.group.defaultCurrency,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="mt-4 text-sm text-neutral-600">
                Final split math and validation are owned by the backend.
              </p>
            </section>

            {errors.form ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.form}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href={`/groups/${expenseDetails.expense.groupId}`}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || expenseDetails.expense.isDeleted}
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Saving changes...' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}