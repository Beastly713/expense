'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { InviteMembersModal } from '@/components/groups/invite-members-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  cancelGroupInvite,
  getGroupBalances,
  getGroupDetails,
  listGroupExpenses,
  listGroupInvites,
  resendGroupInvite,
  type ExpenseListItem,
  type GroupBalancesResponse,
  type GroupDetailsResponse,
  type GroupMember,
  type InviteItem,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';

interface PendingMemberView extends GroupMember {
  invitationId?: string | undefined;
  invitedAt?: string | undefined;
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
    return 'Invite sent recently';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Invite sent recently';
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
        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
        ) : null}
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
        ? 'bg-green-100 text-green-700'
        : 'bg-amber-100 text-amber-700';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function GroupDetailsPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = typeof params?.groupId === 'string' ? params.groupId : '';
  const { accessToken } = useAuth();

  const [details, setDetails] = useState<GroupDetailsResponse | null>(null);
  const [balances, setBalances] = useState<GroupBalancesResponse | null>(null);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadGroupPage() {
      if (!accessToken || !groupId) {
        setDetails(null);
        setBalances(null);
        setInvites([]);
        setExpenses([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [detailsResponse, invitesResponse, balancesResponse, expensesResponse] =
          await Promise.all([
            getGroupDetails(groupId, accessToken),
            listGroupInvites(groupId, accessToken),
            getGroupBalances(groupId, accessToken),
            listGroupExpenses(groupId, accessToken, { page: 1, limit: 20 }),
          ]);

        setDetails(detailsResponse);
        setInvites(invitesResponse.invites);
        setBalances(balancesResponse);
        setExpenses(expensesResponse.items);
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Failed to load group details.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadGroupPage();
  }, [accessToken, groupId, isInviteModalOpen]);

  const activeMembers = useMemo(() => {
    return details?.members.filter((member) => member.status === 'active') ?? [];
  }, [details]);

  const pendingMembers = useMemo<PendingMemberView[]>(() => {
    if (!details) {
      return [];
    }

    const inviteByEmail = new Map(
      invites.map((invite) => [invite.email.toLowerCase(), invite]),
    );

    return details.members
      .filter((member) => member.status === 'pending')
      .map((member) => {
        const invite = inviteByEmail.get(member.email.toLowerCase());

        return {
          ...member,
          invitationId: invite?.invitationId,
          invitedAt: invite?.invitedAt,
        };
      });
  }, [details, invites]);

  async function handleResendInvite(invitationId: string) {
    if (!accessToken || !groupId) {
      return;
    }

    try {
      setActionError(null);
      setPendingActionId(invitationId);
      await resendGroupInvite(groupId, invitationId, accessToken);
      const refreshedInvites = await listGroupInvites(groupId, accessToken);
      setInvites(refreshedInvites.invites);
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Unable to resend invite right now.');
      }
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleCancelInvite(invitationId: string) {
    if (!accessToken || !groupId) {
      return;
    }

    try {
      setActionError(null);
      setPendingActionId(invitationId);
      await cancelGroupInvite(groupId, invitationId, accessToken);

      const [refreshedDetails, refreshedInvites] = await Promise.all([
        getGroupDetails(groupId, accessToken),
        listGroupInvites(groupId, accessToken),
      ]);

      setDetails(refreshedDetails);
      setInvites(refreshedInvites.invites);
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Unable to cancel invite right now.');
      }
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 shadow-sm">
            Loading group details...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading && !errorMessage && details ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                    {details.group.type === 'direct' ? 'Direct ledger' : 'Group'}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
                    {details.group.name}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-600">
                    Currency: {details.group.defaultCurrency} · {details.expenseCount}{' '}
                    expense{details.expenseCount === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/expenses/new?groupId=${details.group.id}`}
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
            </section>

            {actionError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <SectionCard
                  title="Simplified balances"
                  subtitle="Primary payable relationships for the group."
                >
                  {balances && balances.simplifiedBalances.length > 0 ? (
                    <div className="space-y-3">
                      {balances.simplifiedBalances.map((balance) => {
                        const fromMember = details.members.find(
                          (member) =>
                            member.membershipId === balance.fromMembershipId,
                        );
                        const toMember = details.members.find(
                          (member) =>
                            member.membershipId === balance.toMembershipId,
                        );

                        return (
                          <div
                            key={`${balance.fromMembershipId}-${balance.toMembershipId}`}
                            className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                          >
                            <p className="text-sm text-neutral-800">
                              <span className="font-medium">
                                {fromMember?.name ?? 'Unknown member'}
                              </span>{' '}
                              owes{' '}
                              <span className="font-medium">
                                {toMember?.name ?? 'Unknown member'}
                              </span>{' '}
                              <span className="font-semibold">
                                {formatCurrencyFromMinor(
                                  balance.amountMinor,
                                  details.group.defaultCurrency,
                                )}
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">
                      Everyone is settled up right now.
                    </p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Expenses"
                  subtitle="Most recent expenses in this group."
                >
                  {expenses.length > 0 ? (
                    <div className="space-y-3">
                      {expenses.map((expense) => {
                        const payer = details.members.find(
                          (member) =>
                            member.membershipId === expense.payerMembershipId,
                        );

                        return (
                          <div
                            key={expense.id}
                            className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-base font-semibold text-neutral-900">
                                  {expense.title}
                                </p>
                                <p className="mt-1 text-sm text-neutral-600">
                                  Paid by {payer?.name ?? 'Unknown member'} ·{' '}
                                  {formatDate(expense.dateIncurred)} ·{' '}
                                  {expense.splitMethod}
                                </p>
                              </div>

                              <div className="text-sm font-semibold text-neutral-900">
                                {formatCurrencyFromMinor(
                                  expense.amountMinor,
                                  expense.currency,
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                      <h3 className="text-base font-semibold text-neutral-900">
                        No expenses yet
                      </h3>
                      <p className="mt-2 text-sm text-neutral-600">
                        Add the first expense to start tracking balances.
                      </p>
                      <Link
                        href={`/expenses/new?groupId=${details.group.id}`}
                        className="mt-4 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                      >
                        Add first expense
                      </Link>
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Members"
                  subtitle="Active members and their current net positions."
                >
                  {activeMembers.length > 0 ? (
                    <div className="space-y-3">
                      {activeMembers.map((member) => {
                        const liveNetBalance =
                          balances?.memberNetBalances.find(
                            (item) => item.membershipId === member.membershipId,
                          )?.netBalanceMinor ?? member.cachedNetBalanceMinor;

                        return (
                          <div
                            key={member.membershipId}
                            className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-neutral-900">
                                  {member.name}
                                </p>
                                <p className="truncate text-xs text-neutral-500">
                                  {member.email}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-600">
                                Active
                              </span>
                            </div>
                            <NetBalancePill
                              amountMinor={liveNetBalance}
                              currency={details.group.defaultCurrency}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">
                      No active members yet.
                    </p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Pending invites"
                  subtitle="Pending members remain selectable in expenses."
                >
                  {pendingMembers.length > 0 ? (
                    <div className="space-y-3">
                      {pendingMembers.map((member) => (
                        <div
                          key={member.membershipId}
                          className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-neutral-900">
                                {member.name}
                              </p>
                              <p className="truncate text-xs text-neutral-500">
                                {member.email}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {formatDateTime(member.invitedAt)}
                              </p>
                            </div>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                              Pending
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {member.invitationId ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResendInvite(member.invitationId!)
                                  }
                                  disabled={pendingActionId === member.invitationId}
                                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {pendingActionId === member.invitationId
                                    ? 'Working...'
                                    : 'Resend invite'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCancelInvite(member.invitationId!)
                                  }
                                  disabled={pendingActionId === member.invitationId}
                                  className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel invite
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">
                      No pending invites right now.
                    </p>
                  )}
                </SectionCard>
              </div>
            </div>
          </div>
        ) : null}

        <InviteMembersModal
  isOpen={isInviteModalOpen}
  groupId={groupId}
  accessToken={accessToken ?? ''}
  onClose={() => setIsInviteModalOpen(false)}
  onInvitesCreated={async () => {
    if (!accessToken || !groupId) {
      return;
    }

    try {
      const [refreshedDetails, refreshedInvites] = await Promise.all([
        getGroupDetails(groupId, accessToken),
        listGroupInvites(groupId, accessToken),
      ]);

      setDetails(refreshedDetails);
      setInvites(refreshedInvites.invites);
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Failed to refresh invites after creation.');
      }
    }
  }}
/>
      </main>
    </ProtectedRoute>
  );
}