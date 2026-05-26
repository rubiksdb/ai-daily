import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sources = sqliteTable('sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  type: text('type').notNull(),
  category: text('category').notNull(),
  config: text('config').notNull(), // JSON blob of the full source config
  lastPolledAt: integer('last_polled_at', { mode: 'timestamp' }),
});

export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id')
    .notNull()
    .references(() => sources.id),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  contentText: text('content_text'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  isProcessed: integer('is_processed', { mode: 'boolean' }).notNull().default(false),
});

export const summaries = sqliteTable('summaries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  period: text('period', { enum: ['daily', 'weekly', 'monthly'] }).notNull(),
  periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
  periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
  sourceId: integer('source_id').references(() => sources.id), // null = cross-source digest
  contentMd: text('content_md').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const summariesZh = sqliteTable('summaries_zh', {
  summaryId: integer('summary_id').primaryKey().references(() => summaries.id),
  contentMd: text('content_md').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
