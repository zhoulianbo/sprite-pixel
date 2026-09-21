'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Header, Main } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';

import { ProjectNav } from './project-nav';

const sectionKeys = [
  'characters',
  'icons',
  'scenes',
  'ui',
  'effects',
  'settings',
] as const;

const ProjectConsoleContext = createContext<{
  projectName: string;
  setDetailTitle: (title?: string) => void;
}>({
  projectName: '',
  setDetailTitle: () => {},
});

export function DashboardDetailCrumb({ title }: { title: string }) {
  const { setDetailTitle } = useContext(ProjectConsoleContext);
  useEffect(() => {
    setDetailTitle(title);
    return () => setDetailTitle(undefined);
  }, [setDetailTitle, title]);
  return null;
}

export function useProjectConsole() {
  return useContext(ProjectConsoleContext);
}

export function ProjectConsoleShell({
  projectId,
  projectName,
  children,
}: {
  projectId: string;
  projectName: string;
  children: ReactNode;
}) {
  const t = useTranslations('workspace');
  const segments = useSelectedLayoutSegments();
  const [detailTitle, setDetailTitle] = useState<string>();
  const setTitle = useCallback((title?: string) => {
    setDetailTitle(title);
  }, []);
  const contextValue = useMemo(
    () => ({ projectName, setDetailTitle: setTitle }),
    [projectName, setTitle]
  );
  const section = sectionKeys.find((key) => key === segments?.[0]);
  const hasDetail = Boolean(segments?.[1]);
  const hideProjectNav = section === 'characters' && hasDetail;

  const crumbs = useMemo(() => {
    const items: Crumb[] = [
      { title: t('projects.title'), url: '/dashboard' },
      {
        title: projectName,
        url: `/dashboard/projects/${projectId}/characters`,
      },
    ];
    if (section) {
      items.push({
        title: t(`nav.${section}`),
        url: `/dashboard/projects/${projectId}/${section}`,
        is_active: !hasDetail || !detailTitle,
      });
    }
    if (hasDetail && detailTitle) {
      items.push({ title: detailTitle, is_active: true });
    }
    return items;
  }, [detailTitle, hasDetail, projectId, projectName, section, t]);

  return (
    <ProjectConsoleContext.Provider value={contextValue}>
      <Header crumbs={crumbs} />
      <Main>
        {!hideProjectNav && (
          <ProjectNav projectId={projectId} projectName={projectName} />
        )}
        {children}
      </Main>
    </ProjectConsoleContext.Provider>
  );
}
