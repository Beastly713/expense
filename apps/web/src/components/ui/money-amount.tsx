import { cn } from '@/lib/utils';

type MoneyAmountTone = 'auto' | 'positive' | 'negative' | 'neutral';
type MoneyAmountSize = 'sm' | 'md' | 'lg' | 'xl';
type MoneySignMode = 'auto' | 'always' | 'never';

interface MoneyAmountProps {
  amountMinor: number;
  currency?: string;
  tone?: MoneyAmountTone;
  size?: MoneyAmountSize;
  signMode?: MoneySignMode;
  className?: string;
}

const sizeClasses: Record<MoneyAmountSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
};

function resolveTone(
  amountMinor: number,
  tone: MoneyAmountTone,
): Exclude<MoneyAmountTone, 'auto'> {
  if (tone !== 'auto') {
    return tone;
  }

  if (amountMinor > 0) {
    return 'positive';
  }

  if (amountMinor < 0) {
    return 'negative';
  }

  return 'neutral';
}

function formatMoney(
  amountMinor: number,
  currency: string,
  signMode: MoneySignMode,
): string {
  const absoluteAmount = Math.abs(amountMinor) / 100;

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteAmount);

  if (signMode === 'never' || amountMinor === 0) {
    return formatted;
  }

  if (signMode === 'always') {
    return `${amountMinor > 0 ? '+' : '-'}${formatted}`;
  }

  return amountMinor < 0 ? `-${formatted}` : formatted;
}

export function MoneyAmount({
  amountMinor,
  currency = 'INR',
  tone = 'auto',
  size = 'md',
  signMode = 'auto',
  className,
}: MoneyAmountProps) {
  const resolvedTone = resolveTone(amountMinor, tone);

  return (
    <span
      className={cn(
        'font-bold tabular-nums tracking-[-0.02em]',
        sizeClasses[size],
        resolvedTone === 'positive' &&
          'text-[color:var(--ledgerly-positive)]',
        resolvedTone === 'negative' &&
          'text-[color:var(--ledgerly-negative)]',
        resolvedTone === 'neutral' && 'text-[color:var(--ledgerly-muted)]',
        className,
      )}
    >
      {formatMoney(amountMinor, currency, signMode)}
    </span>
  );
}