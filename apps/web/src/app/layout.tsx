import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

import { SiteHeader } from '@/components/layout/site-header';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = {
  title: {
    default: publicEnv.appName,
    template: `%s | ${publicEnv.appName}`,
  },
  description: 'Splitwise-style expense sharing MVP.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}