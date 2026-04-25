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
    title: 'Track who owes whom',
    description:
      'See clear group and friend-ledger balances without reading raw accounting rows.',
  },
  {
    title: 'Split expenses your way',
    description:
      'Use equal, exact, percentage, or shares-based splits with backend-owned rounding.',
  },
  {
    title: 'Settle up with trust',
    description:
      'Record manual cash settlements and keep every important change visible in activity.',
  },
];

const workflowSteps = [
  {
    title: 'Create a group or friend ledger',
    description:
      'Organize shared costs for trips, flatmates, family, or simple 1:1 balances.',
  },
  {
    title: 'Add an expense',
    description:
      'Pick the payer, participants, split method, date, and notes in one focused flow.',
  },
  {
    title: 'Review balances and settle up',
    description:
      'Use simplified balances to understand who should pay whom, then record cash settlements.',
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
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-[color:var(--ledgerly-muted)]">
                  Overall balance
                </p>

                <span className="rounded-full bg-[var(--ledgerly-primary-soft)] px-3 py-1 text-xs font-bold text-[color:var(--ledgerly-primary)]">
                  MVP web
                </span>
              </div>

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
                        Direct friend ledger
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

      <section
        id="features"
        className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8"
      >
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
            Core workflows
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[color:var(--ledgerly-text)]">
            Built for everyday shared costs
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ledgerly-muted)]">
            {APP_DESCRIPTION}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white p-5 shadow-sm"
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

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8"
      >
        <div className="rounded-[2rem] border border-[color:var(--ledgerly-border)] bg-white p-6 shadow-[var(--ledgerly-shadow-soft)] sm:p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
              How it works
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[color:var(--ledgerly-text)]">
              A simple flow from expense to settlement
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-[var(--ledgerly-radius-lg)] bg-[var(--ledgerly-surface-soft)] p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] text-sm font-black text-white">
                  {index + 1}
                </div>

                <h3 className="mt-4 text-lg font-bold text-[color:var(--ledgerly-text)]">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}