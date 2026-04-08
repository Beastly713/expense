import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            Phase 1 web skeleton
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Shared expenses, simpler balances.
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            This commit only sets up the web app shell, route skeleton, and frontend API client
            foundation for the expense-sharing MVP.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          'App Router route placeholders',
          'Tailwind baseline styling',
          'Centralized frontend API helper shell',
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm"
          >
            {item}
          </div>
        ))}
      </section>
    </main>
  );
}