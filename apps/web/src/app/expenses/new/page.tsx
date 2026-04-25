'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

const inputClassName =
  'ledgerly-focus-ring w-full rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3 text-sm text-[color:var(--ledgerly-text)] transition placeholder:text-[color:var(--ledgerly-faint)] disabled:cursor-not-allowed disabled:opacity-60';

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

function buildGroupNavigationHref(
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

export default function NewExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId')?.trim() ?? '';

  const { accessToken, user } = useAuth();

  const [groupDetails, setGroupDetails] =
    useState<GroupDetailsResponse | null>(null);
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
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<string[]>(
    [],
  );
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
          currentUserMembership?.membershipId ??
            response.members[0]?.membershipId ??
            '',
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

      router.push(buildGroupNavigationHref(groupDetails, groupId));
      router.refresh();
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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        {isLoading ? (
          <section>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-[color:var(--ledgerly-muted)]">
                  Loading expense form...
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
                  Could not load expense form
                </h1>
                <p className="mt-2 text-sm text-[color:var(--ledgerly-danger)]">
                  {loadError}
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!isLoading && !loadError && groupDetails ? (
          <div className="space-y-6">
            <section>
              <Card variant="elevated">
                <CardContent className="p-6">
                  <PageHeader
                    eyebrow="Add expense"
                    title={`New expense in ${groupDetails.group.name}`}
                    description={`Paid by someone, split with the right people, and saved in ${groupDetails.group.defaultCurrency}.`}
                    actions={
                      <Link
                        href={buildGroupNavigationHref(groupDetails, groupId)}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
                      >
                        Back to group
                      </Link>
                    }
                  />

                  <div className="mt-6 rounded-[var(--ledgerly-radius-lg)] bg-[var(--ledgerly-surface-soft)] p-5">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                      Amount preview
                    </p>
                    <p className="mt-3 text-4xl font-bold tracking-[-0.06em] text-[color:var(--ledgerly-text)]">
                      {amountMinor > 0
                        ? formatCurrencyFromMinor(
                            amountMinor,
                            groupDetails.group.defaultCurrency,
                          )
                        : `${groupDetails.group.defaultCurrency} 0.00`}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--ledgerly-muted)]">
                      Final split math and validation are owned by the backend.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <form onSubmit={handleSubmit} className="space-y-6">
              <FormSection
                title="Basic info"
                description="Start with what this expense was for and when it happened."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="expense-title"
                      className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
                    >
                      Title
                    </label>
                    <input
                      id="expense-title"
                      aria-label="Title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Dinner"
                      className={inputClassName}
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
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      inputMode="decimal"
                      placeholder="1200.00"
                      className={inputClassName}
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

                  <div className="sm:col-span-2">
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
                      placeholder="Optional notes"
                      className={inputClassName}
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Who paid"
                description="Ledgerly supports one payer per expense in this MVP."
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
                  {selectableMembers.map((member) => (
                    <option key={member.membershipId} value={member.membershipId}>
                      {member.name}
                      {member.status === 'pending' ? ' (pending)' : ''}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.payerMembershipId} />
              </FormSection>

              <FormSection
                title="Who is involved"
                description="Select at least 2 participants. Pending invitees can participate in expenses."
              >
                {selectableMembers.length === 0 ? (
                  <EmptyState
                    title="No selectable members"
                    description="Invite members before creating a shared expense."
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectableMembers.map((member) => {
                      const isChecked = selectedMembershipIds.includes(
                        member.membershipId,
                      );

                      return (
                        <label
                          key={member.membershipId}
                          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                            isChecked
                              ? 'border-[color:var(--ledgerly-primary)] bg-[var(--ledgerly-primary-soft)]'
                              : 'border-[color:var(--ledgerly-border)] bg-white hover:bg-[var(--ledgerly-surface-soft)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleParticipant(member.membershipId)}
                            className="mt-1"
                          />

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
                <div className="grid gap-3 sm:grid-cols-4">
                  {(['equal', 'exact', 'percent', 'shares'] as const).map(
                    (method) => {
                      const isSelected = splitMethod === method;

                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSplitMethod(method)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                            isSelected
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
                  <div className="mt-6 space-y-3">
                    {selectedParticipants.map((participant) => (
                      <div
                        key={participant.membershipId}
                        className="grid gap-3 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3 sm:grid-cols-[1fr_180px]"
                      >
                        <div>
                          <p className="text-sm font-bold text-[color:var(--ledgerly-text)]">
                            {participant.name}
                          </p>
                          <p className="text-xs text-[color:var(--ledgerly-muted)]">
                            {participant.email}
                          </p>
                        </div>

                        <input
                          id={`split-input-${participant.membershipId}`}
                          aria-label={`Split input for ${participant.name}`}
                          value={
                            inputValuesByMembershipId[participant.membershipId] ?? ''
                          }
                          onChange={(event) =>
                            updateSplitInput(
                              participant.membershipId,
                              event.target.value,
                            )
                          }
                          inputMode="decimal"
                          placeholder={
                            splitMethod === 'exact'
                              ? 'Amount'
                              : splitMethod === 'percent'
                                ? 'Percent'
                                : 'Shares'
                          }
                          className={inputClassName}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-4">
                    <p className="text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                      Equal split is computed on the backend. The preview below
                      follows the selected participant order.
                    </p>
                  </div>
                )}

                <FieldError message={errors.splitInputs} />
              </FormSection>

              <FormSection
                title="Review"
                description="Check the payer, participants, and preview before saving."
              >
                <div className="space-y-3 text-sm">
                  <div className="rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3">
                    <span className="text-[color:var(--ledgerly-muted)]">
                      Payer:
                    </span>{' '}
                    <span className="font-bold text-[color:var(--ledgerly-text)]">
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

                  <p className="text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                    Backend validation will reject invalid split totals,
                    unsupported members, and currency mismatches.
                  </p>
                </div>

                {errors.form ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
                    {errors.form}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                  <Link
                    href={buildGroupNavigationHref(groupDetails, groupId)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
                  >
                    Cancel
                  </Link>

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving expense...' : 'Save expense'}
                  </Button>
                </div>
              </FormSection>
            </form>
          </div>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}