'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { InviteMembersModal } from '@/components/groups/invite-members-modal';
import {
  cancelGroupInvite,
  getGroupDetails,
  listGroupInvites,
  resendGroupInvite,
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

function formatDateTime(value?: string | undefined): string {
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

  return (
    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
      {label}
    </span>
  );
}

function ActiveMemberCard({
  member,
  currency,
}: {
  member: GroupMember;
  currency: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-neutral-900">
            {member.name}
          </h3>
          <p className="mt-1 truncate text-sm text-neutral-500">{member.email}</p>
        </div>

        <NetBalancePill
          amountMinor={member.cachedNetBalanceMinor}
          currency={currency}
        />
      </div>
    </div>
  );
}

function PendingMemberCard({
  member,
  isActing,
  onResend,
  onCancel,
}: {
  member: PendingMemberView;
  isActing: boolean;
  onResend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-neutral-900">
                {member.email}
              </h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                Pending
              </span>
            </div>

            <p className="mt-2 text-sm text-neutral-600">
              This invitee is already part of the group model and will keep the
              same membership id when they accept the invite.
            </p>

            <p className="mt-2 text-xs text-neutral-500">
              {formatDateTime(member.invitedAt)}
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-600">
            Awaiting acceptance
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onResend}
            disabled={isActing || !member.invitationId}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isActing ? 'Working...' : 'Resend invite'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isActing || !member.invitationId}
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel invite
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GroupDetailsPage() {
  const params = useParams();
  const { accessToken } = useAuth();

  const rawGroupId = params.groupId;
  const groupId =
    typeof rawGroupId === 'string'
      ? rawGroupId
      : Array.isArray(rawGroupId)
        ? rawGroupId[0]
        : null;

  const [groupDetails, setGroupDetails] = useState<GroupDetailsResponse | null>(
    null,
  );
  const [pendingInvites, setPendingInvites] = useState<InviteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [actingInvitationId, setActingInvitationId] = useState<string | null>(null);

  async function refreshGroupPage() {
    if (!accessToken || !groupId) {
      return;
    }

    const [groupResponse, invitesResponse] = await Promise.all([
      getGroupDetails(groupId, accessToken),
      listGroupInvites(groupId, accessToken),
    ]);

    setGroupDetails(groupResponse);
    setPendingInvites(invitesResponse.invites);
  }

  useEffect(() => {
    async function loadGroupPage() {
      if (!accessToken || !groupId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        setActionError(null);
        setActionMessage(null);

        await refreshGroupPage();
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
  }, [accessToken, groupId]);

  const activeMembers = useMemo(() => {
    if (!groupDetails) {
      return [];
    }

    return groupDetails.members.filter((member) => member.status === 'active');
  }, [groupDetails]);

  const pendingMembers = useMemo<PendingMemberView[]>(() => {
    if (!groupDetails) {
      return [];
    }

    const inviteByEmail = new Map(
      pendingInvites.map((invite) => [invite.email.toLowerCase(), invite] as const),
    );

    return groupDetails.members
      .filter((member) => member.status === 'pending')
      .map((member) => {
        const invite = inviteByEmail.get(member.email.toLowerCase());

        return {
          ...member,
          invitationId: invite?.invitationId,
          invitedAt: invite?.invitedAt,
        };
      });
  }, [groupDetails, pendingInvites]);

  async function handleResendInvite(member: PendingMemberView) {
    if (!accessToken || !groupId || !member.invitationId) {
      return;
    }

    try {
      setActingInvitationId(member.invitationId);
      setActionError(null);
      setActionMessage(null);

      const response = await resendGroupInvite(
        groupId,
        member.invitationId,
        accessToken,
      );

      await refreshGroupPage();
      setActionMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Failed to resend invite.');
      }
    } finally {
      setActingInvitationId(null);
    }
  }

  async function handleCancelInvite(member: PendingMemberView) {
    if (!accessToken || !groupId || !member.invitationId) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel the invite for ${member.email}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActingInvitationId(member.invitationId);
      setActionError(null);
      setActionMessage(null);

      const response = await cancelGroupInvite(
        groupId,
        member.invitationId,
        accessToken,
      );

      await refreshGroupPage();
      setActionMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Failed to cancel invite.');
      }
    } finally {
      setActingInvitationId(null);
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

        {!isLoading && !errorMessage && groupDetails ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                    Group
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
                    {groupDetails.group.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                    Manage members, pending invites, balances, and group activity
                    from one place.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                    Currency: {groupDetails.group.defaultCurrency}
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                    {activeMembers.length} active
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                    {pendingMembers.length} pending
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/expenses/new?groupId=${groupDetails.group.id}`}
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

              {actionError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              ) : null}

              {actionMessage ? (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {actionMessage}
                </div>
              ) : null}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <SectionCard
                  title="Active members"
                  subtitle="Every active member has equal permissions in MVP."
                >
                  {activeMembers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                      No active members found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeMembers.map((member) => (
                        <ActiveMemberCard
                          key={member.membershipId}
                          member={member}
                          currency={groupDetails.group.defaultCurrency}
                        />
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Pending invites"
                  subtitle="Pending invitees are first-class participants in the group model."
                >
                  {pendingMembers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                      No pending invites yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingMembers.map((member) => (
                        <PendingMemberCard
                          key={member.membershipId}
                          member={member}
                          isActing={actingInvitationId === member.invitationId}
                          onResend={() => void handleResendInvite(member)}
                          onCancel={() => void handleCancelInvite(member)}
                        />
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Simplified balances"
                  subtitle="Primary UI shows simplified payable relationships."
                >
                  {groupDetails.simplifiedBalances.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                      No balances yet. Add an expense after inviting members.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupDetails.simplifiedBalances.map((balance) => (
                        <div
                          key={`${balance.fromMembershipId}-${balance.toMembershipId}`}
                          className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                        >
                          <p className="text-sm text-neutral-700">
                            {balance.fromMembershipId} owes {balance.toMembershipId}
                          </p>
                          <p className="mt-1 text-base font-semibold text-neutral-900">
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
                  title="Expenses"
                  subtitle="Expense UI lands in the next phase, but this summary is ready now."
                >
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-sm text-neutral-500">Active expenses</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">
                      {groupDetails.expenseCount}
                    </p>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Recent activity"
                  subtitle="Group activity preview will become richer as invite and expense flows continue."
                >
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
                    No activity preview UI yet in this commit.
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        ) : null}

        {groupId ? (
          <InviteMembersModal
            groupId={groupId}
            accessToken={accessToken}
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            onInvitesCreated={async () => {
              await refreshGroupPage();
              setActionError(null);
              setActionMessage('Invites updated successfully.');
            }}
          />
        ) : null}
      </main>
    </ProtectedRoute>
  );
}