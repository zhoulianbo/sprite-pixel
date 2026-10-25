import { revalidatePath } from 'next/cache';
import { and, asc, count, eq } from 'drizzle-orm';

import { db, isDatabaseConfigured } from '@/core/db';
import { footerLink } from '@/config/db/schema';
import {
  purgeFooterLinkCdnCache,
  readPublishedFooterLinksFromKv,
  writePublishedFooterLinksToKv,
} from '@/shared/lib/footer_link_cache';
import type { FooterLinkHtmlRow } from '@/shared/lib/footer_link_html';

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

async function loadPublishedFooterLinks(): Promise<FooterLinkHtmlRow[]> {
  if (!isDatabaseConfigured()) return [];

  const rows: FooterLink[] = await db()
    .select()
    .from(footerLink)
    .where(eq(footerLink.status, FooterLinkStatus.PUBLISHED))
    .orderBy(
      asc(footerLink.group),
      asc(footerLink.sort),
      asc(footerLink.title)
    );

  return rows.map((row) => ({
    id: row.id,
    group: row.group,
    title: row.title,
    url: row.url,
    image_url: row.imageUrl,
    alt_text: row.altText,
    locale: 'en',
    rel: row.rel,
    status: row.status,
    sort: row.sort,
  }));
}

export async function getPublishedFooterLinks() {
  const cached = await readPublishedFooterLinksFromKv();
  if (cached !== null) return cached;

  const rows = await loadPublishedFooterLinks();
  await writePublishedFooterLinksToKv(rows).catch((error) => {
    console.warn('populate footer link KV failed:', error);
  });
  return rows;
}

async function refreshFooterLinkCaches() {
  let cacheSynced = true;
  try {
    // Publish the fresh snapshot before invalidating HTML that reads it.
    await writePublishedFooterLinksToKv(await loadPublishedFooterLinks());
  } catch (error) {
    console.warn('refresh footer link KV failed:', error);
    cacheSynced = false;
  }

  try {
    // OpenNext invalidates the R2 incremental cache and its regional cache
    // through the configured tag cache; pages regenerate on their next visit.
    revalidatePath('/', 'layout');
  } catch (error) {
    console.warn('revalidate footer link pages failed:', error);
    cacheSynced = false;
  }
  const cdnPurged = await purgeFooterLinkCdnCache();
  return cacheSynced && cdnPurged;
}

export async function addFooterLink(data: NewFooterLink) {
  const [result] = await db().insert(footerLink).values(data).returning();
  if (!result) return result;
  return { ...result, cacheSynced: await refreshFooterLinkCaches() };
}

export async function updateFooterLink(id: string, data: UpdateFooterLink) {
  const [result] = await db()
    .update(footerLink)
    .set(data)
    .where(eq(footerLink.id, id))
    .returning();

  if (!result) return result;
  return { ...result, cacheSynced: await refreshFooterLinkCaches() };
}

export async function deleteFooterLink(id: string) {
  const [result] = await db()
    .delete(footerLink)
    .where(eq(footerLink.id, id))
    .returning();

  // Also refresh on retries, including when the row has already been deleted.
  return {
    deleted: Boolean(result),
    cacheSynced: await refreshFooterLinkCaches(),
  };
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
