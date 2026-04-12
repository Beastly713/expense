'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  createDirectGroup,
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

function LedgerCard({
  item,
  href,
}: {
  item: GroupListItem;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">{item.name}</h3>
          <p className="mt-1 text-sm text-neutral-500">
            {item.type === 'direct' ? 'Friend ledger' : `${item.memberCount} members`}
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
          {item.type === 'direct' ? 'Friend' : 'Group'}
        </span>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        {item.netBalanceMinor === 0 ? (
          <p className="font-medium text-neutral-700">Settled up</p>
        ) : item.netBalanceMinor > 0 ? (
          <>
            <p className="text-neutral-500">You are owed</p>
            <p className="font-medium text-emerald-700">
              {formatCurrencyFromMinor(item.youAreOwedMinor)}
            </p>
          </>
        ) : (
          <>
            <p className="text-neutral-500">You owe</p>
            <p className="font-medium text-amber-700">
              {formatCurrencyFromMinor(item.youOweMinor)}
            </p>
          </>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, user } = useAuth();

  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [activityItems, setActivityItems] = useState<GlobalActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const [directEmail, setDirectEmail] = useState('');
  const [directError, setDirectError] = useState<string | null>(null);
  const [isCreatingDirect, setIsCreatingDirect] = useState(false);

  const regularGroups = useMemo(
    () => groups.filter((group) => group.type === 'group'),
    [groups],
  );

  const directGroups = useMemo(
    () => groups.filter((group) => group.type === 'direct'),
    [groups],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [nextSummary, nextGroups, nextActivity] = await Promise.all([
          getDashboardSummary(token),
          listGroups(token, { type: 'all' }),
          listGlobalActivity(token, { page: 1, limit: 5 }),
        ]);

        if (!isMounted) {
          return;
        }

        setSummary(nextSummary);
        setGroups(nextGroups.groups);
        setActivityItems(nextActivity.items);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Failed to load dashboard.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  async function handleCreateDirectLedger(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!accessToken) {
      setDirectError('You must be signed in to create a direct ledger.');
      return;
    }

    if (directEmail.trim().length === 0) {
      setDirectError('Friend email is required.');
      return;
    }

    try {
      setIsCreatingDirect(true);
      setDirectError(null);

      const response = await createDirectGroup(
        {
          email: directEmail.trim().toLowerCase(),
        },
        accessToken,
      );

      setDirectEmail('');
      router.push(`/friends/${response.group.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setDirectError(error.message);
      } else {
        setDirectError('Failed to open direct ledger.');
      }
    } finally {
      setIsCreatingDirect(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              Welcome back{user ? `, ${user.name}` : ''}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Here’s your current expense-sharing overview.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 shadow-sm">
            Loading dashboard...
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                label="You owe"
                value={formatCurrencyFromMinor(summary?.totalYouOweMinor ?? 0)}
              />
              <SummaryCard
                label="You are owed"
                value={formatCurrencyFromMinor(summary?.totalYouAreOwedMinor ?? 0)}
              />
              <SummaryCard
                label="Net balance"
                value={formatCurrencyFromMinor(summary?.netBalanceMinor ?? 0)}
              />
              <SummaryCard
                label="Groups"
                value={String(summary?.groupCount ?? 0)}
              />
              <SummaryCard
                label="Direct ledgers"
                value={String(summary?.directLedgerCount ?? 0)}
              />
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Start a direct ledger
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Open a 1:1 ledger with an existing registered user by email.
                  </p>
                </div>
              </div>

              <form
                className="mt-5 flex flex-col gap-3 sm:flex-row"
                onSubmit={handleCreateDirectLedger}
              >
                <div className="flex-1">
                  <label
                    htmlFor="direct-ledger-email"
                    className="block text-sm font-medium text-neutral-900"
                  >
                    Friend email
                  </label>
                  <input
                    id="direct-ledger-email"
                    name="direct-ledger-email"
                    type="email"
                    value={directEmail}
                    onChange={(event) => setDirectEmail(event.target.value)}
                    placeholder="friend@example.com"
                    disabled={isCreatingDirect}
                    className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="sm:self-end">
                  <button
                    type="submit"
                    disabled={isCreatingDirect}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {isCreatingDirect ? 'Opening...' : 'Open friend ledger'}
                  </button>
                </div>
              </form>

              {directError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {directError}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Your groups
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Shared group ledgers you’re part of.
                  </p>
                </div>
              </div>

              {regularGroups.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                  No groups yet. Create your first group to start tracking shared
                  expenses.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {regularGroups.map((group) => (
                    <LedgerCard
                      key={group.id}
                      item={group}
                      href={`/groups/${group.id}`}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Friends</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Your 1:1 direct ledgers.
                  </p>
                </div>
              </div>

              {directGroups.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                  No direct ledgers yet. Open one with an existing registered user
                  by email.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {directGroups.map((group) => (
                    <LedgerCard
                      key={group.id}
                      item={group}
                      href={`/friends/${group.id}`}
                    />
                  ))}
                </div>
              )}
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
        )}

        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
        />
      </main>
    </ProtectedRoute>
  );
}