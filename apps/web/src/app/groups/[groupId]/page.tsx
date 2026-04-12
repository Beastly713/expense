'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InviteMembersModal } from '@/components/groups/invite-members-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  cancelGroupInvite,
  deleteExpense,
  getGroupBalances,
  getGroupDetails,
  listGroupActivity,
  listGroupExpenses,
  listGroupInvites,
  resendGroupInvite,
  restoreExpense,
  type ExpenseListItem,
  type GroupActivityItem,
  type GroupBalancesResponse,
  type GroupDetailsResponse,
  type GroupMember,
  type InviteItem,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';

interface PendingMemberView extends GroupMember {
  invitationId: string | null;
  invitedAt: string | null;
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
        {subtitle ? <p className="mt-1 text-sm text-neutral-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function NetBalancePill({
  amountMinor,
  currency,
}: {
  amountMinor: number;
  currency: string;
}) {
  const label =
    amountMinor === 0
      ? 'Settled up'
      : amountMinor > 0
      ? `Gets back ${formatCurrencyFromMinor(amountMinor, currency)}`
      : `Owes ${formatCurrencyFromMinor(Math.abs(amountMinor), currency)}`;

  const className =
    amountMinor === 0
      ? 'bg-neutral-100 text-neutral-700'
      : amountMinor > 0
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700';

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function DeleteExpenseModal({
  expense,
  currency,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: {
  expense: ExpenseListItem | null;
  currency: string;
  isDeleting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!expense) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-expense-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="delete-expense-modal-title"
              className="text-xl font-semibold text-neutral-900"
            >
              Delete expense
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              This will soft-delete the expense and recalculate balances. You can
              restore it later from activity.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg px-2 py-1 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close delete expense modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-900">{expense.title}</p>
          <p className="mt-1 text-sm text-neutral-600">
            {formatCurrencyFromMinor(expense.amountMinor, currency)} ·{' '}
            {formatDate(expense.dateIncurred)}
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GroupDetailsPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = typeof params?.groupId === 'string' ? params.groupId.trim() : '';
  const { accessToken } = useAuth();

  const [groupDetails, setGroupDetails] = useState<GroupDetailsResponse | null>(null);
  const [balances, setBalances] = useState<GroupBalancesResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [activityItems, setActivityItems] = useState<GroupActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [expensePendingDelete, setExpensePendingDelete] = useState<ExpenseListItem | null>(
    null,
  );
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  const loadGroupData = useCallback(async () => {
    if (!accessToken || !groupId) {
      setGroupDetails(null);
      setBalances(null);
      setExpenses([]);
      setInvites([]);
      setActivityItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [
        groupResponse,
        balancesResponse,
        expensesResponse,
        invitesResponse,
        activityResponse,
      ] = await Promise.all([
        getGroupDetails(groupId, accessToken),
        getGroupBalances(groupId, accessToken),
        listGroupExpenses(groupId, accessToken, { page: 1, limit: 20 }),
        listGroupInvites(groupId, accessToken),
        listGroupActivity(groupId, accessToken, { page: 1, limit: 10 }),
      ]);

      setGroupDetails(groupResponse);
      setBalances(balancesResponse);
      setExpenses(expensesResponse.items);
      setInvites(invitesResponse.invites);
      setActivityItems(activityResponse.items);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Failed to load group details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, groupId]);

  useEffect(() => {
    void loadGroupData();
  }, [loadGroupData]);

  const memberNameByMembershipId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of groupDetails?.members ?? []) {
      map.set(member.membershipId, member.name);
    }
    return map;
  }, [groupDetails?.members]);

  const actorNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of groupDetails?.members ?? []) {
      if (member.userId) {
        map.set(member.userId, member.name);
      }
    }
    return map;
  }, [groupDetails?.members]);

  const activeMembers = useMemo(() => {
    return (groupDetails?.members ?? []).filter((member) => member.status === 'active');
  }, [groupDetails?.members]);

  const pendingMembers = useMemo<PendingMemberView[]>(() => {
    const inviteByEmail = new Map(
      invites.map((invite) => [invite.email.toLowerCase(), invite] as const),
    );

    return (groupDetails?.members ?? [])
      .filter((member) => member.status === 'pending')
      .map((member) => {
        const invite = inviteByEmail.get(member.email.toLowerCase());
        return {
          ...member,
          invitationId: invite?.invitationId ?? null,
          invitedAt: invite?.invitedAt ?? null,
        };
      });
  }, [groupDetails?.members, invites]);

  async function handleResendInvite(invitationId: string) {
    if (!accessToken) {
      setActionMessage('You must be signed in to resend invites.');
      return;
    }

    try {
      setPendingActionKey(`invite-resend:${invitationId}`);
      setActionMessage(null);
      await resendGroupInvite(groupId, invitationId, accessToken);
      setActionMessage('Invite resent successfully.');
      await loadGroupData();
    } catch (error) {
      if (error instanceof ApiError) {
        setActionMessage(error.message);
      } else {
        setActionMessage('Failed to resend invite.');
      }
    } finally {
      setPendingActionKey(null);
    }
  }

  async function handleCancelInvite(invitationId: string) {
    if (!accessToken) {
      setActionMessage('You must be signed in to cancel invites.');
      return;
    }

    try {
      setPendingActionKey(`invite-cancel:${invitationId}`);
      setActionMessage(null);
      await cancelGroupInvite(groupId, invitationId, accessToken);
      setActionMessage('Invite cancelled successfully.');
      await loadGroupData();
    } catch (error) {
      if (error instanceof ApiError) {
        setActionMessage(error.message);
      } else {
        setActionMessage('Failed to cancel invite.');
      }
    } finally {
      setPendingActionKey(null);
    }
  }

  async function confirmDeleteExpense() {
    if (!accessToken || !expensePendingDelete) {
      setModalErrorMessage('You must be signed in to delete expenses.');
      return;
    }

    try {
      setPendingActionKey(`expense-delete:${expensePendingDelete.id}`);
      setModalErrorMessage(null);
      setActionMessage(null);
      await deleteExpense(expensePendingDelete.id, accessToken);
      setExpensePendingDelete(null);
      setActionMessage('Expense deleted successfully.');
      await loadGroupData();
    } catch (error) {
      if (error instanceof ApiError) {
        setModalErrorMessage(error.message);
      } else {
        setModalErrorMessage('Failed to delete expense.');
      }
    } finally {
      setPendingActionKey(null);
    }
  }

  async function handleRestoreExpense(expenseId: string) {
    if (!accessToken) {
      setActionMessage('You must be signed in to restore expenses.');
      return;
    }

    try {
      setPendingActionKey(`expense-restore:${expenseId}`);
      setActionMessage(null);
      await restoreExpense(expenseId, accessToken);
      setActionMessage('Expense restored successfully.');
      await loadGroupData();
    } catch (error) {
      if (error instanceof ApiError) {
        setActionMessage(error.message);
      } else {
        setActionMessage('Failed to restore expense.');
      }
    } finally {
      setPendingActionKey(null);
    }
  }

  function describeActivityItem(item: GroupActivityItem): string {
    const actorName = actorNameByUserId.get(item.actorUserId) ?? 'Someone';
    const title =
      typeof item.metadata.title === 'string' ? item.metadata.title : 'an expense';
    const amountMinor =
      typeof item.metadata.amountMinor === 'number' ? item.metadata.amountMinor : null;
    const email =
      typeof item.metadata.email === 'string' ? item.metadata.email : null;

    switch (item.actionType) {
      case 'group_created':
        return `${actorName} created the group`;
      case 'member_invited':
        return `${actorName} invited ${email ?? 'a member'}`;
      case 'invite_accepted':
        return `${actorName} accepted an invite`;
      case 'expense_added':
        return `${actorName} added "${title}"${
          amountMinor != null && groupDetails
            ? ` for ${formatCurrencyFromMinor(
                amountMinor,
                groupDetails.group.defaultCurrency,
              )}`
            : ''
        }`;
      case 'expense_edited':
        return `${actorName} edited "${title}"`;
      case 'expense_deleted':
        return `${actorName} deleted "${title}"`;
      case 'expense_restored':
        return `${actorName} restored "${title}"`;
      case 'settlement_recorded':
        return `${actorName} recorded a settlement${
          amountMinor != null && groupDetails
            ? ` of ${formatCurrencyFromMinor(
                amountMinor,
                groupDetails.group.defaultCurrency,
              )}`
            : ''
        }`;
      default:
        return `${actorName} made a change`;
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-600">Loading group details...</p>
          </section>
        ) : null}

        {!isLoading && errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-red-900">
              Could not load group
            </h1>
            <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
          </section>
        ) : null}

        {!isLoading && !errorMessage && groupDetails && balances ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
                  >
                    ← Back to dashboard
                  </Link>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                    {groupDetails.group.name}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-600">
                    {groupDetails.group.defaultCurrency} · {activeMembers.length} active
                    member{activeMembers.length === 1 ? '' : 's'} ·{' '}
                    {pendingMembers.length} pending
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/expenses/new?groupId=${groupId}`}
                    className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                  >
                    Add expense
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                  >
                    Invite members
                  </button>
                </div>
              </div>

              {actionMessage ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {actionMessage}
                </div>
              ) : null}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <SectionCard
                  title="Members"
                  subtitle="Active members and pending invitees in this group."
                >
                  {activeMembers.length === 0 ? (
                    <p className="text-sm text-neutral-600">No active members yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeMembers.map((member) => (
                        <div
                          key={member.membershipId}
                          className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-neutral-900">
                              {member.name}
                            </p>
                            <p className="mt-1 text-sm text-neutral-500">
                              {member.email}
                            </p>
                          </div>
                          <NetBalancePill
                            amountMinor={member.cachedNetBalanceMinor}
                            currency={groupDetails.group.defaultCurrency}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Pending invites"
                  subtitle="Pending invitees remain valid expense participants in MVP."
                >
                  {pendingMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                      No pending invites right now.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingMembers.map((member) => (
                        <div
                          key={member.membershipId}
                          className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4"
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">
                                {member.email}
                              </p>
                              <p className="text-sm text-neutral-500">
                                Pending · {formatDateTime(member.invitedAt ?? undefined)}
                              </p>
                            </div>
                            <NetBalancePill
                              amountMinor={member.cachedNetBalanceMinor}
                              currency={groupDetails.group.defaultCurrency}
                            />
                          </div>

                          {member.invitationId ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleResendInvite(member.invitationId!)}
                                disabled={
                                  pendingActionKey ===
                                  `invite-resend:${member.invitationId}`
                                }
                                className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {pendingActionKey ===
                                `invite-resend:${member.invitationId}`
                                  ? 'Resending...'
                                  : 'Resend invite'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelInvite(member.invitationId!)}
                                disabled={
                                  pendingActionKey ===
                                  `invite-cancel:${member.invitationId}`
                                }
                                className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {pendingActionKey ===
                                `invite-cancel:${member.invitationId}`
                                  ? 'Cancelling...'
                                  : 'Cancel invite'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Recent expenses"
                  subtitle="Active expenses are shown by default. Deleted expenses stay visible through activity."
                >
                  {expenses.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                      No expenses yet. Add the first expense to start tracking balances.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">
                                {expense.title}
                              </p>
                              <p className="mt-1 text-sm text-neutral-500">
                                {formatCurrencyFromMinor(
                                  expense.amountMinor,
                                  expense.currency,
                                )}{' '}
                                · {formatDate(expense.dateIncurred)}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                Paid by{' '}
                                {memberNameByMembershipId.get(expense.payerMembershipId) ??
                                  'Unknown member'}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/expenses/${expense.id}/edit`}
                                className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalErrorMessage(null);
                                  setExpensePendingDelete(expense);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Simplified balances"
                  subtitle="Primary UI shows who owes whom, not raw internal ledger math."
                >
                  {balances.simplifiedBalances.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                      Everyone is settled up.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {balances.simplifiedBalances.map((balance) => (
                        <div
                          key={`${balance.fromMembershipId}:${balance.toMembershipId}`}
                          className="rounded-xl border border-neutral-200 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-900">
                            <span>
                              {memberNameByMembershipId.get(balance.fromMembershipId) ??
                                'Unknown member'}
                            </span>
                            <span className="text-neutral-500">owes</span>
                            <span>
                              {memberNameByMembershipId.get(balance.toMembershipId) ??
                                'Unknown member'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-neutral-600">
                            {formatCurrencyFromMinor(
                              balance.amountMinor,
                              groupDetails.group.defaultCurrency,
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Recent activity"
                  subtitle="Deleted expenses can be restored directly from activity."
                >
                  {activityItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                      No activity yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-neutral-200 p-4"
                        >
                          <p className="text-sm font-medium text-neutral-900">
                            {describeActivityItem(item)}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {formatDateTime(item.createdAt)}
                          </p>

                          {item.actionType === 'expense_deleted' &&
                          item.entityType === 'expense' ? (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => handleRestoreExpense(item.entityId)}
                                disabled={
                                  pendingActionKey === `expense-restore:${item.entityId}`
                                }
                                className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {pendingActionKey === `expense-restore:${item.entityId}`
                                  ? 'Restoring...'
                                  : 'Restore'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    <Link
                      href="/activity"
                      className="text-sm font-medium text-neutral-700 underline"
                    >
                      View full activity
                    </Link>
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        ) : null}

        <InviteMembersModal
          groupId={groupId}
          accessToken={accessToken}
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onInvitesCreated={loadGroupData}
        />

        <DeleteExpenseModal
          expense={expensePendingDelete}
          currency={groupDetails?.group.defaultCurrency ?? 'INR'}
          isDeleting={
            expensePendingDelete != null &&
            pendingActionKey === `expense-delete:${expensePendingDelete.id}`
          }
          errorMessage={modalErrorMessage}
          onCancel={() => {
            if (
              expensePendingDelete &&
              pendingActionKey === `expense-delete:${expensePendingDelete.id}`
            ) {
              return;
            }
            setModalErrorMessage(null);
            setExpensePendingDelete(null);
          }}
          onConfirm={confirmDeleteExpense}
        />
      </main>
    </ProtectedRoute>
  );
}