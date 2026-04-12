'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  getDashboardSummary,
  listGlobalActivity,
  listGroups,
  type DashboardSummaryResponse,
  type GlobalActivityItem,
  type GroupListItem,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';

function formatCurrencyFromMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function buildActivitySummary(item: GlobalActivityItem): string {
  const title =
    typeof item.metadata.title === 'string' ? item.metadata.title : 'Untitled';
  const amountMinor =
    typeof item.metadata.amountMinor === 'number' ? item.metadata.amountMinor : null;
  const email =
    typeof item.metadata.email === 'string' ? item.metadata.email : null;

  switch (item.actionType) {
    case 'group_created':
      return 'Group created';
    case 'member_invited':
      return `Member invited${email ? `: ${email}` : ''}`;
    case 'invite_accepted':
      return 'Invite accepted';
    case 'expense_added':
      return `Expense added: "${title}"${
        amountMinor != null ? ` · ${formatCurrencyFromMinor(amountMinor)}` : ''
      }`;
    case 'expense_edited':
      return `Expense edited: "${title}"`;
    case 'expense_deleted':
      return `Expense deleted: "${title}"`;
    case 'expense_restored':
      return `Expense restored: "${title}"`;
    case 'settlement_recorded':
      return `Settlement recorded${
        amountMinor != null ? ` · ${formatCurrencyFromMinor(amountMinor)}` : ''
      }`;
    default:
      return 'Activity update';
  }
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { accessToken, user } = useAuth();

  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [activityItems, setActivityItems] = useState<GlobalActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      if (!accessToken) {
        setGroups([]);
        setSummary(null);
        setActivityItems([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [groupsResponse, summaryResponse, activityResponse] = await Promise.all([
          listGroups(accessToken, { type: 'all' }),
          getDashboardSummary(accessToken),
          listGlobalActivity(accessToken, { page: 1, limit: 5 }),
        ]);

        setGroups(groupsResponse.groups);
        setSummary(summaryResponse);
        setActivityItems(activityResponse.items);
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Failed to load dashboard.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [accessToken]);

  const groupCountText = useMemo(() => {
    if (isLoading) {
      return 'Loading groups...';
    }

    if (groups.length === 0) {
      return 'No groups yet';
    }

    if (groups.length === 1) {
      return '1 group';
    }

    return `${groups.length} groups`;
  }, [groups.length, isLoading]);

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                Welcome back{user ? `, ${user.name}` : ''}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Track balances across groups, review recent changes, and jump into the
                next core action quickly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Create group
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="You owe"
              value={
                summary ? formatCurrencyFromMinor(summary.totalYouOweMinor) : '0.00'
              }
            />
            <SummaryCard
              label="You are owed"
              value={
                summary
                  ? formatCurrencyFromMinor(summary.totalYouAreOwedMinor)
                  : '0.00'
              }
            />
            <SummaryCard
              label="Net balance"
              value={summary ? formatCurrencyFromMinor(summary.netBalanceMinor) : '0.00'}
            />
            <SummaryCard
              label="Groups"
              value={summary ? String(summary.groupCount) : '0'}
            />
            <SummaryCard
              label="Direct ledgers"
              value={summary ? String(summary.directLedgerCount) : '0'}
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Your groups</h2>
                <p className="mt-1 text-sm text-neutral-600">{groupCountText}</p>
              </div>
            </div>

            {!isLoading && !errorMessage && groups.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                <h3 className="text-lg font-semibold text-neutral-900">No groups yet</h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Create your first group to start adding shared expenses.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Create your first group
                </button>
              </div>
            ) : null}

            {!isLoading && !errorMessage && groups.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {groups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 transition hover:border-neutral-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-neutral-900">
                          {group.name}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500">
                          {group.type === 'direct' ? 'Direct ledger' : 'Group'} ·{' '}
                          {group.defaultCurrency}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-600">
                        {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-neutral-500">You owe</span>
                        <span className="font-medium text-neutral-900">
                          {formatCurrencyFromMinor(group.youOweMinor)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-neutral-500">You are owed</span>
                        <span className="font-medium text-neutral-900">
                          {formatCurrencyFromMinor(group.youAreOwedMinor)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-2">
                        <span className="text-neutral-500">Net</span>
                        <span className="font-semibold text-neutral-900">
                          {formatCurrencyFromMinor(group.netBalanceMinor)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Recent activity
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Quick preview of recent changes across your groups.
                </p>
              </div>

              <Link
                href="/activity"
                className="text-sm font-medium text-neutral-700 underline"
              >
                View all
              </Link>
            </div>

            {activityItems.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                No recent activity yet.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {activityItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-200 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                        {item.groupName}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-medium text-neutral-900">
                      {buildActivitySummary(item)}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
        />
      </main>
    </ProtectedRoute>
  );
}