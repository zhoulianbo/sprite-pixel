import { ReactNode } from 'react';

import { Header, Main } from '@/shared/blocks/dashboard';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <Main>{children}</Main>
    </>
  );
}
