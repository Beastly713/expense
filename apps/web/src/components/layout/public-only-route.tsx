'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/lib/auth';

export function PublicOnlyRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, isAuthenticated } = useAuth();

  useEffect(() => {
    if (status === 'booting') {
      return;
    }

    if (isAuthenticated) {
      const redirect = searchParams.get('redirect');
      router.replace(redirect || '/dashboard');
    }
  }, [status, isAuthenticated, router, searchParams]);

  if (status === 'booting') {
    return <div className="p-6 text-sm text-neutral-600">Checking session...</div>;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}