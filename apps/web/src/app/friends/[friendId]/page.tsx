'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedRoute } from '@/components/layout/protected-route';
import { SettleUpModal } from '@/components/settlements/settle-up-modal';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  SectionHeader,
} from '@/components/ui';
import {
  getGroupBalances,
  getGroupDetails,
  listGroupActivity,
  listGroupExpenses,
  listGroupSettlements,
  type ExpenseListItem,
  type GroupActivityItem,
  type GroupBalancesResponse,
  type GroupDetailsResponse,
  type GroupMember,
  type SettlementHistoryItem,
  type SimplifiedBalance,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';

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

function formatPlainAmountFromMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-IN', {
    dateStyle: 'medium',
  });
}

function formatDateTime(value?: string): string {
  if (!value) {
    return 'Recently';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function buildActivitySummary(item: GroupActivityItem): string {
  const title =
    typeof item.metadata.title === 'string' ? item.metadata.title : 'Untitled';
  const amountMinor =
    typeof item.metadata.amountMinor === 'number'
      ? item.metadata.amountMinor
      : null;

  switch (item.actionType) {
    case 'group_created':
      return 'Direct ledger created';
    case 'expense_added':
      return `Expense added: "${title}"${
        amountMinor != null ? ` · ${formatPlainAmountFromMinor(amountMinor)}` : ''
      }`;
    case 'expense_edited':
      return `Expense edited: "${title}"`;
    case 'expense_deleted':
      return `Expense deleted: "${title}"`;
    case 'expense_restored':
      return `Expense restored: "${title}"`;
    case 'settlement_recorded':
      return `Settlement recorded${
        amountMinor != null ? ` · ${formatPlainAmountFromMinor(amountMinor)}` : ''
      }`;
    default:
      return 'Activity update';
  }
}

function getInitials(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getMemberDisplayName(
  membershipId: string,
  members: GroupMember[],
): string {
  const member = members.find((item) => item.membershipId === membershipId);

  if (!member) {
    return 'Unknown member';
  }

  return member.name || member.email || 'Unknown member';
}

function describeSettlementItem(
  item: SettlementHistoryItem,
  members: GroupMember[],
): string {
  return `${getMemberDisplayName(
    item.fromMembershipId,
    members,
  )} paid ${getMemberDisplayName(item.toMembershipId, members)} ${formatCurrencyFromMinor(
    item.amountMinor,
    item.currency,
  )} in cash`;
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <SectionHeader
            title={title}
            {...(subtitle ? { description: subtitle } : {})}
            {...(action ? { action } : {})}
          />
          <div className="mt-5">{children}</div>
        </CardContent>
      </Card>
    </section>
  );
}

function MemberAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--ledgerly-primary-soft)] text-lg font-black text-[color:var(--ledgerly-primary)]">
      {getInitials(name) || 'L'}
    </div>
  );
}

function resolveCurrentBalanceCopy(amountMinor: number, friendName: string) {
  if (amountMinor === 0) {
    return {
      label: 'You are settled up.',
      tone: 'neutral' as const,
      amountMinor: 0,
    };
  }

  if (amountMinor > 0) {
    return {
      label: `${friendName} owes you`,
      tone: 'positive' as const,
      amountMinor,
    };
  }

  return {
    label: `You owe ${friendName}`,
    tone: 'negative' as const,
    amountMinor: Math.abs(amountMinor),
  };
}

