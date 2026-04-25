import Link from 'next/link';

import { APP_NAME } from '@/lib/branding';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--ledgerly-border)] bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] text-sm font-black text-white shadow-sm">
            L
          </span>

          <span className="truncate text-lg font-bold tracking-[-0.03em] text-[color:var(--ledgerly-text)]">
            {APP_NAME}
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2">
          <a
            href="#features"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--ledgerly-muted)] transition hover:bg-[var(--ledgerly-surface-soft)] hover:text-[color:var(--ledgerly-text)] sm:inline-flex"
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--ledgerly-muted)] transition hover:bg-[var(--ledgerly-surface-soft)] hover:text-[color:var(--ledgerly-text)] md:inline-flex"
          >
            How it works
          </a>

          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--ledgerly-muted)] transition hover:bg-[var(--ledgerly-surface-soft)] hover:text-[color:var(--ledgerly-text)]"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-full bg-[var(--ledgerly-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--ledgerly-primary-dark)]"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}