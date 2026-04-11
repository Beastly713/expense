'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  getDashboardSummary,
  listGroups,
  type DashboardSummaryResponse,
  type GroupListItem,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';

function formatCurrencyFromMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      if (!accessToken) {
        setGroups([]);
        setSummary(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [groupsResponse, summaryResponse] = await Promise.all([
          listGroups(accessToken, { type: 'all' }),
          getDashboardSummary(accessToken),
        ]);

        setGroups(groupsResponse.groups);
        setSummary(summaryResponse);
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
  }, [accessToken, isCreateGroupOpen]);

  const groupCountText = useMemo(() => {
    if (groups.length === 1) {
      return '1 group';
    }

    return `${groups.length} groups`;
  }, [groups.length]);

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
                Welcome back{user ? `, ${user.name}` : ''}.
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Track group balances, add expenses, and keep the shared ledger up to date.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Create group
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {summary ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                label="You owe"
                value={formatCurrencyFromMinor(summary.totalYouOweMinor)}
              />
              <SummaryCard
                label="You are owed"
                value={formatCurrencyFromMinor(summary.totalYouAreOwedMinor)}
              />
              <SummaryCard
                label="Net balance"
                value={formatCurrencyFromMinor(summary.netBalanceMinor)}
              />
              <SummaryCard label="Groups" value={String(summary.groupCount)} />
              <SummaryCard
                label="Direct ledgers"
                value={String(summary.directLedgerCount)}
              />
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Your groups</h2>
              <p className="mt-1 text-sm text-neutral-600">
                {isLoading ? 'Loading groups...' : groupCountText}
              </p>
            </div>
          </div>

          {!isLoading && !errorMessage && groups.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
              <h3 className="text-lg font-semibold text-neutral-900">
                No groups yet
              </h3>
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
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
        />
      </main>
    </ProtectedRoute>
  );
}