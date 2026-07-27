import { and, asc, count, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { footerLink } from '@/config/db/schema';
import { purgeFooterLinkCdnCache } from '@/shared/lib/footer_link_cache';

export type FooterLink = typeof footerLink.$inferSelect;
export type NewFooterLink = typeof footerLink.$inferInsert;
export type UpdateFooterLink = Partial<Omit<NewFooterLink, 'id' | 'createdAt'>>;

export enum FooterLinkGroup {
  FRIEND = 'friend',
  BADGE = 'badge',
}

export enum FooterLinkStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export async function addFooterLink(data: NewFooterLink) {
  const [result] = await db().insert(footerLink).values(data).returning();
  await purgeFooterLinkCdnCache();
  return result;
}

export async function updateFooterLink(id: string, data: UpdateFooterLink) {
  const [result] = await db()
    .update(footerLink)
    .set(data)
    .where(eq(footerLink.id, id))
    .returning();

  await purgeFooterLinkCdnCache();
  return result;
}

export async function findFooterLink(id: string) {
  const [result] = await db()
    .select()
    .from(footerLink)
    .where(eq(footerLink.id, id))
    .limit(1);

  return result;
}

export async function getFooterLinks({
  status,
  page = 1,
  limit = 30,
}: {
  status?: FooterLinkStatus;
  page?: number;
  limit?: number;
} = {}): Promise<FooterLink[]> {
  return db()
    .select()
    .from(footerLink)
    .where(and(status ? eq(footerLink.status, status) : undefined))
    .orderBy(asc(footerLink.group), asc(footerLink.sort), asc(footerLink.title))
    .limit(limit)
    .offset((page - 1) * limit);
}

export async function getFooterLinksCount({
  status,
}: {
  status?: FooterLinkStatus;
} = {}) {
  const [result] = await db()
    .select({ count: count() })
    .from(footerLink)
    .where(and(status ? eq(footerLink.status, status) : undefined))
    .limit(1);

  return result?.count || 0;
}
