import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string | undefined;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--ledgerly-radius-lg)] border border-dashed border-[color:var(--ledgerly-border)] bg-white px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ledgerly-primary-soft)] text-[color:var(--ledgerly-primary)]">
          {icon}
        </div>
      ) : null}

      <h3 className="text-lg font-bold text-[color:var(--ledgerly-text)]">
        {title}
      </h3>

      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--ledgerly-muted)]">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}