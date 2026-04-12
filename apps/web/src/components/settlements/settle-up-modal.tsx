'use client';

import { useEffect, useMemo, useState } from 'react';

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">Settle up</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Record a manual cash settlement for the selected debt relation.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <p className="font-medium text-neutral-900">
            {(debtor?.name ?? debtor?.email ?? 'Unknown member')} pays{' '}
            {(creditor?.name ?? creditor?.email ?? 'Unknown member')}
          </p>
          <p className="mt-1 text-neutral-600">
            Current outstanding:{' '}
            {formatCurrencyFromMinor(balance.amountMinor, currency)}
          </p>
          <p className="mt-1 text-neutral-500">Method: cash</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="settlement-amount"
              className="block text-sm font-medium text-neutral-900"
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
              className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {errors.amount ? (
              <p className="mt-2 text-sm text-red-600">{errors.amount}</p>
            ) : (
              <p className="mt-2 text-xs text-neutral-500">
                You can record a partial payment, but not more than the current
                outstanding balance.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="settlement-note"
              className="block text-sm font-medium text-neutral-900"
            >
              Note <span className="text-neutral-400">(optional)</span>
            </label>
            <textarea
              id="settlement-note"
              name="settlement-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isSubmitting}
              placeholder="Paid in cash after dinner"
              className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
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
              {isSubmitting ? 'Recording settlement...' : 'Record settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}