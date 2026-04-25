import Link from 'next/link';

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  LANDING_HERO_DESCRIPTION,
  LANDING_HERO_TITLE,
} from '@/lib/branding';

const featureCards = [
  {
    title: 'Track balances',
    description:
      'See who owes whom across groups and direct friend ledgers without reading raw ledger math.',
  },
  {
    title: 'Split flexibly',
    description:
      'Use equal, exact, percentage, or shares-based splits with backend-owned rounding.',
  },
  {
    title: 'Settle up clearly',
    description:
      'Record manual cash settlements and keep every change visible through activity.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
            {APP_NAME}
          </p>

          <h1 className="max-w-3xl text-5xl font-bold tracking-[-0.06em] text-[color:var(--ledgerly-text)] sm:text-6xl">
            {LANDING_HERO_TITLE}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--ledgerly-muted)]">
            {LANDING_HERO_DESCRIPTION}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--ledgerly-primary-dark)]"
            >
              Start using Ledgerly
            </Link>

            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-6 text-sm font-bold text-[color:var(--ledgerly-text)] transition hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
            >
              Log in
            </Link>
          </div>

          <p className="mt-5 text-sm text-[color:var(--ledgerly-muted)]">
            {APP_TAGLINE}
          </p>
        </div>

        <div className="relative">
          <div className="rounded-[2rem] border border-[color:var(--ledgerly-border)] bg-white p-6 shadow-[var(--ledgerly-shadow-soft)]">
            <div className="rounded-[1.5rem] bg-[var(--ledgerly-surface-soft)] p-5">
              <p className="text-sm font-bold text-[color:var(--ledgerly-muted)]">
                Overall
              </p>

              <p className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
                You are owed{' '}
                <span className="text-[color:var(--ledgerly-positive)]">
                  ₹2,450.00
                </span>
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-[color:var(--ledgerly-text)]">
                        Goa Trip
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                        Aisha owes you ₹900.00
                      </p>
                    </div>
                    <p className="font-bold text-[color:var(--ledgerly-positive)]">
                      ₹1,200.00
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-[color:var(--ledgerly-text)]">
                        Rahul
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                        Direct ledger
                      </p>
                    </div>
                    <p className="font-bold text-[color:var(--ledgerly-negative)]">
                      ₹320.00
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-[color:var(--ledgerly-text)]">
                        Flatmates
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                        Settled after rent
                      </p>
                    </div>
                    <p className="font-bold text-[color:var(--ledgerly-muted)]">
                      Settled
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-5 hidden rounded-3xl bg-[var(--ledgerly-negative-soft)] px-5 py-4 text-sm font-semibold text-[color:var(--ledgerly-negative)] shadow-sm sm:block">
            Clear balances, fewer awkward reminders.
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
            Built for everyday shared costs
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--ledgerly-muted)]">
            {APP_DESCRIPTION}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white p-5"
            >
              <h3 className="text-lg font-bold text-[color:var(--ledgerly-text)]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}