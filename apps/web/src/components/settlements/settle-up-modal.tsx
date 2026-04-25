'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui';
import {
  createGroupSettlement,
  type CreateGroupSettlementInput,
  type GroupMember,
  type SimplifiedBalance,
} from '@/lib/api';
import { ApiError } from '@/lib/api/client';

interface SettleUpModalProps {
  groupId: string;
  accessToken: string | null;
  currency: string;
  members: GroupMember[];
  balance: SimplifiedBalance | null;
  isOpen: boolean;
  onClose: () => void;
  onSettlementCreated: () => Promise<void> | void;
}

interface FormErrors {
  amount?: string;
  form?: string;
}

function formatCurrencyFromMinor(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function formatMinorAsInput(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function parseAmountToMinor(rawValue: string): number | null {
  const normalized = rawValue.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  const paddedFraction = `${fraction}00`.slice(0, 2);

  const parsedWhole = Number(whole);
  const parsedFraction = Number(paddedFraction);

  if (!Number.isInteger(parsedWhole) || !Number.isInteger(parsedFraction)) {
    return null;
  }

  return parsedWhole * 100 + parsedFraction;
}

export function SettleUpModal({
  groupId,
  accessToken,
  currency,
  members,
  balance,
  isOpen,
  onClose,
  onSettlementCreated,
}: SettleUpModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debtor = useMemo(
    () =>
      members.find(
        (member) => member.membershipId === balance?.fromMembershipId,
      ) ?? null,
    [balance?.fromMembershipId, members],
  );

  const creditor = useMemo(
    () =>
      members.find(
        (member) => member.membershipId === balance?.toMembershipId,
      ) ?? null,
    [balance?.toMembershipId, members],
  );

  useEffect(() => {
    if (!isOpen || !balance) {
      return;
    }

    setAmount(formatMinorAsInput(balance.amountMinor));
    setNote('');
    setErrors({});
    setIsSubmitting(false);
  }, [isOpen, balance]);

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

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setErrors({});
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!balance) {
      setErrors({
        form: 'No balance relation is available for settlement.',
      });
      return;
    }

    if (!accessToken) {
      setErrors({
        form: 'You must be signed in to record a settlement.',
      });
      return;
    }

    const parsedAmountMinor = parseAmountToMinor(amount);

    if (parsedAmountMinor == null) {
      setErrors({
        amount: 'Enter a valid amount with up to 2 decimal places.',
      });
      return;
    }

    if (parsedAmountMinor <= 0) {
      setErrors({
        amount: 'Settlement amount must be greater than 0.',
      });
      return;
    }

    if (parsedAmountMinor > balance.amountMinor) {
      setErrors({
        amount: `Amount cannot exceed ${formatCurrencyFromMinor(
          balance.amountMinor,
          currency,
        )}.`,
      });
      return;
    }

    const payload: CreateGroupSettlementInput = {
      fromMembershipId: balance.fromMembershipId,
      toMembershipId: balance.toMembershipId,
      amountMinor: parsedAmountMinor,
      currency,
      method: 'cash',
      note: note.trim().length > 0 ? note.trim() : null,
    };

    try {
      setIsSubmitting(true);
      setErrors({});

      await createGroupSettlement(groupId, payload, accessToken);
      await onSettlementCreated();

      setErrors({});
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          form: error.message,
        });
      } else {
        setErrors({
          form: 'Failed to record settlement. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !balance) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-up-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[var(--ledgerly-radius-lg)] border border-[color:var(--ledgerly-border)] bg-white shadow-2xl">
        <div className="bg-[var(--ledgerly-surface-soft)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--ledgerly-primary)]">
                Cash settlement
              </p>

              <h2
                id="settle-up-modal-title"
                className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[color:var(--ledgerly-text)]"
              >
                Settle up
              </h2>

              <p className="mt-2 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
                Record a manual cash settlement for the selected debt relation.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-full px-3 py-1.5 text-sm font-bold text-[color:var(--ledgerly-muted)] transition hover:bg-white hover:text-[color:var(--ledgerly-text)] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Close settle up modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 pt-6">
          <div className="rounded-2xl border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)] p-4 text-sm">
            <p className="font-bold text-[color:var(--ledgerly-text)]">
              {(debtor?.name ?? debtor?.email ?? 'Unknown member')} pays{' '}
              {(creditor?.name ?? creditor?.email ?? 'Unknown member')}
            </p>

            <p className="mt-1 text-[color:var(--ledgerly-muted)]">
              Current outstanding:{' '}
              {formatCurrencyFromMinor(balance.amountMinor, currency)}
            </p>

            <p className="mt-1 text-[color:var(--ledgerly-muted)]">
              Method: cash
            </p>
          </div>
        </div>

        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="settlement-amount"
              className="block text-sm font-bold text-[color:var(--ledgerly-text)]"
            >
              Amount
            </label>
            <input
              id="settlement-amount"
              name="settlement-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
              className="ledgerly-focus-ring mt-2 w-full rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3 text-sm text-[color:var(--ledgerly-text)] transition placeholder:text-[color:var(--ledgerly-faint)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            {errors.amount ? (
              <p className="mt-2 text-sm font-medium text-[color:var(--ledgerly-danger)]">
                {errors.amount}
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-[color:var(--ledgerly-muted)]">
                You can record a partial payment, but not more than the current
                outstanding balance.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="settlement-note"
              className="block text-sm font-bold text-[color:var(--ledgerly-text)]"
            >
              Note <span className="text-[color:var(--ledgerly-faint)]">(optional)</span>
            </label>
            <textarea
              id="settlement-note"
              name="settlement-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isSubmitting}
              placeholder="Paid in cash after dinner"
              className="ledgerly-focus-ring mt-2 w-full rounded-2xl border border-[color:var(--ledgerly-border)] bg-white px-4 py-3 text-sm text-[color:var(--ledgerly-text)] transition placeholder:text-[color:var(--ledgerly-faint)] disabled:cursor-not-allowed disabled:opacity-60"
            />
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
              {isSubmitting ? 'Recording settlement...' : 'Record settlement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}