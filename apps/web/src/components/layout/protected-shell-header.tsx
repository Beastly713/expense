'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/lib/auth';
import { env } from '@/lib/env';

export function ProtectedShellHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-neutral-900 hover:underline"
          >
            {env.appName}
          </Link>
          <p className="truncate text-xs text-neutral-500">
            {user ? `${user.name} · ${user.email}` : 'Authenticated session'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? 'Logging out...' : 'Log out'}
        </button>
      </div>
    </header>
  );
}