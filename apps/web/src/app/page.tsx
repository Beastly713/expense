import Link from 'next/link';

import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { env } from '@/lib/env';

export default function LandingPage() {
  return (
    <PublicOnlyRoute>
      <main className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col justify-center gap-10">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
              {env.appName}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              Split shared expenses, track balances, and settle up clearly.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
              Create groups, invite people, add expenses, and keep a clean running view of who
              owes whom. This MVP focuses on the core Splitwise-style flow.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
            >
              Log in
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-900">Create groups</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Start with a trip, home, or any shared context where expenses need to stay visible.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-900">Split flexibly</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Support equal, exact, percentage, and shares-based splits with backend-owned math.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-900">See simplified balances</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Focus on the final “who owes whom” view instead of raw ledger complexity.
              </p>
            </div>
          </div>
        </div>
      </main>
    </PublicOnlyRoute>
  );
}