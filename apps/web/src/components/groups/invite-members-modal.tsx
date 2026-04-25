'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui';
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-members-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white shadow-2xl">
        <div className="bg-[var(--ledgerly-surface-soft)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
                Invite
              </p>

              <h2
                id="invite-members-modal-title"
                className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]"
              >
                Invite members
              </h2>

              <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                Enter one or more email addresses separated by commas or new
                lines. Pending invitees can participate in expenses.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full px-3 py-1.5 text-sm font-bold text-[color:var(--ledgerly-muted)] transition hover:bg-white hover:text-[color:var(--ledgerly-text)] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Close invite members modal"
            >
              ✕
            </button>
          </div>
        </div>

        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="inviteEmails"
              className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
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
              className="ledgerly-focus-ring w-full rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3 text-sm text-[color:var(--ledgerly-text)] transition placeholder:text-[color:var(--ledgerly-faint)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {formError ? (
            <div className="rounded-2xl border border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-danger)]">
              {formError}
            </div>
          ) : null}

          {formSuccess ? (
            <div className="rounded-2xl border border-[color:var(--ledgerly-positive)] bg-[var(--ledgerly-positive-soft)] px-4 py-3 text-sm text-[color:var(--ledgerly-positive)]">
              {formSuccess}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Close
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending invites...' : 'Send invites'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}