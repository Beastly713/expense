'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

import { AuthFormField } from '@/components/forms/auth-form-field';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { Button } from '@/components/ui';
import { forgotPassword } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import {
  type AuthFormErrors,
  validateForgotPasswordForm,
} from '@/lib/validations/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formValues = useMemo(
    () => ({
      email,
    }),
    [email],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForgotPasswordForm(formValues);
    setErrors(nextErrors);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await forgotPassword({
        email: email.trim(),
      });

      setSuccessMessage(result.message);
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
          form: 'Unable to send reset email right now. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicOnlyRoute>
      <AuthPageShell
        title="Reset your Ledgerly password"
        subtitle="Enter your email and we’ll send a reset link if an account exists."
        footer={
          <p className="text-sm text-[color:var(--ledgerly-muted)]">
            Remembered your password?{' '}
            <Link
              href="/login"
              className="font-bold text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline"
            >
              Back to login
            </Link>
          </p>
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

          {errors.form ? (
            <div className="rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
              {errors.form}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-[color:var(--ledgerly-positive)] bg-[var(--ledgerly-positive-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-positive)]">
              {successMessage}
            </div>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending link...' : 'Send reset link'}
          </Button>
        </form>
      </AuthPageShell>
    </PublicOnlyRoute>
  );
}