'use client';

import Link from 'next/link';

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
import { APP_NAME } from '@/lib/branding';
import { useAuth } from '@/lib/auth';

function getInitials(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function SettingsPage() {
  const { user } = useAuth();

  const displayName = user?.name ?? 'Ledgerly user';
  const displayEmail = user?.email ?? 'Signed in';
  const defaultCurrency = user?.defaultCurrency ?? 'INR';

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="space-y-6">
          <section>
            <Card variant="elevated">
              <CardContent className="p-6">
                <PageHeader
                  eyebrow="Account"
                  title="Settings"
                  description="Manage the basics of your Ledgerly account. MVP settings are intentionally lightweight for now."
                  actions={
                    <Link
                      href="/dashboard"
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
                    >
                      ← Back to dashboard
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  title="Profile"
                  description="Your account identity inside Ledgerly."
                />

                <div className="mt-6 flex items-start gap-4 rounded-[var(--ledgerly-radius-lg)] bg-[var(--ledgerly-surface-soft)] p-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--ledgerly-primary)] text-xl font-black text-white">
                    {getInitials(displayName) || 'L'}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold tracking-[-0.03em] text-[color:var(--ledgerly-text)]">
                      {displayName}
                    </h2>

                    <p className="mt-1 truncate text-sm text-[color:var(--ledgerly-muted)]">
                      {displayEmail}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="brand">{APP_NAME}</Badge>
                      <Badge variant="neutral">Web MVP</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  title="Preferences"
                  description="Simple defaults used across groups and expense forms."
                />

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-[color:var(--ledgerly-text)]">
                        Default currency
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ledgerly-muted)]">
                        Used as the starting currency for new groups.
                      </p>
                    </div>

                    <Badge variant="brand">{defaultCurrency}</Badge>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-[color:var(--ledgerly-text)]">
                        Balance display
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ledgerly-muted)]">
                        Ledgerly emphasizes simplified balances by default.
                      </p>
                    </div>

                    <Badge variant="success">Simplified</Badge>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-[color:var(--ledgerly-text)]">
                        Settlement method
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ledgerly-muted)]">
                        MVP settlements are manual cash records.
                      </p>
                    </div>

                    <Badge variant="neutral">Cash only</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  title="Notifications"
                  description="Notification rows are created by core flows. A full notification center can come later."
                />

                <EmptyState
                  className="mt-6"
                  title="Notification preferences are not configurable yet."
                  description="Ledgerly already records key actions like invites, expenses, settlements, deletes, and restores. This screen keeps the MVP settings surface honest and minimal."
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  title="Security"
                  description="Authentication is intentionally simple in the MVP."
                />

                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3">
                    <p className="text-sm font-bold text-[color:var(--ledgerly-text)]">
                      Email/password login
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--ledgerly-muted)]">
                      Ledgerly uses access tokens in memory and a refresh token
                      in an httpOnly cookie.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3">
                    <p className="text-sm font-bold text-[color:var(--ledgerly-text)]">
                      Password reset
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--ledgerly-muted)]">
                      Forgot/reset password is supported in the current MVP
                      auth scope.
                    </p>
                  </div>

                  <Link href="/forgot-password" className="inline-flex">
                    <Button type="button" variant="outline">
                      Reset password
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}