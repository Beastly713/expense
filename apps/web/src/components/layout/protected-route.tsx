'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';

export function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, isAuthenticated } = useAuth();

  useEffect(() => {
    if (status === 'booting') {
      return;
    }

    if (!isAuthenticated) {
      const redirectTo = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${redirectTo}`);
    }
  }, [status, isAuthenticated, pathname, router]);

  if (status === 'booting') {
    return <div className="p-6 text-sm text-neutral-600">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}