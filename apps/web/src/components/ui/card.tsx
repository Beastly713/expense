import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'soft' | 'elevated' | 'interactive' | 'danger';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant | undefined;
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'border border-[color:var(--ledgerly-border)] bg-white',
  soft:
    'border border-[color:var(--ledgerly-border)] bg-[var(--ledgerly-surface-soft)]',
  elevated:
    'border border-[color:var(--ledgerly-border)] bg-white shadow-[var(--ledgerly-shadow-soft)]',
  interactive:
    'border border-[color:var(--ledgerly-border)] bg-white transition hover:-translate-y-0.5 hover:border-[color:var(--ledgerly-primary)] hover:shadow-[var(--ledgerly-shadow-soft)]',
  danger:
    'border border-[color:rgb(194_65_59_/_0.3)] bg-[var(--ledgerly-danger-soft)]',
};

export function Card({
  variant = 'default',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--ledgerly-radius-lg)]',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-1.5 p-5 pb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-lg font-bold tracking-[-0.01em] text-[color:var(--ledgerly-text)]',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-sm leading-6 text-[color:var(--ledgerly-muted)]',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 pt-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-t border-[color:var(--ledgerly-border)] p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}