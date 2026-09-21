'use client';

import { Boxes, Settings, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/core/i18n/navigation';
import { cn } from '@/shared/lib/utils';

const entries = [
  { key: 'characters', icon: UserRound },
  { key: 'icons', icon: Boxes },
  { key: 'settings', icon: Settings },
] as const;

export function ProjectNav({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const t = useTranslations('workspace.nav');
  const pathname = usePathname();
  useEffect(() => {
    void fetch('/api/projects/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
  }, [projectId]);
  return (
    <div className="bg-card/35 -mx-4 -mt-8 mb-7 border-b px-4 md:-mx-6 md:px-6">
      <nav
        className="-mx-1 flex scrollbar-none gap-1 overflow-x-auto py-3 px-1"
        aria-label={projectName}
      >
        {entries.map(({ key, icon: Icon }) => {
          const href = `/dashboard/projects/${projectId}/${key}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'text-muted-foreground hover:bg-primary/10 hover:text-primary flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm transition-colors',
                active && 'bg-primary/10 text-primary'
              )}
            >
              <Icon className="size-4" />
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
