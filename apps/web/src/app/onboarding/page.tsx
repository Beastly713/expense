'use client';

import { useRouter } from 'next/navigation';

import { ProtectedRoute } from '@/components/layout/protected-route';
import { useAuth } from '@/lib/auth';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Onboarding
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-neutral-900">
              Welcome{user ? `, ${user.name}` : ''}.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-600">
              You are now signed in. The next core flow in the product is to create a group,
              invite people, and add your first expense.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <h2 className="text-base font-semibold text-neutral-900">Create a group</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Start a trip, house, or shared context and invite members.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Continue to dashboard
                </button>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h2 className="text-base font-semibold text-neutral-900">Skip for now</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  You can go straight to the dashboard and create your first group later.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                >
                  Skip to dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}