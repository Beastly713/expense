'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

import { AuthFormField } from '@/components/forms/auth-form-field';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { Button } from '@/components/ui';
import { resetPassword } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import {
  type AuthFormErrors,
  validateResetPasswordForm,
} from '@/lib/validations/auth';

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = typeof params?.token === 'string' ? params.token : '';

  const formValues = useMemo(
    () => ({
      password,
      confirmPassword,
    }),
    [password, confirmPassword],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateResetPasswordForm(formValues);
    setErrors(nextErrors);
    setSuccessMessage(null);

    if (!token) {
      setErrors({
        form: 'Reset token is missing.',
      });
      return;
    }

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await resetPassword({
        token,
        newPassword: password,
      });

      setSuccessMessage(result.message);

      window.setTimeout(() => {
        router.replace('/login');
      }, 1200);
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
          form: 'Unable to reset password right now. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicOnlyRoute>
      <AuthPageShell
        title="Choose a new password"
        subtitle="Secure your Ledgerly account with a new password."
        footer={
          <p className="text-sm text-[color:var(--ledgerly-muted)]">
            Back to{' '}
            <Link
              href="/login"
              className="font-bold text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline"
            >
              login
            </Link>
          </p>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <AuthFormField
            id="password"
            label="New password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password ?? null}
          />

          <AuthFormField
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            error={errors.confirmPassword ?? null}
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
            {isSubmitting ? 'Resetting password...' : 'Reset password'}
          </Button>
        </form>
      </AuthPageShell>
    </PublicOnlyRoute>
  );
}