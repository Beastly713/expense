import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'link';

type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--ledgerly-primary)] text-white shadow-sm hover:bg-[var(--ledgerly-primary-dark)] active:translate-y-px',
  secondary:
    'bg-[var(--ledgerly-primary-soft)] text-[color:var(--ledgerly-primary-dark)] hover:bg-[#d6f0e7]',
  outline:
    'border border-[color:var(--ledgerly-border)] bg-white text-[color:var(--ledgerly-text)] hover:border-[color:var(--ledgerly-primary)] hover:bg-[var(--ledgerly-primary-soft)]',
  ghost:
    'bg-transparent text-[color:var(--ledgerly-muted)] hover:bg-[var(--ledgerly-surface-soft)] hover:text-[color:var(--ledgerly-text)]',
  danger:
    'bg-[var(--ledgerly-danger)] text-white shadow-sm hover:bg-[#a93430] active:translate-y-px',
  link:
    'bg-transparent p-0 text-[color:var(--ledgerly-primary)] hover:text-[color:var(--ledgerly-primary-dark)] hover:underline',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-10 w-10 p-0',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'ledgerly-focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold transition',
        'disabled:translate-y-0 disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}