export default function FriendDetailsPage() {
  const params = useParams<{ friendId: string }>();
  const { accessToken, user } = useAuth();

  const directGroupId = params.friendId;

  const [groupDetails, setGroupDetails] =
    useState<GroupDetailsResponse | null>(null);
  const [balances, setBalances] = useState<GroupBalancesResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [activityItems, setActivityItems] = useState<GroupActivityItem[]>([]);
  const [settlementItems, setSettlementItems] = useState<
    SettlementHistoryItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedBalance, setSelectedBalance] =
    useState<SimplifiedBalance | null>(null);
  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false);

  const loadFriendLedger = useCallback(async () => {
    if (!accessToken || !directGroupId) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [
        nextGroupDetails,
        nextBalances,
        nextExpenses,
        nextActivity,
        nextSettlements,
      ] = await Promise.all([
        getGroupDetails(directGroupId, accessToken),
        getGroupBalances(directGroupId, accessToken),
        listGroupExpenses(directGroupId, accessToken, { page: 1, limit: 20 }),
        listGroupActivity(directGroupId, accessToken, { page: 1, limit: 10 }),
        listGroupSettlements(directGroupId, accessToken, {
          page: 1,
          limit: 10,
        }),
      ]);

      if (nextGroupDetails.group.type !== 'direct') {
        setErrorMessage('This page only supports direct friend ledgers.');
        setGroupDetails(null);
        setBalances(null);
        setExpenses([]);
        setActivityItems([]);
        setSettlementItems([]);
        return;
      }

      setGroupDetails(nextGroupDetails);
      setBalances(nextBalances);
      setExpenses(nextExpenses.items);
      setActivityItems(nextActivity.items);
      setSettlementItems(nextSettlements.items);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Failed to load friend ledger.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, directGroupId]);

  useEffect(() => {
    void loadFriendLedger();
  }, [loadFriendLedger]);

  const currentMember = useMemo(() => {
    if (!groupDetails || !user) {
      return null;
    }

    return groupDetails.members.find((member) => member.userId === user.id) ?? null;
  }, [groupDetails, user]);

  const otherMember = useMemo(() => {
    if (!groupDetails || !user) {
      return null;
    }

    return groupDetails.members.find((member) => member.userId !== user.id) ?? null;
  }, [groupDetails, user]);

  const friendName = otherMember?.name ?? otherMember?.email ?? 'Friend ledger';
  const currentBalance = resolveCurrentBalanceCopy(
    currentMember?.cachedNetBalanceMinor ?? 0,
    friendName,
  );

  function openSettleUpModal(balance: SimplifiedBalance) {
    setSelectedBalance(balance);
    setIsSettleUpModalOpen(true);
  }

  function closeSettleUpModal() {
    setSelectedBalance(null);
    setIsSettleUpModalOpen(false);
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {errorMessage ? (
          <section>
            <Card variant="danger">
              <CardContent className="p-6">
                <h1 className="text-lg font-bold text-[color:var(--ledgerly-danger)]">
                  Could not load friend ledger
                </h1>
                <p className="mt-2 text-sm text-[color:var(--ledgerly-danger)]">
                  {errorMessage}
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {isLoading ? (
          <section>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-[color:var(--ledgerly-muted)]">
                  Loading friend ledger...
                </p>
              </CardContent>
            </Card>
          </section>
        ) : groupDetails && balances ? (
          <div className="space-y-6">
            <section>
              <Card variant="elevated">
                <CardContent className="p-6">
                  <PageHeader
                    eyebrow="Friend ledger"
                    title={friendName}
                    description="Private 1:1 expense tracking and settlements."
                    actions={
                      <>
                        <Link
                          href="/dashboard"
                          className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
                        >
                          Back to dashboard
                        </Link>

                        <Link
                          href={`/expenses/new?groupId=${directGroupId}`}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--ledgerly-primary-dark)]"
                        >
                          Add expense
                        </Link>
                      </>
                    }
                  />

                  <div className="mt-7 grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                    <div className="rounded-[var(--ledgerly-radius-lg)] bg-[var(--ledgerly-surface-soft)] p-5">
                      <div className="flex items-center gap-4">
                        <MemberAvatar name={friendName} />

                        <div>
                          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                            Current balance
                          </p>

                          <p className="mt-2 text-lg font-bold text-[color:var(--ledgerly-text)]">
                            {currentBalance.label}
                          </p>

                          {currentBalance.amountMinor > 0 ? (
                            <p
                              className={`mt-1 text-3xl font-bold tracking-[-0.04em] ${
                                currentBalance.tone === 'positive'
                                  ? 'text-[color:var(--ledgerly-positive)]'
                                  : 'text-[color:var(--ledgerly-negative)]'
                              }`}
                            >
                              {formatPlainAmountFromMinor(
                                currentBalance.amountMinor,
                              )}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[var(--ledgerly-radius-lg)] bg-[var(--ledgerly-surface-soft)] p-5">
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                        Ledger type
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
                        Direct
                      </p>
                    </div>

                    <div className="rounded-[var(--ledgerly-radius-lg)] bg-[var(--ledgerly-surface-soft)] p-5">
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                        Expenses
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
                        {expenses.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                <SectionCard
                  title="Current balance"
                  subtitle="Simplified payable relation for this direct ledger."
                >
                  {balances.simplifiedBalances.length === 0 ? (
                    <EmptyState
                      title="You are settled up."
                      description="There is no current payable relation with this friend."
                    />
                  ) : (
                    <div className="space-y-3">
                      {balances.simplifiedBalances.map((balance) => (
                        <article
                          key={`${balance.fromMembershipId}-${balance.toMembershipId}`}
                          className="rounded-2xl border border-[color:var(--ledgerly-border)] p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-1 text-sm font-bold text-[color:var(--ledgerly-text)]">
                                <span>
                                  {getMemberDisplayName(
                                    balance.fromMembershipId,
                                    groupDetails.members,
                                  )}
                                </span>
                                <span className="text-[color:var(--ledgerly-muted)]">
                                  owes
                                </span>
                                <span>
                                  {getMemberDisplayName(
                                    balance.toMembershipId,
                                    groupDetails.members,
                                  )}
                                </span>
                              </p>

                              <p className="mt-2 text-xl font-bold tracking-[-0.02em] text-[color:var(--ledgerly-negative)]">
                                {formatPlainAmountFromMinor(balance.amountMinor)}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openSettleUpModal(balance)}
                            >
                              Settle up
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Settlement history"
                  subtitle="Manual cash settlements recorded for this friend ledger."
                >
                  {settlementItems.length === 0 ? (
                    <EmptyState
                      title="No settlements recorded yet."
                      description="When a cash settlement is recorded, it will appear here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {settlementItems.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-[color:var(--ledgerly-border)] p-4"
                        >
                          <p className="text-sm font-bold text-[color:var(--ledgerly-text)]">
                            {describeSettlementItem(item, groupDetails.members)}
                          </p>

                          {item.note ? (
                            <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                              {item.note}
                            </p>
                          ) : null}

                          <p className="mt-2 text-xs text-[color:var(--ledgerly-faint)]">
                            {formatDateTime(item.settledAt)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Expense history"
                  subtitle="Expenses recorded in this 1:1 ledger."
                  action={
                    <Link
                      href={`/expenses/new?groupId=${directGroupId}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--ledgerly-primary-dark)]"
                    >
                      New expense
                    </Link>
                  }
                >
                  {expenses.length === 0 ? (
                    <EmptyState
                      title="No expenses yet"
                      description="Add the first expense to start this ledger."
                      action={
                        <Link
                          href={`/expenses/new?groupId=${directGroupId}`}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--ledgerly-primary-dark)]"
                        >
                          Add first expense
                        </Link>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {expenses.map((expense) => (
                        <article
                          key={expense.id}
                          className="rounded-2xl border border-[color:var(--ledgerly-border)] p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[color:var(--ledgerly-text)]">
                                {expense.title}
                              </p>

                              <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                                {formatCurrencyFromMinor(
                                  expense.amountMinor,
                                  expense.currency,
                                )}{' '}
                                · {formatDate(expense.dateIncurred)}
                              </p>
                            </div>

                            <Link
                              href={`/expenses/${expense.id}/edit`}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-3 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:bg-[var(--ledgerly-surface-soft)]"
                            >
                              Edit
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Recent activity"
                  subtitle="Recent changes in this direct ledger."
                >
                  {activityItems.length === 0 ? (
                    <EmptyState
                      title="No recent activity yet."
                      description="Expenses, settlements, and edits will show up here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {activityItems.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-[color:var(--ledgerly-border)] p-4"
                        >
                          <p className="text-sm font-bold leading-6 text-[color:var(--ledgerly-text)]">
                            {buildActivitySummary(item)}
                          </p>

                          <p className="mt-1 text-xs text-[color:var(--ledgerly-faint)]">
                            {formatDateTime(item.createdAt)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          </div>
        ) : null}

        <SettleUpModal
          groupId={directGroupId}
          accessToken={accessToken}
          currency={groupDetails?.group.defaultCurrency ?? 'INR'}
          members={groupDetails?.members ?? []}
          balance={selectedBalance}
          isOpen={isSettleUpModalOpen}
          onClose={closeSettleUpModal}
          onSettlementCreated={loadFriendLedger}
        />
      </main>
    </ProtectedRoute>
  );
}