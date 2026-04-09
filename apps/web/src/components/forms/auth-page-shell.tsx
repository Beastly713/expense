import type { ReactNode } from 'react';

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
            <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
          </div>

          {children}

          {footer ? <div className="mt-6 border-t border-neutral-100 pt-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}