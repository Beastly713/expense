'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  SectionHeader,
} from '@/components/ui';
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

const inputClassName =
  'ledgerly-focus-ring w-full rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3 text-sm text-[color:var(--ledgerly-text)] transition placeholder:text-[color:var(--ledgerly-faint)] disabled:cursor-not-allowed disabled:opacity-60';

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

function buildExpenseReturnHref(
  groupDetails: GroupDetailsResponse | null,
  groupId: string,
): string {
  if (groupDetails?.group.type === 'direct') {
    return `/friends/${groupId}`;
  }

  return `/groups/${groupId}`;
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <SectionHeader
            title={title}
            {...(description ? { description } : {})}
          />
          <div className="mt-5">{children}</div>
        </CardContent>
      </Card>
    </section>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-2 text-sm font-medium text-[color:var(--ledgerly-danger)]">
      {message}
    </p>
  );
}

function getSplitMethodDescription(method: ExpenseSplitMethod): string {
  switch (method) {
    case 'equal':
      return 'Backend divides the amount evenly and handles any final-cent remainder.';
    case 'exact':
      return 'Enter the exact amount each participant should owe.';
    case 'percent':
      return 'Enter percentages that add up to 100.';
    case 'shares':
      return 'Enter relative shares and Ledgerly will compute proportional amounts.';
    default:
      return 'Choose how this expense should be split.';
  }
}

