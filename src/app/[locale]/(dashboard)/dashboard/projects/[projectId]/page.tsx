import { redirect } from '@/core/i18n/navigation';

export default async function ProjectIndex({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  redirect({ href: `/dashboard/projects/${projectId}/characters`, locale });
}
