import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { AnimationEditor } from '@/shared/blocks/projects/animation-editor';
import { noIndexRobots } from '@/shared/lib/seo';
import { getAnimationEditorData } from '@/shared/models/animation';
import { getUserInfo } from '@/shared/models/user';

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default async function AnimationEditorPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const user = await getUserInfo();
  if (!user) notFound();
  const data = await getAnimationEditorData(user.id, versionId);
  if (!data) notFound();
  return <AnimationEditor data={data} />;
}
