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
  validateSignupForm,
} from '@/lib/validations/auth';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirect = searchParams.get('redirect');

  const formValues = useMemo(
    () => ({
      name,
      email,
      password,
      confirmPassword,
    }),
    [name, email, password, confirmPassword],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateSignupForm(formValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      router.replace(redirect || '/onboarding');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          form: error.message,
        });
      } else if (error instanceof Error) {
        setErrors({
          form: error.message,
        });
      } else {
        setErrors({
          form: 'Unable to sign up right now. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicOnlyRoute authenticatedRedirectTo={redirect || '/onboarding'}>
      <AuthPageShell
        title="Create your Ledgerly account"
        subtitle="Start splitting shared expenses with clear balances and simple settle-ups."
        footer={
          <p className="text-sm text-[color:var(--ledgerly-muted)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline"
            >
              Log in
            </Link>
          </p>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <AuthFormField
            id="name"
            label="Full name"
            value={name}
            onChange={setName}
            autoComplete="name"
            placeholder="Rahul Sharma"
            error={errors.name ?? null}
          />

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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password ?? null}
          />

          <AuthFormField
            id="confirmPassword"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            placeholder="Repeat your password"
            error={errors.confirmPassword ?? null}
          />

          {errors.form ? (
            <div className="rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
              {errors.form}
            </div>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>
      </AuthPageShell>
    </PublicOnlyRoute>
  );
}