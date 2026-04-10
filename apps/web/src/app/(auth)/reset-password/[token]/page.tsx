'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AuthFormField } from '@/components/forms/auth-form-field';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
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

  const token =
    typeof params?.token === 'string' ? params.token : '';

  const formValues = useMemo(
    () => ({
      password,
      confirmPassword,
    }),
    [password, confirmPassword],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
        title="Reset password"
        subtitle="Choose a new password for your account."
        footer={
          <p className="text-sm text-neutral-600">
            Back to{' '}
            <Link href="/login" className="font-medium text-neutral-900 underline">
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
            {isSubmitting ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>
      </AuthPageShell>
    </PublicOnlyRoute>
  );
}