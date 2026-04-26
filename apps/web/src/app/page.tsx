import Link from 'next/link';

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  LANDING_HERO_DESCRIPTION,
  LANDING_HERO_TITLE,
} from '@/lib/branding';

const trustPills = [
  'Groups',
  'Friends',
  'Splits',
  'Settlements',
  'Activity',
];

const productStats = [
  {
    label: 'Split methods',
    value: '4',
    helper: 'Equal, exact, percent, and shares.',
  },
  {
    label: 'Ledger types',
    value: '2',
    helper: 'Groups and direct friend ledgers.',
  },
  {
    label: 'Source of truth',
    value: 'API',
    helper: 'Backend-owned balance correctness.',
  },
];

const featureCards = [
  {
    eyebrow: 'Track balances',
    title: 'Know who owes whom without opening a spreadsheet.',
    description:
      'Ledgerly keeps group and friend balances clear, readable, and centered around people instead of raw accounting rows.',
    accent: 'bg-[var(--ledgerly-primary-soft)] text-[color:var(--ledgerly-primary)]',
  },
  {
    eyebrow: 'Split flexibly',
    title: 'Use the split method that matches the moment.',
    description:
      'Split equally, by exact amounts, by percentages, or by shares while the backend owns final math and rounding.',
    accent: 'bg-[var(--ledgerly-purple-soft)] text-[color:var(--ledgerly-purple)]',
  },
  {
    eyebrow: 'Settle up',
    title: 'Record cash payments and keep everyone aligned.',
    description:
      'Manual settlements reduce awkward follow-ups and keep the group history visible through activity.',
    accent: 'bg-[var(--ledgerly-negative-soft)] text-[color:var(--ledgerly-negative)]',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: 'Create a group',
    description:
      'Start a trip, household, or shared plan. Pending invitees can still participate in expenses.',
  },
  {
    step: '02',
    title: 'Add expenses',
    description:
      'Choose the payer, participants, amount, and split method with a calm form built for clarity.',
  },
  {
    step: '03',
    title: 'Settle up',
    description:
      'Record cash settlements and let Ledgerly recompute the simplified balances.',
  },
];

const ledgerRows = [
  {
    name: 'Goa Trip',
    detail: 'Aisha owes you ₹900.00',
    amount: '₹1,200.00',
    tone: 'positive',
  },
  {
    name: 'Flatmates',
    detail: 'Rent, groceries, utilities',
    amount: 'Settled',
    tone: 'neutral',
  },
  {
    name: 'Rahul',
    detail: 'Direct friend ledger',
    amount: '₹320.00',
    tone: 'negative',
  },
];

const activityRows = [
  'Nisha added “Dinner” in Goa Trip',
  'Rahul recorded a cash settlement',
  'Aisha accepted the group invite',
];

function LedgerlyMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
      <div className="absolute -left-10 top-12 hidden h-28 w-28 rounded-full bg-[var(--ledgerly-primary-soft)] blur-2xl sm:block" />
      <div className="absolute -right-8 bottom-16 hidden h-32 w-32 rounded-full bg-[var(--ledgerly-purple-soft)] blur-2xl sm:block" />

      <div className="relative rounded-[2.25rem] border border-white/70 bg-white/80 p-3 shadow-[0_30px_90px_rgba(23,33,31,0.16)] backdrop-blur">
        <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-bg)]">
          <div className="flex items-center justify-between border-b border-[color:var(--ledgerly-border)] bg-white px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
                Dashboard
              </p>
              <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
                Welcome back, Aayush
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] text-sm font-black text-white">
              L
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                You owe
              </p>
              <p className="mt-3 text-xl font-black text-[color:var(--ledgerly-negative)]">
                ₹320
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                You are owed
              </p>
              <p className="mt-3 text-xl font-black text-[color:var(--ledgerly-positive)]">
                ₹2,450
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                Net
              </p>
              <p className="mt-3 text-xl font-black text-[color:var(--ledgerly-positive)]">
                ₹2,130
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-4 pt-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-black tracking-[-0.03em] text-[color:var(--ledgerly-text)]">
                  Active ledgers
                </h3>
                <span className="rounded-full bg-[var(--ledgerly-primary-soft)] px-3 py-1 text-xs font-bold text-[color:var(--ledgerly-primary)]">
                  Add expense
                </span>
              </div>

              <div className="space-y-3">
                {ledgerRows.map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[color:var(--ledgerly-text)]">
                        {row.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-[color:var(--ledgerly-muted)]">
                        {row.detail}
                      </p>
                    </div>

                    <p
                      className={
                        row.tone === 'positive'
                          ? 'shrink-0 text-sm font-black text-[color:var(--ledgerly-positive)]'
                          : row.tone === 'negative'
                            ? 'shrink-0 text-sm font-black text-[color:var(--ledgerly-negative)]'
                            : 'shrink-0 text-sm font-black text-[color:var(--ledgerly-muted)]'
                      }
                    >
                      {row.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[var(--ledgerly-surface-soft)] p-4">
              <h3 className="font-black tracking-[-0.03em] text-[color:var(--ledgerly-text)]">
                Recent activity
              </h3>

              <div className="mt-4 space-y-3">
                {activityRows.map((row) => (
                  <div key={row} className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--ledgerly-primary)]" />
                    <p className="text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                      {row}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--ledgerly-muted)]">
                  Simplified balance
                </p>
                <p className="mt-2 text-sm font-black text-[color:var(--ledgerly-text)]">
                  Rahul pays you ₹320.00
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 left-5 hidden rounded-2xl bg-[var(--ledgerly-negative-soft)] px-5 py-4 text-sm font-black text-[color:var(--ledgerly-negative)] shadow-sm md:block">
        Fewer awkward money reminders.
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="overflow-hidden">
      <section className="relative">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(circle at 12% 18%, rgba(15, 143, 114, 0.22), transparent 28rem), radial-gradient(circle at 86% 16%, rgba(114, 87, 216, 0.16), transparent 24rem), linear-gradient(180deg, #f8faf8 0%, #ffffff 78%)',
          }}
        />

        <div className="absolute left-1/2 top-10 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-[color:var(--ledgerly-border)] opacity-60" />
        <div className="absolute left-[8%] top-28 -z-10 hidden h-20 w-20 rotate-12 rounded-[1.75rem] bg-[var(--ledgerly-primary-soft)] md:block" />
        <div className="absolute right-[9%] top-44 -z-10 hidden h-16 w-16 -rotate-12 rounded-[1.5rem] bg-[var(--ledgerly-negative-soft)] md:block" />

        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ledgerly-border)] bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] text-xs font-black text-white">
                L
              </span>
              <span className="text-sm font-bold text-[color:var(--ledgerly-text)]">
                {APP_TAGLINE}
              </span>
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-black tracking-[-0.075em] text-[color:var(--ledgerly-text)] sm:text-6xl lg:text-7xl">
              {LANDING_HERO_TITLE}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--ledgerly-muted)] sm:text-xl">
              {LANDING_HERO_DESCRIPTION}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-13 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-7 py-4 text-sm font-black text-white shadow-[0_16px_35px_rgba(15,143,114,0.28)] transition hover:-translate-y-0.5 hover:bg-[var(--ledgerly-primary-dark)]"
              >
                Start using {APP_NAME}
              </Link>

              <Link
                href="/login"
                className="inline-flex h-13 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-7 py-4 text-sm font-black text-[color:var(--ledgerly-text)] transition hover:-translate-y-0.5 hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]"
              >
                Log in
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {trustPills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-[color:var(--ledgerly-border)] bg-white/70 px-3 py-1.5 text-xs font-bold text-[color:var(--ledgerly-muted)] backdrop-blur"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <LedgerlyMockup />
        </div>
      </section>

      <section className="border-y border-[color:var(--ledgerly-border)] bg-[color:var(--ledgerly-text)] text-white">
        <div className="mx-auto grid max-w-7xl gap-px px-4 py-px sm:px-6 lg:grid-cols-3 lg:px-8">
          {productStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[color:var(--ledgerly-text)] px-2 py-8 lg:px-8"
            >
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/55">
                {stat.label}
              </p>
              <p className="mt-3 text-5xl font-black tracking-[-0.06em]">
                {stat.value}
              </p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                {stat.helper}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
              Built for shared money
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] text-[color:var(--ledgerly-text)] sm:text-5xl">
              Social expense tracking, without the finance-app anxiety.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[color:var(--ledgerly-muted)]">
              {APP_DESCRIPTION} The experience stays people-first while the
              backend keeps the money logic strict.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-[2rem] border border-[color:var(--ledgerly-border)] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--ledgerly-shadow-soft)]"
              >
                <div
                  className={`mb-8 inline-flex rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${feature.accent}`}
                >
                  {feature.eyebrow}
                </div>

                <h3 className="text-2xl font-black tracking-[-0.04em] text-[color:var(--ledgerly-text)]">
                  {feature.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[color:var(--ledgerly-muted)]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative py-20 sm:py-24"
        style={{
          background:
            'linear-gradient(135deg, #0f8f72 0%, #08745c 48%, #17211f 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,white,transparent_20rem)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
              How it works
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">
              From “who paid?” to “settled up” in three calm steps.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Ledgerly keeps the core flow focused: create the context, add the
              expense, and record what got paid back.
            </p>
          </div>

          <div className="grid gap-4">
            {workflowSteps.map((item) => (
              <article
                key={item.step}
                className="rounded-[2rem] border border-white/15 bg-white/10 p-6 text-white shadow-sm backdrop-blur"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-[color:var(--ledgerly-primary)]">
                    {item.step}
                  </span>

                  <div>
                    <h3 className="text-xl font-black tracking-[-0.03em]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-white/72">
                      {item.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--ledgerly-bg)] py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div className="rounded-[2.25rem] border border-[color:var(--ledgerly-border)] bg-white p-8 shadow-[var(--ledgerly-shadow-soft)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
              Trust layer
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] text-[color:var(--ledgerly-text)] sm:text-5xl">
              Every change leaves a trail.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[color:var(--ledgerly-muted)]">
              Expenses, edits, deletes, restores, invites, acceptances, and
              settlements all show up as human-readable activity. That keeps the
              social side of shared money transparent.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                'Soft-delete and restore',
                'Pending invite tracking',
                'Settlement history',
                'Human-readable activity',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-4 text-sm font-bold text-[color:var(--ledgerly-text)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-[color:var(--ledgerly-border)] bg-[color:var(--ledgerly-text)] p-8 text-white shadow-[var(--ledgerly-shadow-soft)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/55">
              MVP discipline
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              Powerful enough for real shared expenses. Simple enough to ship.
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/70">
              Ledgerly stays focused on web-first groups, direct ledgers,
              flexible splits, manual cash settlements, and derived balances.
            </p>

            <div className="mt-8 rounded-[1.5rem] bg-white/10 p-5">
              <p className="text-sm font-black text-white">
                Backend owns correctness
              </p>
              <p className="mt-2 text-sm leading-7 text-white/65">
                Split math, rounding, settlements, and balances stay server-side
                so the UI remains clean without becoming the source of truth.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-8 text-center shadow-sm sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
            Ready when the bill arrives
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] text-[color:var(--ledgerly-text)] sm:text-6xl">
            Make shared expenses feel less awkward.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[color:var(--ledgerly-muted)]">
            Start with a group, invite people, add the first expense, and let
            Ledgerly keep the balances understandable.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-13 items-center justify-center rounded-full bg-[var(--ledgerly-primary)] px-7 py-4 text-sm font-black text-white shadow-[0_16px_35px_rgba(15,143,114,0.25)] transition hover:-translate-y-0.5 hover:bg-[var(--ledgerly-primary-dark)]"
            >
              Create your account
            </Link>

            <Link
              href="/login"
              className="inline-flex h-13 items-center justify-center rounded-full border border-[color:var(--ledgerly-border)] bg-white px-7 py-4 text-sm font-black text-[color:var(--ledgerly-text)] transition hover:-translate-y-0.5 hover:border-[color:var(--ledgerly-primary)]"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}