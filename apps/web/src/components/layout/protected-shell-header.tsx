'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { APP_NAME } from '@/lib/branding';

export function ProtectedShellHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[color:var(--ledgerly-border)] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] text-sm font-black text-white shadow-sm"
              aria-label={`${APP_NAME} dashboard`}
            >
              L
            </Link>

            <div className="min-w-0">
              <Link
                href="/dashboard"
                className="text-sm font-bold tracking-[-0.02em] text-[color:var(--ledgerly-text)] hover:underline"
              >
                {APP_NAME}
              </Link>

              <p className="truncate text-xs text-[color:var(--ledgerly-muted)]">
                {user ? `${user.name} • ${user.email}` : 'Signed in'}
              </p>
            </div>
          </div>

          <nav className="flex shrink-0 items-center gap-2">
            <Link
              href="/activity"
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-[color:var(--ledgerly-muted)] transition hover:bg-[var(--ledgerly-surface-soft)] hover:text-[color:var(--ledgerly-text)] sm:inline-flex"
            >
              Activity
            </Link>

            <Link
              href="/settings"
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-[color:var(--ledgerly-muted)] transition hover:bg-[var(--ledgerly-surface-soft)] hover:text-[color:var(--ledgerly-text)] sm:inline-flex"
            >
              Settings
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateGroupOpen(true)}
            >
              New group
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </nav>
        </div>
      </header>

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        title="Create a new group"
        description="Create a shared group from anywhere in the protected app shell."
      />
    </>
  );
}