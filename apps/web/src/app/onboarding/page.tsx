'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Button, Card, CardContent } from '@/components/ui';

export default function OnboardingPage() {
  const router = useRouter();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  return (
    <ProtectedRoute>
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center">
          <Card variant="elevated" className="w-full overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
                Onboarding
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)] md:text-4xl">
                Welcome to Ledgerly
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ledgerly-muted)] md:text-base">
                Start by creating a group, inviting people, and adding your
                first shared expense.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-5">
                  <h2 className="text-base font-bold text-[color:var(--ledgerly-text)]">
                    Create a group
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                    Groups keep shared costs organized for trips, roommates,
                    family, and friends.
                  </p>

                  <Button
                    type="button"
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="mt-5"
                  >
                    Create your first group
                  </Button>
                </div>

                <div className="rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white p-5">
                  <h2 className="text-base font-bold text-[color:var(--ledgerly-text)]">
                    Skip for now
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                    You can go straight to the dashboard and create your first
                    group later.
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