import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        <h2 className="text-xl font-bold tracking-[-0.02em] text-[color:var(--ledgerly-text)]">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm leading-6 text-[color:var(--ledgerly-muted)]">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}