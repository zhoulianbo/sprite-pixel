import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { noIndexRobots } from '@/shared/lib/seo';

import { ChatLayout } from './chat-layout';

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function ChatRouteLayout({ children }: { children: ReactNode }) {
  return <ChatLayout>{children}</ChatLayout>;
}
