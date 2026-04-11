'use client';

import { useEffect, useState } from 'react';
import { createGroupInvites } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { validateInviteEmails } from '@/lib/validations/invites';

interface InviteMembersModalProps {
  groupId: string;
  accessToken: string | null;
  isOpen: boolean;
  onClose: () => void;
  onInvitesCreated: () => Promise<void> | void;
}

export function InviteMembersModal({
  groupId,
  accessToken,
  isOpen,
  onClose,
  onInvitesCreated,
}: InviteMembersModalProps) {
  const [rawEmails, setRawEmails] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRawEmails('');
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(false);
  }, [isOpen]);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateInviteEmails(rawEmails);

    if (validation.error) {
      setFormError(validation.error);
      setFormSuccess(null);
      return;
    }

    if (!accessToken) {
      setFormError('You must be signed in to invite members.');
      setFormSuccess(null);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      setFormSuccess(null);

      const response = await createGroupInvites(
        groupId,
        { emails: validation.emails },
        accessToken,
      );

      await onInvitesCreated();

      const inviteCount = response.invites.length;
      setFormSuccess(
        inviteCount === 1
          ? 'Invite sent successfully.'
          : `${inviteCount} invites sent successfully.`,
      );
      setRawEmails('');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to send invites.');
      }
      setFormSuccess(null);
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
      aria-labelledby="invite-members-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="invite-members-modal-title"
              className="text-xl font-semibold text-neutral-900"
            >
              Invite members
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Enter one or more email addresses separated by commas or new lines.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-2 py-1 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close invite members modal"
          >
            ✕
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="inviteEmails"
              className="mb-1 block text-sm font-medium text-neutral-900"
            >
              Email addresses
            </label>
            <textarea
              id="inviteEmails"
              value={rawEmails}
              onChange={(event) => setRawEmails(event.target.value)}
              placeholder={'aayush@example.com\nriya@example.com'}
              rows={6}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
            />
          </div>

          {formError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          {formSuccess ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {formSuccess}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Sending invites...' : 'Send invites'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}