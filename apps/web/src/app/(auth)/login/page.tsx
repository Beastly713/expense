'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

import { AuthFormField } from '@/components/forms/auth-form-field';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';
import {
  type AuthFormErrors,
  validateLoginForm,
} from '@/lib/validations/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formValues = useMemo(
    () => ({
      email,
      password,
    }),
    [email, password],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateLoginForm(formValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await login({
        email: email.trim(),
        password,
      });

      const redirect = searchParams.get('redirect');
      router.replace(redirect || '/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          form: error.message,
        });
      } else {
        setErrors({
          form: 'Unable to log in right now. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicOnlyRoute>
      <AuthPageShell
        title="Welcome back to Ledgerly"
        subtitle="Log in to view your groups, balances, settlements, and activity."
        footer={
          <div className="flex flex-col gap-3 text-sm text-[color:var(--ledgerly-muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>
              New here?{' '}
              <Link
                href="/signup"
                className="font-bold text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline"
              >
                Sign up
              </Link>
            </p>

            <Link
              href="/forgot-password"
              className="font-bold text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <AuthFormField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="rahul@example.com"
            error={errors.email ?? null}
          />

          <AuthFormField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password ?? null}
          />

          {errors.form ? (
            <div className="rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
              {errors.form}
            </div>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>
      </AuthPageShell>
    </PublicOnlyRoute>
  );
}