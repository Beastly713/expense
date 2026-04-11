'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { acceptInvite, type AcceptInviteResponse } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';

interface AcceptInviteErrorState {
  code: string;
  message: string;
}

function Shell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

function StatusBox({
  tone,
  message,
}: {
  tone: 'error' | 'success' | 'neutral';
  message: string;
}) {
  const className =
    tone === 'error'
      ? 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
      : tone === 'success'
        ? 'rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'
        : 'rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700';

  return <div className={className}>{message}</div>;
}

export default function InviteAcceptancePage() {
  const params = useParams<{ token: string }>();
  const { status, accessToken, user, logout } = useAuth();

  const token =
    typeof params?.token === 'string'
      ? params.token
      : Array.isArray(params?.token)
        ? params.token[0]
        : '';

  const redirectPath = useMemo(
    () => (token ? `/invite/${token}` : '/invite'),
    [token],
  );

  const encodedRedirect = useMemo(
    () => encodeURIComponent(redirectPath),
    [redirectPath],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptError, setAcceptError] = useState<AcceptInviteErrorState | null>(
    null,
  );
  const [acceptSuccess, setAcceptSuccess] =
    useState<AcceptInviteResponse | null>(null);

  const isTerminalError =
    acceptError?.code === 'INVALID_TOKEN' ||
    acceptError?.code === 'EXPIRED_TOKEN' ||
    acceptError?.code === 'CONFLICT' ||
    acceptError?.code === 'ALREADY_MEMBER';

  async function handleAcceptInvite() {
    if (!token) {
      setAcceptError({
        code: 'INVALID_TOKEN',
        message: 'Invite token is missing.',
      });
      return;
    }

    if (!accessToken) {
      setAcceptError({
        code: 'UNAUTHORIZED',
        message: 'You must log in before accepting this invite.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setAcceptError(null);

      const response = await acceptInvite(token, accessToken);
      setAcceptSuccess(response);
    } catch (error) {
      if (error instanceof ApiError) {
        setAcceptError({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof Error) {
        setAcceptError({
          code: 'UNKNOWN_ERROR',
          message: error.message,
        });
      } else {
        setAcceptError({
          code: 'UNKNOWN_ERROR',
          message: 'Unable to accept invite right now. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Shell>
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Invite acceptance
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-900">
          Invalid invite link
        </h1>
        <p className="mt-4 text-sm leading-7 text-neutral-600">
          This invite link is missing its token. Ask the group owner to resend
          the invite.
        </p>

        <div className="mt-6">
          <StatusBox tone="error" message="Invite token is missing." />
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Go to dashboard
          </Link>
        </div>
      </Shell>
    );
  }

  if (status === 'booting') {
    return (
      <Shell>
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Invite acceptance
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-900">
          Loading invite
        </h1>
        <p className="mt-4 text-sm leading-7 text-neutral-600">
          Checking your session so you can continue the invite flow.
        </p>
      </Shell>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Shell>
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Invite acceptance
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-900">
          Sign up or log in to continue
        </h1>
        <p className="mt-4 text-sm leading-7 text-neutral-600">
          This invite is tied to an email address. Log in with the invited email,
          or create an account with that same email, then continue invite
          acceptance.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href={`/login?redirect=${encodedRedirect}`}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Log in
          </Link>

          <Link
            href={`/signup?redirect=${encodedRedirect}`}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
          >
            Sign up
          </Link>
        </div>
      </Shell>
    );
  }

  if (acceptSuccess) {
    return (
      <Shell>
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Invite acceptance
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-900">
          You joined the group
        </h1>
        <p className="mt-4 text-sm leading-7 text-neutral-600">
          Your membership is now active and you can continue into the group.
        </p>

        <div className="mt-6">
          <StatusBox
            tone="success"
            message={`Joined ${acceptSuccess.group.name} successfully.`}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/groups/${acceptSuccess.group.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Open group
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
          >
            Go to dashboard
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
        Invite acceptance
      </p>

      <h1 className="mt-3 text-3xl font-semibold text-neutral-900">
        Accept this group invite
      </h1>

      <p className="mt-4 text-sm leading-7 text-neutral-600">
        You are signed in as{' '}
        <span className="font-medium text-neutral-900">{user?.email}</span>.
        Accept the invite to activate the pending membership tied to this email.
      </p>

      {acceptError ? (
        <div className="mt-6">
          <StatusBox
            tone={acceptError.code === 'FORBIDDEN' ? 'neutral' : 'error'}
            message={acceptError.message}
          />
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <h2 className="text-base font-semibold text-neutral-900">
          What happens next
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600">
          <li>• your pending membership becomes active</li>
          <li>• the same membership id is preserved</li>
          <li>• historical group references stay intact</li>
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {!isTerminalError ? (
          <button
            type="button"
            onClick={() => void handleAcceptInvite()}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Accepting invite...' : 'Accept invite'}
          </button>
        ) : null}

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
        >
          Go to dashboard
        </Link>

        {acceptError?.code === 'FORBIDDEN' ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
          >
            Log out and switch account
          </button>
        ) : null}
      </div>
    </Shell>
  );
}