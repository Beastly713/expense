'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedRoute } from '@/components/layout/protected-route';
import { SettleUpModal } from '@/components/settlements/settle-up-modal';
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

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

function formatDateTime(value?: string): string {
  if (!value) {
    return 'Recently';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function buildActivitySummary(item: GroupActivityItem): string {
  const title =
    typeof item.metadata.title === 'string' ? item.metadata.title : 'Untitled';
  const amountMinor =
    typeof item.metadata.amountMinor === 'number' ? item.metadata.amountMinor : null;

  switch (item.actionType) {
    case 'group_created':
      return 'Direct ledger created';
    case 'expense_added':
      return `Expense added: "${title}"${
        amountMinor != null ? ` · ${(amountMinor / 100).toFixed(2)}` : ''
      }`;
    case 'expense_edited':
      return `Expense edited: "${title}"`;
    case 'expense_deleted':
      return `Expense deleted: "${title}"`;
    case 'expense_restored':
      return `Expense restored: "${title}"`;
    case 'settlement_recorded':
      return `Settlement recorded${
        amountMinor != null ? ` · ${(amountMinor / 100).toFixed(2)}` : ''
      }`;
    default:
      return 'Activity update';
  }
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
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function FriendDetailsPage() {
  const params = useParams<{ friendId: string }>();
  const { accessToken, user } = useAuth();

  const directGroupId = params.friendId;

  const [groupDetails, setGroupDetails] = useState<GroupDetailsResponse | null>(null);
  const [balances, setBalances] = useState<GroupBalancesResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [activityItems, setActivityItems] = useState<GroupActivityItem[]>([]);
  const [settlementItems, setSettlementItems] = useState<SettlementHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedBalance, setSelectedBalance] = useState<SimplifiedBalance | null>(null);
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
        listGroupSettlements(directGroupId, accessToken, { page: 1, limit: 10 }),
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

    return (
      groupDetails.members.find((member) => member.userId === user.id) ?? null
    );
  }, [groupDetails, user]);

  const otherMember = useMemo(() => {
    if (!groupDetails || !user) {
      return null;
    }

    return (
      groupDetails.members.find((member) => member.userId !== user.id) ?? null
    );
  }, [groupDetails, user]);

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
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              {otherMember?.name ?? otherMember?.email ?? 'Friend ledger'}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Private 1:1 expense tracking and settlements.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
            >
              Back to dashboard
            </Link>
            <Link
              href={`/expenses/new?groupId=${directGroupId}`}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Add expense
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 shadow-sm">
            Loading friend ledger...
          </div>
        ) : groupDetails && balances ? (
          <div className="mt-8 space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                  Current balance
                </p>
                <p className="mt-3 text-2xl font-semibold text-neutral-900">
                  {formatCurrencyFromMinor(
                    currentMember?.cachedNetBalanceMinor ?? 0,
                    groupDetails.group.defaultCurrency,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                  Ledger type
                </p>
                <p className="mt-3 text-2xl font-semibold text-neutral-900">
                  Direct
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                  Expenses
                </p>
                <p className="mt-3 text-2xl font-semibold text-neutral-900">
                  {expenses.length}
                </p>
              </div>
            </section>

            <SectionCard
              title="Current balance"
              subtitle="Simplified payable relations for this direct ledger."
            >
              {balances.simplifiedBalances.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                  You are settled up.
                </div>
              ) : (
                <div className="space-y-3">
                  {balances.simplifiedBalances.map((balance) => (
                    <div
                      key={`${balance.fromMembershipId}-${balance.toMembershipId}`}
                      className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-900">
                          <span>
                            {getMemberDisplayName(
                              balance.fromMembershipId,
                              groupDetails.members,
                            )}
                          </span>
                          <span className="text-neutral-500">owes</span>
                          <span>
                            {getMemberDisplayName(
                              balance.toMembershipId,
                              groupDetails.members,
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-neutral-600">
                          {formatCurrencyFromMinor(
                            balance.amountMinor,
                            groupDetails.group.defaultCurrency,
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openSettleUpModal(balance)}
                        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                      >
                        Settle up
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Expense history"
              subtitle="Expenses recorded in this 1:1 ledger."
            >
              {expenses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                  No expenses yet. Add the first expense to start this ledger.
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {expense.title}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {formatCurrencyFromMinor(
                            expense.amountMinor,
                            expense.currency,
                          )}{' '}
                          · {formatDate(expense.dateIncurred)}
                        </p>
                      </div>

                      <Link
                        href={`/expenses/${expense.id}/edit`}
                        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                      >
                        Edit
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Settlement history"
              subtitle="Manual cash settlements recorded for this friend ledger."
            >
              {settlementItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                  No settlements recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {settlementItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-neutral-200 p-4"
                    >
                      <p className="text-sm font-medium text-neutral-900">
                        {describeSettlementItem(item, groupDetails.members)}
                      </p>
                      {item.note ? (
                        <p className="mt-1 text-sm text-neutral-600">{item.note}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-neutral-500">
                        {formatDateTime(item.settledAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Recent activity"
              subtitle="Recent changes in this direct ledger."
            >
              {activityItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                  No recent activity yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {activityItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-neutral-200 p-4"
                    >
                      <p className="text-sm font-medium text-neutral-900">
                        {buildActivitySummary(item)}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
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