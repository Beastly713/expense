'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { InviteMembersModal } from '@/components/groups/invite-members-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { SettleUpModal } from '@/components/settlements/settle-up-modal';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  MoneyAmount,
  PageHeader,
  SectionHeader,
} from '@/components/ui';
import {
  cancelGroupInvite,
  deleteExpense,
  getGroupBalances,
  getGroupDetails,
  listGroupActivity,
  listGroupExpenses,
  listGroupInvites,
  listGroupSettlements,
  resendGroupInvite,
  restoreExpense,
  type ExpenseListItem,
  type GroupActivityItem,
  type GroupBalancesResponse,
  type GroupDetailsResponse,
  type GroupMember,
  type InviteItem,
  type SettlementHistoryItem,
  type SimplifiedBalance,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';

interface PendingMemberView extends GroupMember {
  invitationId: string | null;
  invitedAt: string | null;
}

const EXPENSE_PAGE_LIMIT = 10;

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

function NetBalancePill({
  amountMinor,
  currency,
}: {
  amountMinor: number;
  currency: string;
}) {
  if (amountMinor === 0) {
    return <Badge variant="neutral">Settled up</Badge>;
  }

  if (amountMinor > 0) {
    return (
      <Badge variant="success">
        Gets back {formatCurrencyFromMinor(amountMinor, currency)}
      </Badge>
    );
  }

  return (
    <Badge variant="warning">
      Owes {formatCurrencyFromMinor(Math.abs(amountMinor), currency)}
    </Badge>
  );
}

function MemberAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ledgerly-primary-soft)] text-sm font-black text-[color:var(--ledgerly-primary)]">
      {getInitials(name) || 'L'}
    </div>
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
      <div className="w-full max-w-md rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="delete-expense-modal-title"
              className="text-xl font-bold tracking-[-0.02em] text-[color:var(--ledgerly-text)]"
            >
              Delete expense
            </h2>

            <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
              This will soft-delete the expense and recalculate balances. You can
              restore it later from activity.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg px-2 py-1 text-sm text-[color:var(--ledgerly-muted)] transition hover:bg-[var(--ledgerly-surface-soft)] hover:text-[color:var(--ledgerly-text)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close delete expense modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-4">
          <p className="text-sm font-bold text-[color:var(--ledgerly-text)]">
            {expense.title}
          </p>
          <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
            {formatCurrencyFromMinor(expense.amountMinor, currency)} ·{' '}
            {formatDate(expense.dateIncurred)}
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete expense'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function GroupDetailsPage() {
  const params = useParams<{ groupId: string }>();
  const groupId =
    typeof params?.groupId === 'string' ? params.groupId.trim() : '';
  const { accessToken } = useAuth();

  const [groupDetails, setGroupDetails] =
    useState<GroupDetailsResponse | null>(null);
  const [balances, setBalances] = useState<GroupBalancesResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseSearchInput, setExpenseSearchInput] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [includeDeletedExpenses, setIncludeDeletedExpenses] = useState(false);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [activityItems, setActivityItems] = useState<GroupActivityItem[]>([]);
  const [settlementItems, setSettlementItems] = useState<
    SettlementHistoryItem[]
  >([]);
  const [settlementBalance, setSettlementBalance] =
    useState<SimplifiedBalance | null>(null);
  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [expensePendingDelete, setExpensePendingDelete] =
    useState<ExpenseListItem | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(
    null,
  );

  const loadGroupData = useCallback(async () => {
    if (!accessToken || !groupId) {
      setGroupDetails(null);
      setBalances(null);
      setExpenses([]);
      setExpenseTotal(0);
      setInvites([]);
      setActivityItems([]);
      setSettlementItems([]);
      setIsLoading(false);
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
        nextInvites,
        nextSettlements,
      ] = await Promise.all([
        getGroupDetails(groupId, accessToken),
        getGroupBalances(groupId, accessToken),
        listGroupExpenses(groupId, accessToken, {
          page: expensePage,
          limit: EXPENSE_PAGE_LIMIT,
          search: expenseSearch,
          includeDeleted: includeDeletedExpenses,
        }),
        listGroupActivity(groupId, accessToken, { page: 1, limit: 10 }),
        listGroupInvites(groupId, accessToken),
        listGroupSettlements(groupId, accessToken, { page: 1, limit: 10 }),
      ]);

      setGroupDetails(nextGroupDetails);
      setBalances(nextBalances);
      setExpenses(nextExpenses.items);
      setExpenseTotal(nextExpenses.pagination.total);
      setActivityItems(nextActivity.items);
      setInvites(nextInvites.invites);
      setSettlementItems(nextSettlements.items);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Failed to load group details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    accessToken,
    expensePage,
    expenseSearch,
    groupId,
    includeDeletedExpenses,
  ]);

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
    return (groupDetails?.members ?? []).filter(
      (member) => member.status === 'active',
    );
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

  const totalGroupBalanceMinor = useMemo(() => {
    return (groupDetails?.members ?? []).reduce((total, member) => {
      return total + Math.abs(member.cachedNetBalanceMinor);
    }, 0);
  }, [groupDetails?.members]);

  const expenseTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(expenseTotal / EXPENSE_PAGE_LIMIT));
  }, [expenseTotal]);

  const hasExpenseFilters =
    expenseSearch.trim().length > 0 || includeDeletedExpenses;

  function openSettleUpModal(balance: SimplifiedBalance) {
    setSettlementBalance(balance);
    setIsSettleUpModalOpen(true);
  }

  function closeSettleUpModal() {
    setSettlementBalance(null);
    setIsSettleUpModalOpen(false);
  }

  function handleExpenseSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExpensePage(1);
    setExpenseSearch(expenseSearchInput.trim());
  }

  function handleClearExpenseFilters() {
    setExpensePage(1);
    setExpenseSearch('');
    setExpenseSearchInput('');
    setIncludeDeletedExpenses(false);
  }

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
      typeof item.metadata.amountMinor === 'number'
        ? item.metadata.amountMinor
        : null;
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {isLoading ? (
          <section>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-[color:var(--ledgerly-muted)]">
                  Loading group details...
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!isLoading && errorMessage ? (
          <section>
            <Card variant="danger">
              <CardContent className="p-6">
                <h1 className="text-lg font-bold text-[color:var(--ledgerly-danger)]">
                  Could not load group
                </h1>
                <p className="mt-2 text-sm text-[color:var(--ledgerly-danger)]">
                  {errorMessage}
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!isLoading && !errorMessage && groupDetails && balances ? (
          <div className="space-y-6">
            <section>
              <Card variant="elevated" className="overflow-hidden">
                <CardContent className="p-6">
                  <PageHeader
                    eyebrow="Group"
                    title={groupDetails.group.name}
                    description={`${groupDetails.group.defaultCurrency} · ${activeMembers.length} active member${
                      activeMembers.length === 1 ? '' : 's'
                    } · ${pendingMembers.length} pending · ${
                      groupDetails.expenseCount
                    } expense${groupDetails.expenseCount === 1 ? '' : 's'}`}
                    actions={
                      <>
                        <Link
                          href={`/expenses/new?groupId=${groupId}`}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--ledgerly-primary-dark)]"
                        >
                          Add expense
                        </Link>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsInviteModalOpen(true)}
                        >
                          Invite members
                        </Button>
                      </>
                    }
                  />

                  <Link
                    href="/dashboard"
                    className="mt-5 inline-flex text-sm font-semibold text-[color:var(--ledgerly-muted)] transition hover:text-[color:var(--ledgerly-text)]"
                  >
                    ← Back to dashboard
                  </Link>

                  {actionMessage ? (
                    <div className="mt-5 rounded-2xl border border-[color:var(--ledgerly-positive)] bg-[var(--ledgerly-positive-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-positive)]">
                      {actionMessage}
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-[var(--ledgerly-surface-soft)] p-4">
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                        Active members
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
                        {activeMembers.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--ledgerly-surface-soft)] p-4">
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                        Pending invites
                      </p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
                        {pendingMembers.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--ledgerly-surface-soft)] p-4">
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                        Balance movement
                      </p>
                      <MoneyAmount
                        amountMinor={totalGroupBalanceMinor}
                        currency={groupDetails.group.defaultCurrency}
                        tone="neutral"
                        size="xl"
                        signMode="never"
                        className="mt-3 block"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <SectionCard
                  title="Members"
                  subtitle="Active members and their current group position."
                >
                  {activeMembers.length === 0 ? (
                    <EmptyState
                      title="No active members yet"
                      description="Once invited members accept, they will appear here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {activeMembers.map((member) => (
                        <div
                          key={member.membershipId}
                          className="flex flex-col gap-3 rounded-2xl border border-[color:var(--ledgerly-border)] p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <MemberAvatar name={member.name || member.email} />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[color:var(--ledgerly-text)]">
                                {member.name}
                              </p>
                              <p className="mt-1 truncate text-sm text-[color:var(--ledgerly-muted)]">
                                {member.email}
                              </p>
                            </div>
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
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsInviteModalOpen(true)}
                    >
                      Add invite
                    </Button>
                  }
                >
                  {pendingMembers.length === 0 ? (
                    <EmptyState
                      title="No pending invites"
                      description="Invite people by email when you are ready to split costs with them."
                    />
                  ) : (
                    <div className="space-y-3">
                      {pendingMembers.map((member) => (
                        <div
                          key={member.membershipId}
                          className="rounded-2xl border border-[color:var(--ledgerly-border)] p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <MemberAvatar name={member.email} />

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[color:var(--ledgerly-text)]">
                                  {member.email}
                                </p>
                                <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                                  Pending ·{' '}
                                  {formatDateTime(member.invitedAt ?? undefined)}
                                </p>
                              </div>
                            </div>

                            <NetBalancePill
                              amountMinor={member.cachedNetBalanceMinor}
                              currency={groupDetails.group.defaultCurrency}
                            />
                          </div>

                          {member.invitationId ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleResendInvite(member.invitationId!)
                                }
                                disabled={
                                  pendingActionKey ===
                                  `invite-resend:${member.invitationId}`
                                }
                              >
                                {pendingActionKey ===
                                `invite-resend:${member.invitationId}`
                                  ? 'Resending...'
                                  : 'Resend invite'}
                              </Button>

                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  handleCancelInvite(member.invitationId!)
                                }
                                disabled={
                                  pendingActionKey ===
                                  `invite-cancel:${member.invitationId}`
                                }
                              >
                                {pendingActionKey ===
                                `invite-cancel:${member.invitationId}`
                                  ? 'Cancelling...'
                                  : 'Cancel invite'}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Recent expenses"
                  subtitle="Search and filter group expenses without changing the financial source of truth."
                  action={
                    <Link
                      href={`/expenses/new?groupId=${groupId}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--ledgerly-primary-dark)]"
                    >
                      New expense
                    </Link>
                  }
                >
                  <div className="mb-5 rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-4">
                    <form
                      className="grid gap-3 md:grid-cols-[1fr_auto_auto]"
                      onSubmit={handleExpenseSearchSubmit}
                    >
                      <div>
                        <label
                          htmlFor="expense-search"
                          className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
                        >
                          Search expenses
                        </label>
                        <input
                          id="expense-search"
                          type="search"
                          value={expenseSearchInput}
                          onChange={(event) =>
                            setExpenseSearchInput(event.target.value)
                          }
                          placeholder="Search by title or notes"
                          className="ledgerly-focus-ring w-full rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3 text-sm text-[color:var(--ledgerly-text)] transition placeholder:text-[color:var(--ledgerly-faint)]"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button type="submit" fullWidth>
                          Search
                        </Button>
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          fullWidth
                          onClick={handleClearExpenseFilters}
                        >
                          Clear
                        </Button>
                      </div>
                    </form>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold text-[color:var(--ledgerly-text)]">
                        <input
                          type="checkbox"
                          checked={includeDeletedExpenses}
                          onChange={(event) => {
                            setExpensePage(1);
                            setIncludeDeletedExpenses(event.target.checked);
                          }}
                        />
                        Include deleted expenses
                      </label>

                      <p className="text-xs leading-5 text-[color:var(--ledgerly-muted)]">
                        Uses server-side query filters, soft-delete filtering,
                        sorting, skip, and limit.
                      </p>
                    </div>

                    {hasExpenseFilters ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {expenseSearch ? (
                          <Badge variant="brand">Search: {expenseSearch}</Badge>
                        ) : null}
                        {includeDeletedExpenses ? (
                          <Badge variant="warning">Deleted included</Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {expenses.length === 0 ? (
                    <EmptyState
                      title={
                        hasExpenseFilters
                          ? 'No expenses matched'
                          : 'No expenses yet'
                      }
                      description={
                        hasExpenseFilters
                          ? 'Try a different search term or clear the filters.'
                          : 'Add the first expense to start tracking balances in this group.'
                      }
                      action={
                        !hasExpenseFilters ? (
                          <Link
                            href={`/expenses/new?groupId=${groupId}`}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--ledgerly-primary-dark)]"
                          >
                            Add first expense
                          </Link>
                        ) : undefined
                      }
                    />
                  ) : (
                    <>
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-[color:var(--ledgerly-muted)]">
                          Showing {expenses.length} of {expenseTotal} expense
                          {expenseTotal === 1 ? '' : 's'}
                        </p>

                        <p className="text-sm text-[color:var(--ledgerly-muted)]">
                          Page {expensePage} of {expenseTotalPages}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {expenses.map((expense) => (
                          <article
                            key={expense.id}
                            className="rounded-2xl border border-[color:var(--ledgerly-border)] p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-bold text-[color:var(--ledgerly-text)]">
                                    {expense.title}
                                  </p>

                                  {expense.isDeleted ? (
                                    <Badge variant="danger">Deleted</Badge>
                                  ) : null}
                                </div>

                                <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                                  {formatCurrencyFromMinor(
                                    expense.amountMinor,
                                    expense.currency,
                                  )}{' '}
                                  · {formatDate(expense.dateIncurred)}
                                </p>

                                <p className="mt-1 text-xs text-[color:var(--ledgerly-faint)]">
                                  Paid by{' '}
                                  {memberNameByMembershipId.get(
                                    expense.payerMembershipId,
                                  ) ?? 'Unknown member'}{' '}
                                  · split {expense.splitMethod}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/expenses/${expense.id}/edit`}
                                  className="inline-flex h-9 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-3 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:bg-[var(--ledgerly-surface-soft)]"
                                >
                                  Edit
                                </Link>

                                {!expense.isDeleted ? (
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => {
                                      setModalErrorMessage(null);
                                      setExpensePendingDelete(expense);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[color:var(--ledgerly-border)] pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={expensePage <= 1}
                          onClick={() =>
                            setExpensePage((current) => Math.max(1, current - 1))
                          }
                        >
                          Previous
                        </Button>

                        <p className="text-sm text-[color:var(--ledgerly-muted)]">
                          {expensePage} / {expenseTotalPages}
                        </p>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={expensePage >= expenseTotalPages}
                          onClick={() =>
                            setExpensePage((current) =>
                              Math.min(expenseTotalPages, current + 1),
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </>
                  )}
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Simplified balances"
                  subtitle="Primary UI shows who owes whom, not raw internal ledger math."
                >
                  {balances.simplifiedBalances.length === 0 ? (
                    <EmptyState
                      title="Everyone is settled up."
                      description="There is no current payable relation in this group."
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
                  subtitle="Manual cash settlements recorded for this group."
                >
                  {settlementItems.length === 0 ? (
                    <EmptyState
                      title="No settlements yet"
                      description="When someone records a cash settlement, it will appear here."
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

                <SectionCard
                  title="Recent activity"
                  subtitle="Deleted expenses can be restored directly from activity."
                  action={
                    <Link
                      href="/activity"
                      className="text-sm font-bold text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline"
                    >
                      View full activity
                    </Link>
                  }
                >
                  {activityItems.length === 0 ? (
                    <EmptyState
                      title="No activity yet"
                      description="Expense edits, settlements, invites, and restores will appear here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {activityItems.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-[color:var(--ledgerly-border)] p-4"
                        >
                          <p className="text-sm font-bold leading-6 text-[color:var(--ledgerly-text)]">
                            {describeActivityItem(item)}
                          </p>

                          <p className="mt-1 text-xs text-[color:var(--ledgerly-faint)]">
                            {formatDateTime(item.createdAt)}
                          </p>

                          {item.actionType === 'expense_deleted' &&
                          item.entityType === 'expense' ? (
                            <div className="mt-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreExpense(item.entityId)}
                                disabled={
                                  pendingActionKey ===
                                  `expense-restore:${item.entityId}`
                                }
                              >
                                {pendingActionKey ===
                                `expense-restore:${item.entityId}`
                                  ? 'Restoring...'
                                  : 'Restore'}
                              </Button>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
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

        <SettleUpModal
          groupId={groupId}
          accessToken={accessToken}
          currency={groupDetails?.group.defaultCurrency ?? 'INR'}
          members={groupDetails?.members ?? []}
          balance={settlementBalance}
          isOpen={isSettleUpModalOpen}
          onClose={closeSettleUpModal}
          onSettlementCreated={loadGroupData}
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