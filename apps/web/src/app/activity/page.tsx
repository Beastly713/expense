'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
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

  return parsed.toLocaleString();
}

function formatCurrencyFromMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
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
      return `Group created`;
    case 'member_invited':
      return `Member invited${email ? `: ${email}` : ''}`;
    case 'invite_accepted':
      return `Invite accepted`;
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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            Activity
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Full audit trail across your groups. Deleted expenses can be restored
            from here.
          </p>
        </div>

        {actionMessage ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </div>
        ) : null}

        {isLoading ? (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-600">Loading activity...</p>
          </section>
        ) : null}

        {!isLoading && errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-red-900">Could not load activity</h2>
            <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
          </section>
        ) : null}

        {!isLoading && !errorMessage ? (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                No activity yet.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-200 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                            {item.groupName}
                          </span>
                          <Link
                            href={`/groups/${item.groupId}`}
                            className="text-xs font-medium text-neutral-600 underline"
                          >
                            Open group
                          </Link>
                        </div>

                        <p className="mt-3 text-sm font-medium text-neutral-900">
                          {buildActivitySummary(item)}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>

                      {item.actionType === 'expense_deleted' &&
                      item.entityType === 'expense' ? (
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
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
              <p className="text-sm text-neutral-600">
                Page {page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages}
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}