export default function EditExpensePage() {
  const params = useParams<{ expenseId: string }>();
  const router = useRouter();
  const expenseId =
    typeof params?.expenseId === 'string' ? params.expenseId.trim() : '';

  const { accessToken } = useAuth();

  const [groupDetails, setGroupDetails] =
    useState<GroupDetailsResponse | null>(null);
  const [expenseDetails, setExpenseDetails] =
    useState<ExpenseDetailsResponse | null>(null);
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
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<string[]>(
    [],
  );
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
    return (groupDetails?.members ?? []).filter(
      (member) => member.status !== 'removed',
    );
  }, [groupDetails]);

  const selectedParticipants = useMemo(() => {
    return visibleMembers
      .filter((member) => selectedMembershipIds.includes(member.membershipId))
      .map((member) => ({
        membershipId: member.membershipId,
        name: member.name,
        email: member.email,
        status: member.status,
        inputValue: inputValuesByMembershipId[member.membershipId] ?? '',
      }));
  }, [inputValuesByMembershipId, selectedMembershipIds, visibleMembers]);

  const amountMinor = useMemo(() => {
    const numeric = Number(amount);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 0;
    }

    return Math.round(numeric * 100);
  }, [amount]);

  const equalPreview = useMemo(() => {
    if (!groupDetails || splitMethod !== 'equal' || selectedParticipants.length === 0) {
      return [];
    }

    const parsedAmountMinor = parseAmountToMinorUnits(amount);

    if (!Number.isFinite(parsedAmountMinor) || parsedAmountMinor <= 0) {
      return [];
    }

    const baseShare = Math.floor(parsedAmountMinor / selectedParticipants.length);
    let remainder = parsedAmountMinor - baseShare * selectedParticipants.length;

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

      router.push(
        buildExpenseReturnHref(groupDetails, expenseDetails.expense.groupId),
      );
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

  const returnHref = expenseDetails?.expense.groupId
    ? buildExpenseReturnHref(groupDetails, expenseDetails.expense.groupId)
    : '/dashboard';

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        {isLoading ? (
          <section>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-[color:var(--ledgerly-muted)]">
                  Loading expense details...
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!isLoading && loadError ? (
          <section>
            <Card variant="danger">
              <CardContent className="p-6">
                <h1 className="text-lg font-bold text-[color:var(--ledgerly-danger)]">
                  Could not load expense
                </h1>
                <p className="mt-2 text-sm text-[color:var(--ledgerly-danger)]">
                  {loadError}
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!isLoading && !loadError && groupDetails && expenseDetails ? (
          <div className="space-y-6">
            <section>
              <Card variant="elevated">
                <CardContent className="p-6">
                  <PageHeader
                    eyebrow="Edit expense"
                    title="Edit expense"
                    description="Update the expense details and save changes. Ledgerly will recalculate balances from the source records."
                    actions={
                      <Link
                        href={returnHref}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
                      >
                        ← Back
                      </Link>
                    }
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-warning)] bg-[var(--ledgerly-warning-soft)] p-5">
                      <h2 className="text-sm font-bold text-[color:var(--ledgerly-warning)]">
                        Balance recalculation warning
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-warning)]">
                        Editing this expense will recalculate balances.
                      </p>
                    </div>

                    <div className="rounded-[var(--ledgerly-radius-lg)] bg-[var(--ledgerly-surface-soft)] p-5">
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                        Amount preview
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[color:var(--ledgerly-text)]">
                        {amountMinor > 0
                          ? formatCurrencyFromMinor(
                              amountMinor,
                              groupDetails.group.defaultCurrency,
                            )
                          : `${groupDetails.group.defaultCurrency} 0.00`}
                      </p>
                    </div>
                  </div>

                  {expenseDetails.expense.isDeleted ? (
                    <div className="mt-5 rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
                      This expense is deleted and cannot be edited.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <form onSubmit={handleSubmit} className="space-y-6">
              <FormSection
                title="Basic info"
                description="Keep the title, amount, date, and notes accurate."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="expense-title"
                      className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
                    >
                      Title
                    </label>
                    <input
                      id="expense-title"
                      aria-label="Title"
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className={inputClassName}
                      placeholder="Dinner"
                    />
                    <FieldError message={errors.title} />
                  </div>

                  <div>
                    <label
                      htmlFor="expense-amount"
                      className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
                    >
                      Amount
                    </label>
                    <input
                      id="expense-amount"
                      aria-label="Amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className={inputClassName}
                      placeholder="1200.00"
                    />
                    <FieldError message={errors.amount} />
                  </div>

                  <div>
                    <label
                      htmlFor="expense-date"
                      className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
                    >
                      Date
                    </label>
                    <input
                      id="expense-date"
                      aria-label="Date"
                      type="date"
                      value={dateIncurred}
                      onChange={(event) => setDateIncurred(event.target.value)}
                      className={inputClassName}
                    />
                    <FieldError message={errors.dateIncurred} />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="expense-notes"
                      className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
                    >
                      Notes
                    </label>
                    <textarea
                      id="expense-notes"
                      aria-label="Notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={4}
                      className={inputClassName}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Who paid"
                description="The payer must be a valid group or direct-ledger participant."
              >
                <label
                  htmlFor="expense-payer"
                  className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
                >
                  Payer
                </label>
                <select
                  id="expense-payer"
                  aria-label="Payer"
                  value={payerMembershipId}
                  onChange={(event) => setPayerMembershipId(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Select payer</option>
                  {visibleMembers.map((member) => (
                    <option key={member.membershipId} value={member.membershipId}>
                      {member.name} {member.status === 'pending' ? '(pending)' : ''}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.payerMembershipId} />
              </FormSection>

              <FormSection
                title="Who is involved"
                description="Select at least 2 participants. Pending invitees remain valid participants."
              >
                {visibleMembers.length === 0 ? (
                  <EmptyState
                    title="No selectable members"
                    description="This expense cannot be edited until members are available."
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleMembers.map((member) => {
                      const checked = selectedMembershipIds.includes(
                        member.membershipId,
                      );

                      return (
                        <label
                          key={member.membershipId}
                          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                            checked
                              ? 'border-[color:var(--ledgerly-primary)] bg-[var(--ledgerly-primary-soft)]'
                              : 'border-[color:var(--ledgerly-border)] bg-white hover:bg-[var(--ledgerly-surface-soft)]'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-[color:var(--ledgerly-text)]">
                              {member.name}
                            </span>
                            <span className="block truncate text-xs text-[color:var(--ledgerly-muted)]">
                              {member.email}
                            </span>
                            {member.status === 'pending' ? (
                              <span className="mt-2 inline-flex">
                                <Badge variant="warning">Pending invite</Badge>
                              </span>
                            ) : null}
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
                            className="mt-1"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}

                <FieldError message={errors.participants} />
              </FormSection>

              <FormSection
                title="Split method"
                description={getSplitMethodDescription(splitMethod)}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(['equal', 'exact', 'percent', 'shares'] as const).map(
                    (method) => {
                      const selected = splitMethod === method;

                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSplitMethod(method)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                            selected
                              ? 'border-[color:var(--ledgerly-primary)] bg-[var(--ledgerly-primary)] text-white'
                              : 'border-[color:var(--ledgerly-border)] bg-white text-[color:var(--ledgerly-text)] hover:bg-[var(--ledgerly-surface-soft)]'
                          }`}
                        >
                          <span className="capitalize">{method}</span>
                        </button>
                      );
                    },
                  )}
                </div>

                {splitMethod !== 'equal' ? (
                  <div className="mt-5 space-y-3">
                    {selectedParticipants.map((participant) => (
                      <label
                        key={participant.membershipId}
                        className="grid gap-3 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3 sm:grid-cols-[1fr_180px]"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[color:var(--ledgerly-text)]">
                            {participant.name}
                          </span>
                          <span className="block text-xs text-[color:var(--ledgerly-muted)]">
                            {participant.email}
                          </span>
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
                          className={inputClassName}
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
                ) : (
                  <div className="mt-5 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-4">
                    <p className="text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                      Equal split is recomputed on save. The preview below
                      follows the selected participant order.
                    </p>
                  </div>
                )}

                <FieldError message={errors.splitInputs} />
              </FormSection>

              <FormSection
                title="Review"
                description="Review the current state before saving changes."
              >
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3">
                    <span className="text-[color:var(--ledgerly-muted)]">Group</span>
                    <span className="font-bold text-[color:var(--ledgerly-text)]">
                      {groupDetails.group.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3">
                    <span className="text-[color:var(--ledgerly-muted)]">
                      Currency
                    </span>
                    <span className="font-bold text-[color:var(--ledgerly-text)]">
                      {groupDetails.group.defaultCurrency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3">
                    <span className="text-[color:var(--ledgerly-muted)]">
                      Participants
                    </span>
                    <span className="font-bold text-[color:var(--ledgerly-text)]">
                      {selectedParticipants.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3">
                    <span className="text-[color:var(--ledgerly-muted)]">
                      Split method
                    </span>
                    <span className="font-bold capitalize text-[color:var(--ledgerly-text)]">
                      {splitMethod}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3">
                    <span className="text-[color:var(--ledgerly-muted)]">Payer</span>
                    <span className="font-bold text-[color:var(--ledgerly-text)]">
                      {visibleMembers.find(
                        (member) => member.membershipId === payerMembershipId,
                      )?.name ?? 'Not selected'}
                    </span>
                  </div>
                </div>

                {splitMethod === 'equal' && equalPreview.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    {equalPreview.map((item) => (
                      <div
                        key={item.membershipId}
                        className="flex items-center justify-between rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3"
                      >
                        <span className="text-[color:var(--ledgerly-text)]">
                          {item.name}
                        </span>
                        <span className="font-bold text-[color:var(--ledgerly-text)]">
                          {formatCurrencyFromMinor(
                            item.shareMinor,
                            groupDetails.group.defaultCurrency,
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <p className="mt-5 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                  Final split math and validation are owned by the backend.
                </p>
              </FormSection>

              {errors.form ? (
                <div className="rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
                  {errors.form}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link
                  href={buildExpenseReturnHref(
                    groupDetails,
                    expenseDetails.expense.groupId,
                  )}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
                >
                  Cancel
                </Link>

                <Button
                  type="submit"
                  disabled={isSubmitting || expenseDetails.expense.isDeleted}
                >
                  {isSubmitting ? 'Saving changes...' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}