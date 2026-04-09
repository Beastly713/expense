'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AuthFormField } from '@/components/forms/auth-form-field';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api/client';
import {
  type AuthFormErrors,
  validateSignupForm,
} from '@/lib/validations/auth';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formValues = useMemo(
    () => ({
      name,
      email,
      password,
      confirmPassword,
    }),
    [name, email, password, confirmPassword],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      router.replace('/onboarding');
    } catch (error) {
      console.error('Signup failed:', error);

      if (error instanceof ApiError) {
        setErrors({
          form: `${error.code}: ${error.message}`,
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
    <PublicOnlyRoute authenticatedRedirectTo="/onboarding">
      <AuthPageShell
        title="Create your account"
        subtitle="Sign up with email and password to start using the app."
        footer={
          <p className="text-sm text-neutral-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-neutral-900 underline">
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.form}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      </AuthPageShell>
    </PublicOnlyRoute>
  );
}