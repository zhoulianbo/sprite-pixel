import type { Metadata } from 'next';

import { noIndexRobots } from '@/shared/lib/seo';

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function OAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      {children}
    </div>
  );
}
