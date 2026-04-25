'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { Button, Card, CardContent } from '@/components/ui';
import { acceptInvite, type AcceptInviteResponse } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';
import { APP_NAME } from '@/lib/branding';

interface AcceptInviteErrorState {
  code: string;
  message: string;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[82vh] max-w-3xl items-center justify-center">
        <Card variant="elevated" className="w-full overflow-hidden">
          <CardContent className="p-6 sm:p-8">{children}</CardContent>
        </Card>
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
      ? 'rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]'
      : tone === 'success'
        ? 'rounded-2xl border border-[color:var(--ledgerly-positive)] bg-[var(--ledgerly-positive-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-positive)]'
        : 'rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-muted)]';

  return <div className={className}>{message}</div>;
}

function InviteHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
        {APP_NAME} invite
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[color:var(--ledgerly-text)]">
        {title}
      </h1>

      <p className="mt-4 text-sm leading-7 text-[color:var(--ledgerly-muted)]">
        {description}
      </p>
    </div>
  );
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
        <InviteHeader
          title="Invalid invite link"
          description="This invite link is missing its token. Ask the group owner to resend the invite."
        />

        <div className="mt-6">
          <StatusBox tone="error" message="Invite token is missing." />
        </div>

        <div className="mt-6">
          <Link href="/dashboard" className="inline-flex">
            <Button type="button">Go to dashboard</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (status === 'booting') {
    return (
      <Shell>
        <InviteHeader
          title="Loading invite"
          description="Checking your session so you can continue the invite flow."
        />
      </Shell>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Shell>
        <InviteHeader
          title="Sign up or log in to continue"
          description="This invite is tied to an email address. Log in with the invited email, or create an account with that same email, then continue invite acceptance."
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href={`/login?redirect=${encodedRedirect}`} className="inline-flex">
            <Button type="button" className="w-full">
              Log in
            </Button>
          </Link>

          <Link href={`/signup?redirect=${encodedRedirect}`} className="inline-flex">
            <Button type="button" variant="outline" className="w-full">
              Sign up
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (acceptSuccess) {
    return (
      <Shell>
        <InviteHeader
          title="You joined the group"
          description="Your membership is now active and you can continue into the group."
        />

        <div className="mt-6">
          <StatusBox
            tone="success"
            message={`Joined ${acceptSuccess.group.name} successfully.`}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/groups/${acceptSuccess.group.id}`} className="inline-flex">
            <Button type="button">Open group</Button>
          </Link>

          <Link href="/dashboard" className="inline-flex">
            <Button type="button" variant="outline">
              Go to dashboard
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <InviteHeader
        title="Accept this group invite"
        description="Accepting the invite activates the pending membership tied to your email while preserving the same membership id."
      />

      <p className="mt-4 text-sm leading-7 text-[color:var(--ledgerly-muted)]">
        You are signed in as{' '}
        <span className="font-bold text-[color:var(--ledgerly-text)]">
          {user?.email}
        </span>
        .
      </p>

      {acceptError ? (
        <div className="mt-6">
          <StatusBox
            tone={acceptError.code === 'FORBIDDEN' ? 'neutral' : 'error'}
            message={acceptError.message}
          />
        </div>
      ) : null}

      <div className="mt-6 rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-5">
        <h2 className="text-base font-bold text-[color:var(--ledgerly-text)]">
          What happens next
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
          <li>• your pending membership becomes active</li>
          <li>• the same membership id is preserved</li>
          <li>• historical group references stay intact</li>
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {!isTerminalError ? (
          <Button
            type="button"
            onClick={() => void handleAcceptInvite()}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Accepting invite...' : 'Accept invite'}
          </Button>
        ) : null}

        <Link href="/dashboard" className="inline-flex">
          <Button type="button" variant="outline">
            Go to dashboard
          </Button>
        </Link>

        {acceptError?.code === 'FORBIDDEN' ? (
          <Button type="button" variant="outline" onClick={() => void logout()}>
            Log out and switch account
          </Button>
        ) : null}
      </div>
    </Shell>
  );
}