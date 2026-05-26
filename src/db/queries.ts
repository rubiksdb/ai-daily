import { eq, and, or, gte, lte, isNull, inArray } from 'drizzle-orm';
import { getDb } from './index.js';
import { sources, articles, summaries, summariesZh } from './schema.js';
import type { Source } from '../config/schema.js';

// ── Sources ──────────────────────────────────────────────────────────────────

export function upsertSource(source: Source) {
  const db = getDb();
  const existing = db.select().from(sources).where(eq(sources.name, source.name)).get();
  if (existing) {
    db.update(sources)
      .set({ config: JSON.stringify(source), type: source.type, category: source.category })
      .where(eq(sources.name, source.name))
      .run();
    return existing.id;
  }
  const result = db
    .insert(sources)
    .values({
      name: source.name,
      type: source.type,
      category: source.category,
      config: JSON.stringify(source),
    })
    .run();
  return Number(result.lastInsertRowid);
}

export function getSourceByName(name: string) {
  return getDb().select().from(sources).where(eq(sources.name, name)).get();
}

export function getAllSources() {
  return getDb().select().from(sources).all();
}

export function updateSourcePolledAt(id: number) {
  getDb().update(sources).set({ lastPolledAt: new Date() }).where(eq(sources.id, id)).run();
}

// ── Articles ─────────────────────────────────────────────────────────────────

export interface NewArticle {
  sourceId: number;
  url: string;
  title: string;
  contentText?: string;
  publishedAt?: Date;
}

export function insertArticleIfNew(article: NewArticle): boolean {
  const db = getDb();
  const existing = db.select().from(articles).where(eq(articles.url, article.url)).get();
  if (existing) return false;
  db.insert(articles)
    .values({ ...article, fetchedAt: new Date(), isProcessed: false })
    .run();
  return true;
}

export function getUnprocessedArticles(since: Date) {
  return getDb()
    .select()
    .from(articles)
    .where(and(eq(articles.isProcessed, false), gte(articles.fetchedAt, since)))
    .all();
}

export function getArticlesByPeriod(start: Date, end: Date) {
  return getDb()
    .select({ article: articles, source: sources })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(gte(articles.fetchedAt, start), lte(articles.fetchedAt, end)))
    .all();
}

export function getArticlesByPublishedPeriod(start: Date, end: Date) {
  return getDb()
    .select({ article: articles, source: sources })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      or(
        and(gte(articles.publishedAt, start), lte(articles.publishedAt, end)),
        and(isNull(articles.publishedAt), gte(articles.fetchedAt, start), lte(articles.fetchedAt, end)),
      ),
    )
    .all();
}

export function markArticlesProcessed(ids: number[]) {
  const db = getDb();
  for (const id of ids) {
    db.update(articles).set({ isProcessed: true }).where(eq(articles.id, id)).run();
  }
}

// ── Summaries ────────────────────────────────────────────────────────────────

export type Period = 'daily' | 'weekly' | 'monthly';

export function upsertSummary(params: {
  period: Period;
  periodStart: Date;
  periodEnd: Date;
  sourceId?: number;
  contentMd: string;
}): number {
  const db = getDb();
  const existing = db
    .select()
    .from(summaries)
    .where(
      and(
        eq(summaries.period, params.period),
        eq(summaries.periodStart, params.periodStart),
        params.sourceId !== undefined
          ? eq(summaries.sourceId, params.sourceId)
          : isNull(summaries.sourceId),
      ),
    )
    .get();

  if (existing) {
    db.update(summaries)
      .set({ contentMd: params.contentMd, createdAt: new Date() })
      .where(eq(summaries.id, existing.id))
      .run();
    return existing.id;
  } else {
    const result = db.insert(summaries).values({ ...params, createdAt: new Date() }).run();
    return Number(result.lastInsertRowid);
  }
}

export function upsertSummaryZh(summaryId: number, contentMd: string) {
  const db = getDb();
  const existing = db.select().from(summariesZh).where(eq(summariesZh.summaryId, summaryId)).get();
  if (existing) {
    db.update(summariesZh)
      .set({ contentMd, createdAt: new Date() })
      .where(eq(summariesZh.summaryId, summaryId))
      .run();
  } else {
    db.insert(summariesZh).values({ summaryId, contentMd, createdAt: new Date() }).run();
  }
}

export function getSummariesZh(summaryIds: number[]): Map<number, string> {
  if (summaryIds.length === 0) return new Map();
  const rows = getDb()
    .select()
    .from(summariesZh)
    .where(inArray(summariesZh.summaryId, summaryIds))
    .all();
  return new Map(rows.map((r) => [r.summaryId, r.contentMd]));
}

export function getSummaries(period: Period, date: Date) {
  const db = getDb();
  const { start } = getPeriodBounds(period, date);
  return db
    .select({ summary: summaries, source: sources })
    .from(summaries)
    .leftJoin(sources, eq(summaries.sourceId, sources.id))
    .where(and(eq(summaries.period, period), eq(summaries.periodStart, start)))
    .all();
}

export function getPeriodBounds(period: Period, date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);

  if (period === 'daily') {
    const end = new Date(d);
    end.setUTCHours(23, 59, 59, 999);
    return { start: d, end };
  }

  if (period === 'weekly') {
    const day = d.getUTCDay();
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  // monthly
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}
