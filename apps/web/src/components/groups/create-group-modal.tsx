'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui';
import { createGroup } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';
import {
  validateCreateGroupForm,
  type CreateGroupFormErrors,
} from '@/lib/validations/groups';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

const DEFAULT_CURRENCY = 'INR';

const inputClassName =
  'ledgerly-focus-ring w-full rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3 text-sm text-[color:var(--ledgerly-text)] transition placeholder:text-[color:var(--ledgerly-faint)] disabled:cursor-not-allowed disabled:opacity-60';

export function CreateGroupModal({
  isOpen,
  onClose,
  title = 'Create a group',
  description = 'Start a trip, household, or shared context and invite members.',
}: CreateGroupModalProps) {
  const router = useRouter();
  const { accessToken, user } = useAuth();

  const initialCurrency = useMemo(
    () => user?.defaultCurrency?.trim().toUpperCase() || DEFAULT_CURRENCY,
    [user?.defaultCurrency],
  );

  const [name, setName] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState(initialCurrency);
  const [errors, setErrors] = useState<CreateGroupFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDefaultCurrency(initialCurrency);
    setErrors({});
  }, [isOpen, initialCurrency]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  function resetForm() {
    setName('');
    setDefaultCurrency(initialCurrency);
    setErrors({});
    setIsSubmitting(false);
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateCreateGroupForm({
      name,
      defaultCurrency,
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!accessToken) {
      setErrors({
        form: 'You must be signed in to create a group.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await createGroup(
        {
          name: name.trim(),
          defaultCurrency: defaultCurrency.trim().toUpperCase(),
          type: 'group',
        },
        accessToken,
      );

      resetForm();
      onClose();
      router.push(`/groups/${response.group.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          form: error.message,
        });
      } else {
        setErrors({
          form: 'Failed to create group.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-modal-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white shadow-2xl">
        <div className="bg-[var(--ledgerly-surface-soft)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
                Group
              </p>

              <h2
                id="create-group-modal-title"
                className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]"
              >
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-full px-3 py-1.5 text-sm font-bold text-[color:var(--ledgerly-muted)] transition hover:bg-white hover:text-[color:var(--ledgerly-text)] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Close create group modal"
            >
              ✕
            </button>
          </div>
        </div>

        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="groupName"
              className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
            >
              Group name
            </label>
            <input
              id="groupName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Goa Trip"
              autoComplete="off"
              disabled={isSubmitting}
              className={inputClassName}
            />
            {errors.name ? (
              <p className="mt-2 text-sm font-medium text-[color:var(--ledgerly-danger)]">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="defaultCurrency"
              className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
            >
              Default currency
            </label>
            <input
              id="defaultCurrency"
              type="text"
              value={defaultCurrency}
              onChange={(event) =>
                setDefaultCurrency(event.target.value.toUpperCase())
              }
              placeholder="INR"
              maxLength={3}
              autoComplete="off"
              disabled={isSubmitting}
              className={`${inputClassName} uppercase`}
            />
            {errors.defaultCurrency ? (
              <p className="mt-2 text-sm font-medium text-[color:var(--ledgerly-danger)]">
                {errors.defaultCurrency}
              </p>
            ) : null}
          </div>

          {errors.form ? (
            <div className="rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
              {errors.form}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating group...' : 'Create group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}