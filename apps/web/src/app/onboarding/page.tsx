'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { APP_NAME } from '@/lib/branding';

export default function OnboardingPage() {
  const router = useRouter();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  return (
    <ProtectedRoute>
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
          <Card variant="elevated" className="w-full overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
                    Onboarding
                  </p>

                  <h1 className="mt-3 text-4xl font-bold tracking-[-0.06em] text-[color:var(--ledgerly-text)] md:text-5xl">
                    Welcome to {APP_NAME}
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ledgerly-muted)] md:text-base">
                    Start with a group for a trip, flat, or shared context. You
                    can invite people, add expenses, view balances, and record
                    cash settlements from there.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge variant="brand">Groups</Badge>
                    <Badge variant="success">Balances</Badge>
                    <Badge variant="neutral">Cash settlements</Badge>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-[color:var(--ledgerly-text)]">
                          Create your first group
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                          Best first step for the MVP: create a group, invite
                          members, then add a shared expense.
                        </p>
                      </div>

                      <span className="rounded-full bg-[var(--ledgerly-primary)] px-3 py-1 text-xs font-bold text-white">
                        Recommended
                      </span>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="mt-5"
                    >
                      Create your first group
                    </Button>
                  </div>

                  <div className="rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white p-5">
                    <h2 className="text-lg font-bold text-[color:var(--ledgerly-text)]">
                      Go to dashboard
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                      Skip setup for now. You can create groups or direct friend
                      ledgers later from the dashboard.
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dashboard')}
                      className="mt-5"
                    >
                      Skip for now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          title="Create your first group"
          description="Create a shared group now so you can invite members and start tracking expenses."
        />
      </main>
    </ProtectedRoute>
  );
}