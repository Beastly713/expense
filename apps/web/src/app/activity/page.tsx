'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ProtectedRoute } from '@/components/layout/protected-route';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  SectionHeader,
} from '@/components/ui';
import {
  listGlobalActivity,
  restoreExpense,
  type GlobalActivityItem,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';

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

function formatCurrencyFromMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
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

function getActivityBadgeVariant(
  actionType: GlobalActivityItem['actionType'],
): 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'purple' {
  switch (actionType) {
    case 'expense_added':
    case 'expense_restored':
    case 'invite_accepted':
      return 'success';
    case 'expense_deleted':
      return 'danger';
    case 'expense_edited':
    case 'settlement_recorded':
      return 'brand';
    case 'member_invited':
      return 'warning';
    case 'group_created':
      return 'purple';
    default:
      return 'neutral';
  }
}

function getActivityLabel(actionType: GlobalActivityItem['actionType']): string {
  switch (actionType) {
    case 'group_created':
      return 'Group';
    case 'member_invited':
      return 'Invite';
    case 'invite_accepted':
      return 'Accepted';
    case 'expense_added':
      return 'Expense';
    case 'expense_edited':
      return 'Edited';
    case 'expense_deleted':
      return 'Deleted';
    case 'expense_restored':
      return 'Restored';
    case 'settlement_recorded':
      return 'Settlement';
    default:
      return 'Update';
  }
}

export default function ActivityPage() {
  const { accessToken } = useAuth();

  const [items, setItems] = useState<GlobalActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      if (!accessToken) {
        setItems([]);
        setTotal(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await listGlobalActivity(accessToken, {
          page,
          limit,
        });

        setItems(response.items);
        setTotal(response.pagination.total);
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Failed to load activity.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadActivity();
  }, [accessToken, limit, page]);

  const totalPages = useMemo(() => {
    return total > 0 ? Math.ceil(total / limit) : 1;
  }, [limit, total]);

  async function handleRestoreExpense(expenseId: string) {
    if (!accessToken) {
      setActionMessage('You must be signed in to restore expenses.');
      return;
    }

    try {
      setPendingActionKey(`expense-restore:${expenseId}`);
      setActionMessage(null);
      await restoreExpense(expenseId, accessToken);

      const response = await listGlobalActivity(accessToken, {
        page,
        limit,
      });

      setItems(response.items);
      setTotal(response.pagination.total);
      setActionMessage('Expense restored successfully.');
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

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="space-y-6">
          <section>
            <Card variant="elevated">
              <CardContent className="p-6">
                <PageHeader
                  eyebrow="Activity"
                  title="Activity"
                  description="Full audit trail across your groups. Deleted expenses can be restored from here."
                  actions={
                    <Link
                      href="/dashboard"
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
                    >
                      ← Back to dashboard
                    </Link>
                  }
                />

                <div className="mt-6 rounded-[var(--ledgerly-radius-lg)] bg-[var(--ledgerly-surface-soft)] p-5">
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                    Trust feed
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                    Every important group, expense, invite, restore, and
                    settlement action appears here so shared money stays
                    transparent.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {actionMessage ? (
            <div className="rounded-2xl border border-[color:var(--ledgerly-positive)] bg-[var(--ledgerly-positive-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-positive)]">
              {actionMessage}
            </div>
          ) : null}

          {isLoading ? (
            <section>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[color:var(--ledgerly-muted)]">
                    Loading activity...
                  </p>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {!isLoading && errorMessage ? (
            <section>
              <Card variant="danger">
                <CardContent className="p-6">
                  <h2 className="text-base font-bold text-[color:var(--ledgerly-danger)]">
                    Could not load activity
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--ledgerly-danger)]">
                    {errorMessage}
                  </p>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {!isLoading && !errorMessage ? (
            <section>
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <SectionHeader
                    title="Recent activity"
                    description="A human-readable log of what changed, where it happened, and when."
                  />

                  {items.length === 0 ? (
                    <EmptyState
                      className="mt-6"
                      title="No activity yet."
                      description="Create a group, invite members, add an expense, or record a settlement to start the activity trail."
                    />
                  ) : (
                    <div className="mt-6 space-y-3">
                      {items.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-[color:var(--ledgerly-border)] bg-white p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={getActivityBadgeVariant(item.actionType)}
                                >
                                  {getActivityLabel(item.actionType)}
                                </Badge>

                                <Badge variant="neutral">{item.groupName}</Badge>

                                <Link
                                  href={`/groups/${item.groupId}`}
                                  className="text-xs font-bold text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline"
                                >
                                  Open group
                                </Link>
                              </div>

                              <p className="mt-3 text-sm font-bold leading-6 text-[color:var(--ledgerly-text)]">
                                {buildActivitySummary(item)}
                              </p>

                              <p className="mt-1 text-xs text-[color:var(--ledgerly-faint)]">
                                {formatDateTime(item.createdAt)}
                              </p>
                            </div>

                            {item.actionType === 'expense_deleted' &&
                            item.entityType === 'expense' ? (
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
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-[color:var(--ledgerly-border)] pt-4">
                    <p className="text-sm text-[color:var(--ledgerly-muted)]">
                      Page {page} of {totalPages}
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
                        disabled={page <= 1}
                      >
                        Previous
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((current) =>
                            Math.min(totalPages, current + 1),
                          )
                        }
                        disabled={page >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}