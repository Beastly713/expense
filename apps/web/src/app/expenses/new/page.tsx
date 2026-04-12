'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  createGroupExpense,
  getGroupDetails,
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

function buildTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

export default function NewExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId')?.trim() ?? '';

  const { accessToken, user } = useAuth();

  const [groupDetails, setGroupDetails] = useState<GroupDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<CreateExpenseFormErrors>({});

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dateIncurred, setDateIncurred] = useState(buildTodayDateString());
  const [notes, setNotes] = useState('');
  const [payerMembershipId, setPayerMembershipId] = useState('');
  const [splitMethod, setSplitMethod] = useState<ExpenseSplitMethod>('equal');
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<string[]>([]);
  const [inputValuesByMembershipId, setInputValuesByMembershipId] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    async function loadGroup() {
      if (!accessToken || !groupId) {
        setGroupDetails(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await getGroupDetails(groupId, accessToken);
        setGroupDetails(response);

        const defaultMembers = response.members
          .filter((member) => member.status !== 'removed')
          .map((member) => member.membershipId);

        setSelectedMembershipIds(defaultMembers);

        const currentUserMembership = response.members.find(
          (member) => member.userId === user?.id && member.status === 'active',
        );

        setPayerMembershipId(
          currentUserMembership?.membershipId ?? response.members[0]?.membershipId ?? '',
        );
      } catch (error) {
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError('Failed to load group for expense creation.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadGroup();
  }, [accessToken, groupId, user?.id]);

  const selectableMembers = useMemo(() => {
    return groupDetails?.members.filter((member) => member.status !== 'removed') ?? [];
  }, [groupDetails]);

  const selectedParticipants = useMemo(() => {
    return selectableMembers.filter((member) =>
      selectedMembershipIds.includes(member.membershipId),
    );
  }, [selectableMembers, selectedMembershipIds]);

  const amountMinor = useMemo(() => {
    const numeric = Number(amount);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 0;
    }

    return Math.round(numeric * 100);
  }, [amount]);

  const equalPreview = useMemo(() => {
    if (splitMethod !== 'equal' || amountMinor <= 0 || selectedParticipants.length < 2) {
      return [];
    }

    const base = Math.floor(amountMinor / selectedParticipants.length);
    let remainder = amountMinor - base * selectedParticipants.length;

    return selectedParticipants.map((participant) => {
      const share = base + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);

      return {
        membershipId: participant.membershipId,
        name: participant.name,
        shareMinor: share,
      };
    });
  }, [amountMinor, selectedParticipants, splitMethod]);

  function toggleParticipant(membershipId: string) {
    setSelectedMembershipIds((current) => {
      if (current.includes(membershipId)) {
        return current.filter((value) => value !== membershipId);
      }

      return [...current, membershipId];
    });
  }

  function updateSplitInput(membershipId: string, value: string) {
    setInputValuesByMembershipId((current) => ({
      ...current,
      [membershipId]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !groupDetails || !groupId) {
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
        inputValue: inputValuesByMembershipId[participant.membershipId] ?? '',
      })),
    };

    const nextErrors = validateCreateExpenseForm(formValues);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      await createGroupExpense(
        groupId,
        {
          title: title.trim(),
          notes: notes.trim().length > 0 ? notes.trim() : null,
          amountMinor: parseAmountToMinorUnits(amount),
          currency: groupDetails.group.defaultCurrency,
          dateIncurred,
          payerMembershipId,
          splitMethod,
          splits: selectedParticipants.map((participant) => {
            if (splitMethod === 'equal') {
              return {
                membershipId: participant.membershipId,
              };
            }

            return {
              membershipId: participant.membershipId,
              inputValue: Number(
                inputValuesByMembershipId[participant.membershipId] ?? '0',
              ),
            };
          }),
        },
        accessToken,
      );

      router.replace(`/groups/${groupId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          form: error.message,
        });
      } else if (error instanceof Error) {
        setErrors({
          form: error.message,
        });
      } else {
        setErrors({
          form: 'Unable to create expense right now. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {isLoading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 shadow-sm">
            Loading expense form...
          </div>
        ) : null}

        {!isLoading && loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {loadError}
          </div>
        ) : null}

        {!isLoading && !loadError && groupDetails ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                    Add expense
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
                    New expense in {groupDetails.group.name}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-600">
                    Currency: {groupDetails.group.defaultCurrency}
                  </p>
                </div>

                <Link
                  href={`/groups/${groupId}`}
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                >
                  Back to group
                </Link>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-900">Basic info</h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="expense-title"
                      className="mb-2 block text-sm font-medium text-neutral-800"
                    >
                      Title
                    </label>
                    <input
                      id="expense-title"
                      aria-label="Title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Dinner"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                    />
                    {errors.title ? (
                      <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                    ) : null}
                  </div>

                  <div>
                    <label
                      htmlFor="expense-amount"
                      className="mb-2 block text-sm font-medium text-neutral-800"
                    >
                      Amount
                    </label>
                    <input
                      id="expense-amount"
                      aria-label="Amount"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      inputMode="decimal"
                      placeholder="1200.00"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                    />
                    {errors.amount ? (
                      <p className="mt-2 text-sm text-red-600">{errors.amount}</p>
                    ) : null}
                  </div>

                  <div>
                    <label
                      htmlFor="expense-date"
                      className="mb-2 block text-sm font-medium text-neutral-800"
                    >
                      Date
                    </label>
                    <input
                      id="expense-date"
                      aria-label="Date"
                      type="date"
                      value={dateIncurred}
                      onChange={(event) => setDateIncurred(event.target.value)}
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                    />
                    {errors.dateIncurred ? (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.dateIncurred}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="expense-notes"
                      className="mb-2 block text-sm font-medium text-neutral-800"
                    >
                      Notes
                    </label>
                    <textarea
                      id="expense-notes"
                      aria-label="Notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={4}
                      placeholder="Optional notes"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-900">Who paid</h2>

                <div className="mt-4">
                  <label
                    htmlFor="expense-payer"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    Payer
                  </label>
                  <select
                    id="expense-payer"
                    aria-label="Payer"
                    value={payerMembershipId}
                    onChange={(event) => setPayerMembershipId(event.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                  >
                    <option value="">Select payer</option>
                    {selectableMembers.map((member) => (
                      <option key={member.membershipId} value={member.membershipId}>
                        {member.name}
                        {member.status === 'pending' ? ' (pending)' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.payerMembershipId ? (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.payerMembershipId}
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-900">Who is involved</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Pending members can be selected and will participate in balances.
                </p>

                <div className="mt-4 space-y-3">
                  {selectableMembers.map((member) => {
                    const isChecked = selectedMembershipIds.includes(member.membershipId);

                    return (
                      <label
                        key={member.membershipId}
                        className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleParticipant(member.membershipId)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900">
                            {member.name}
                          </p>
                          <p className="text-xs text-neutral-500">{member.email}</p>
                          {member.status === 'pending' ? (
                            <p className="mt-1 text-xs font-medium text-amber-700">
                              Pending invite
                            </p>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {errors.participants ? (
                  <p className="mt-3 text-sm text-red-600">{errors.participants}</p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-900">Split method</h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {(['equal', 'exact', 'percent', 'shares'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSplitMethod(method)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        splitMethod === method
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {splitMethod !== 'equal' ? (
                  <div className="mt-6 space-y-3">
                    {selectedParticipants.map((participant) => (
                      <div
                        key={participant.membershipId}
                        className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 sm:grid-cols-[1fr_180px]"
                      >
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {participant.name}
                          </p>
                          <p className="text-xs text-neutral-500">{participant.email}</p>
                        </div>

                        <input
                          id={`split-input-${participant.membershipId}`}
                          aria-label={`Split input for ${participant.name}`}
                          value={inputValuesByMembershipId[participant.membershipId] ?? ''}
                          onChange={(event) =>
                            updateSplitInput(participant.membershipId, event.target.value)
                          }
                          inputMode="decimal"
                          placeholder={
                            splitMethod === 'exact'
                              ? 'Amount'
                              : splitMethod === 'percent'
                                ? 'Percent'
                                : 'Shares'
                          }
                          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-sm text-neutral-700">
                      Equal split is computed on the backend. Preview below uses the same
                      deterministic remainder order as the selected participant order.
                    </p>
                  </div>
                )}

                {errors.splitInputs ? (
                  <p className="mt-3 text-sm text-red-600">{errors.splitInputs}</p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-900">Review</h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <span className="text-neutral-500">Payer:</span>{' '}
                    <span className="font-medium text-neutral-900">
                      {selectableMembers.find(
                        (member) => member.membershipId === payerMembershipId,
                      )?.name ?? 'Not selected'}
                    </span>
                  </div>

                  {splitMethod === 'equal' && equalPreview.length > 0 ? (
                    <div className="space-y-2">
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

                  <p className="text-sm text-neutral-600">
                    Final split math and validation are owned by the backend.
                  </p>
                </div>

                {errors.form ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errors.form}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                  <Link
                    href={`/groups/${groupId}`}
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Saving expense...' : 'Save expense'}
                  </button>
                </div>
              </section>
            </form>
          </div>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}