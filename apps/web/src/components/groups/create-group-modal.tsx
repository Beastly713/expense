'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="create-group-modal-title"
              className="text-xl font-semibold text-neutral-900"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg px-2 py-1 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close create group modal"
          >
            ✕
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="groupName"
              className="mb-1 block text-sm font-medium text-neutral-900"
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
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
            />
            {errors.name ? (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="defaultCurrency"
              className="mb-1 block text-sm font-medium text-neutral-900"
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
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm uppercase text-neutral-900 outline-none transition focus:border-neutral-900"
            />
            {errors.defaultCurrency ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.defaultCurrency}
              </p>
            ) : null}
          </div>

          {errors.form ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.form}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating group...' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}