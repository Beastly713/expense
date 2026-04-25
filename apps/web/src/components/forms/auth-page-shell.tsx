import type { ReactNode } from 'react';

import {
  APP_DESCRIPTION,
  APP_NAME,
  AUTH_SIDE_DESCRIPTION,
  AUTH_SIDE_TITLE,
} from '@/lib/branding';

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto grid min-h-[82vh] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden overflow-hidden rounded-[2rem] border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-primary)] p-8 text-white shadow-[var(--ledgerly-shadow-soft)] lg:block">
          <div className="flex h-full min-h-[560px] flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-base font-black text-[color:var(--ledgerly-primary)]">
                L
              </div>

              <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-white/75">
                {APP_NAME}
              </p>

              <h2 className="mt-4 max-w-md text-5xl font-bold tracking-[-0.07em]">
                {AUTH_SIDE_TITLE}
              </h2>

              <p className="mt-5 max-w-md text-base leading-7 text-white/80">
                {AUTH_SIDE_DESCRIPTION}
              </p>
            </div>

            <div className="rounded-[1.5rem] bg-white/12 p-5 backdrop-blur">
              <p className="text-sm font-semibold text-white">
                {APP_DESCRIPTION}
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-white p-4 text-[color:var(--ledgerly-text)]">
                  <p className="text-sm font-bold">Goa Trip</p>
                  <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                    Aisha owes you ₹900.00
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 text-[color:var(--ledgerly-text)]">
                  <p className="text-sm font-bold">Flatmates</p>
                  <p className="mt-1 text-sm text-[color:var(--ledgerly-muted)]">
                    Rent settled in cash
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white p-6 shadow-[var(--ledgerly-shadow-soft)] sm:p-8">
            <div className="mb-7">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
                {APP_NAME}
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[color:var(--ledgerly-text)]">
                {title}
              </h1>

              <p className="mt-3 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                {subtitle}
              </p>
            </div>

            {children}

            {footer ? (
              <div className="mt-6 border-t border-[color:var(--ledgerly-border)] pt-4">
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}