'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AuthFormField } from '@/components/forms/auth-form-field';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
        title="Forgot password"
        subtitle="Enter your email and we’ll send a reset link if the account exists."
        footer={
          <p className="text-sm text-neutral-600">
            Remembered your password?{' '}
            <Link href="/login" className="font-medium text-neutral-900 underline">
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.form}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>
      </AuthPageShell>
    </PublicOnlyRoute>
  );
}