'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/lib/auth';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
  authenticatedRedirectTo?: string;
}

export function PublicOnlyRoute({
  children,
  authenticatedRedirectTo,
}: PublicOnlyRouteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, isAuthenticated } = useAuth();

  useEffect(() => {
    if (status === 'booting') {
      return;
    }

    if (isAuthenticated) {
      const redirect = searchParams.get('redirect');
      router.replace(authenticatedRedirectTo || redirect || '/dashboard');
    }
  }, [status, isAuthenticated, router, searchParams, authenticatedRedirectTo]);

  if (status === 'booting') {
    return null;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}