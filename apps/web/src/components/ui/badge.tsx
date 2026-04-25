import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant | undefined;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'bg-[var(--ledgerly-surface-soft)] text-[color:var(--ledgerly-muted)]',
  brand:
    'bg-[var(--ledgerly-primary-soft)] text-[color:var(--ledgerly-primary-dark)]',
  success:
    'bg-[var(--ledgerly-positive-soft)] text-[color:var(--ledgerly-positive)]',
  warning:
    'bg-[var(--ledgerly-warning-soft)] text-[color:var(--ledgerly-warning)]',
  danger:
    'bg-[var(--ledgerly-danger-soft)] text-[color:var(--ledgerly-danger)]',
  purple:
    'bg-[var(--ledgerly-purple-soft)] text-[color:var(--ledgerly-purple)]',
};

export function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}