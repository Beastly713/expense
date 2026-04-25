'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatDashboardAmountFromMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function buildActivitySummary(item: GlobalActivityItem): string {
  const title =
    typeof item.metadata.title === 'string' ? item.metadata.title : 'Untitled';
  const amountMinor =
    typeof item.metadata.amountMinor === 'number'
      ? item.metadata.amountMinor
      : null;
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function SummaryCard({
  label,
  helper,
  amountMinor,
  currency,
  tone,
}: {
  label: string;
  helper: string;
  amountMinor: number;
  currency: string;
  tone: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-5">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
          {label}
        </p>

        <div className="mt-4">
          <MoneyAmount
            amountMinor={amountMinor}
            currency={currency}
            tone={tone}
            size="xl"
            signMode="never"
          />
        </div>

        <p className="mt-3 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
          {helper}
        </p>
      </CardContent>
    </Card>
  );
}

function CountCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
          {label}
        </p>

        <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
          {value}
        </p>

        <p className="mt-3 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
          {helper}
        </p>
      </CardContent>
    </Card>
  );
}

function LedgerCard({
  item,
  href,
}: {
  item: GroupListItem;
  href: string;
}) {
  const isSettled = item.netBalanceMinor === 0;
  const isPositive = item.netBalanceMinor > 0;
  const amountMinor = isPositive ? item.youAreOwedMinor : item.youOweMinor;

  return (
    <Link href={href} className="block">
      <Card variant="interactive" className="h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ledgerly-primary-soft)] text-sm font-black text-[color:var(--ledgerly-primary)]">
                {getInitials(item.name) || 'L'}
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-[color:var(--ledgerly-text)]">
                  {item.name}
                </h3>

                <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                  {item.type === 'direct'
                    ? 'Friend ledger'
                    : `${item.memberCount} members`}
                </p>
              </div>
            </div>

            <Badge variant={item.type === 'direct' ? 'brand' : 'neutral'}>
              {item.type === 'direct' ? 'Friend' : 'Group'}
            </Badge>
          </div>

          <div className="mt-5 rounded-2xl bg-[var(--ledgerly-surface-soft)] p-4">
            {isSettled ? (
              <>
                <p className="text-sm text-[color:var(--ledgerly-muted)]">
                  Current balance
                </p>
                <p className="mt-1 font-bold text-[color:var(--ledgerly-muted)]">
                  Settled up
                </p>
              </>
            ) : isPositive ? (
              <>
                <p className="text-sm text-[color:var(--ledgerly-muted)]">
                  You are owed
                </p>
                <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-[color:var(--ledgerly-positive)]">
                  {formatDashboardAmountFromMinor(amountMinor)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-[color:var(--ledgerly-muted)]">
                  You owe
                </p>
                <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-[color:var(--ledgerly-negative)]">
                  {formatDashboardAmountFromMinor(amountMinor)}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LoadingDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {['Summary', 'Groups', 'Activity'].map((label) => (
        <Card key={label}>
          <CardContent className="p-5">
            <div className="h-4 w-24 rounded-full bg-[var(--ledgerly-surface-soft)]" />
            <div className="mt-5 h-8 w-36 rounded-full bg-[var(--ledgerly-surface-soft)]" />
            <div className="mt-4 h-4 w-full rounded-full bg-[var(--ledgerly-surface-soft)]" />
            <span className="sr-only">Loading {label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
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

  const currency = user?.defaultCurrency ?? 'INR';

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

  async function handleCreateDirectLedger(event: FormEvent<HTMLFormElement>) {
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
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome back${user ? `, ${user.name}` : ''}`}
          description="Your groups, friend ledgers, balances, and recent money activity in one calm place."
          actions={
            <>
              <Button type="button" onClick={() => setIsCreateGroupOpen(true)}>
                Create group
              </Button>

              <Link
                href="/expenses/new"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
              >
                Add expense
              </Link>
            </>
          }
        />

        {errorMessage ? (
          <div className="mt-6 rounded-[var(--ledgerly-radius-md)] border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] p-4 text-sm text-[color:var(--ledgerly-danger)]">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingDashboard />
        ) : (
          <div className="mt-8 space-y-8">
            <section className="grid gap-4 lg:grid-cols-3">
              <SummaryCard
                label="You owe"
                helper="Money you currently need to settle."
                amountMinor={summary?.totalYouOweMinor ?? 0}
                currency={currency}
                tone="negative"
              />

              <SummaryCard
                label="You are owed"
                helper="Money friends and groups owe you."
                amountMinor={summary?.totalYouAreOwedMinor ?? 0}
                currency={currency}
                tone="positive"
              />

              <SummaryCard
                label="Net balance"
                helper="Your overall position across Ledgerly."
                amountMinor={summary?.netBalanceMinor ?? 0}
                currency={currency}
                tone={
                  (summary?.netBalanceMinor ?? 0) > 0
                    ? 'positive'
                    : (summary?.netBalanceMinor ?? 0) < 0
                      ? 'negative'
                      : 'neutral'
                }
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <CountCard
                label="Groups"
                value={summary?.groupCount ?? 0}
                helper="Shared ledgers for trips, roommates, family, and plans."
              />

              <CountCard
                label="Direct ledgers"
                value={summary?.directLedgerCount ?? 0}
                helper="One-to-one friend balances tracked separately."
              />
            </section>

            <section>
              <Card variant="elevated">
                <CardContent className="p-5 sm:p-6">
                  <SectionHeader
                    title="Start a direct ledger"
                    description="Open a 1:1 ledger with an existing registered user by email."
                  />

                  <form
                    className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
                    onSubmit={handleCreateDirectLedger}
                  >
                    <div className="flex-1">
                      <label
                        htmlFor="direct-ledger-email"
                        className="block text-sm font-bold text-[color:var(--ledgerly-text)]"
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
                        className="ledgerly-focus-ring mt-2 w-full rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3 text-sm text-[color:var(--ledgerly-text)] transition placeholder:text-[color:var(--ledgerly-faint)] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>

                    <Button type="submit" disabled={isCreatingDirect}>
                      {isCreatingDirect ? 'Opening...' : 'Open friend ledger'}
                    </Button>
                  </form>

                  {directError ? (
                    <div className="mt-4 rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
                      {directError}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-8">
                <section>
                  <Card>
                    <CardContent className="p-5 sm:p-6">
                      <SectionHeader
                        title="Your groups"
                        description="Shared group ledgers you’re part of."
                        action={
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsCreateGroupOpen(true)}
                          >
                            Create group
                          </Button>
                        }
                      />

                      {regularGroups.length === 0 ? (
                        <EmptyState
                          className="mt-6"
                          title="No groups yet"
                          description="Create your first group to start tracking trips, roommates, family plans, or shared events."
                          action={
                            <Button
                              type="button"
                              onClick={() => setIsCreateGroupOpen(true)}
                            >
                              Create your first group
                            </Button>
                          }
                        />
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
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <Card>
                    <CardContent className="p-5 sm:p-6">
                      <SectionHeader
                        title="Friends"
                        description="Your 1:1 direct ledgers."
                      />

                      {directGroups.length === 0 ? (
                        <EmptyState
                          className="mt-6"
                          title="No direct ledgers yet"
                          description="Open one with an existing registered user by email when you want a simple friend balance."
                        />
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
                    </CardContent>
                  </Card>
                </section>
              </div>

              <section>
                <Card className="h-fit">
                  <CardContent className="p-5 sm:p-6">
                    <SectionHeader
                      title="Recent activity"
                      description="A quick trust feed across your groups."
                      action={
                        <Link
                          href="/activity"
                          className="text-sm font-bold text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline"
                        >
                          View all
                        </Link>
                      }
                    />

                    {activityItems.length === 0 ? (
                      <EmptyState
                        className="mt-6"
                        title="No recent activity"
                        description="Expense edits, settlements, invites, and restores will appear here."
                      />
                    ) : (
                      <div className="mt-6 space-y-3">
                        {activityItems.map((item) => (
                          <article
                            key={item.id}
                            className="rounded-2xl border border-[color:var(--ledgerly-border)] bg-white p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <Badge variant="neutral">{item.groupName}</Badge>
                              <time className="text-xs text-[color:var(--ledgerly-faint)]">
                                {formatDateTime(item.createdAt)}
                              </time>
                            </div>

                            <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--ledgerly-text)]">
                              {buildActivitySummary(item)}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
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