import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSummaries, getSummariesZh, getAllSources, getPeriodBounds, getArticlesByPublishedPeriod } from '../db/queries.js';
import { pollAll } from '../poller/index.js';
import { summarizePeriod } from '../summarizer/summarize.js';
import { publishArticle } from '../publisher/wechatClient.js';
import type { Period } from '../db/queries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json());

  // ── API ──────────────────────────────────────────────────────────────

  app.get('/api/summaries', (req, res) => {
    const period = (req.query.period as Period) ?? 'daily';
    const dateStr = req.query.date as string | undefined;
    const date = dateStr ? new Date(dateStr) : new Date();

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      res.status(400).json({ error: 'Invalid period' });
      return;
    }

    const rows = getSummaries(period, date);
    const { start, end } = getPeriodBounds(period, date);
    const zhMap = getSummariesZh(rows.map((r) => r.summary.id));

    res.json({
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      summaries: rows.map((r) => ({
        id: r.summary.id,
        sourceId: r.summary.sourceId,
        sourceName: r.source?.name ?? null,
        sourceCategory: r.source?.category ?? null,
        contentMd: r.summary.contentMd,
        contentMdZh: zhMap.get(r.summary.id) ?? null,
        createdAt: r.summary.createdAt,
      })),
    });
  });

  app.get('/api/sources', (_req, res) => {
    const rows = getAllSources();
    res.json(
      rows.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        category: s.category,
        lastPolledAt: s.lastPolledAt,
      })),
    );
  });

  app.post('/api/poll', async (_req, res) => {
    try {
      const count = await pollAll();
      res.json({ ok: true, newArticles: count });
    } catch (err) {
      console.error('[/api/poll] Unhandled error:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/summarize', async (req, res) => {
    const period = (req.body?.period as Period) ?? 'daily';
    const dateStr = req.body?.date as string | undefined;
    const date = dateStr ? new Date(dateStr) : new Date();

    try {
      await summarizePeriod(period, date);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/publish/wechat', async (req, res) => {
    const period = (req.body?.period as Period) ?? 'daily';
    const dateStr = req.body?.date as string | undefined;
    const date = dateStr ? new Date(dateStr) : new Date();

    const rows = getSummaries(period, date);
    const { start } = getPeriodBounds(period, date);
    const digest = rows.find((r) => r.summary.sourceId === null);

    if (!digest) {
      res.status(404).json({ error: 'No digest found for this period. Run Summarize first.' });
      return;
    }

    const zhMap = getSummariesZh(rows.map((r) => r.summary.id));
    const zhContent = zhMap.get(digest.summary.id);

    if (!zhContent) {
      res.status(404).json({ error: 'No Chinese summary found. Run Summarize first.' });
      return;
    }

    const dateLabel = start.toISOString().slice(0, 10);
    try {
      await publishArticle(`AI日报 ${dateLabel}`, zhContent);
      res.json({ ok: true });
    } catch (err) {
      console.error('[/api/publish/wechat]', err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/articles', (req, res) => {
    const period = (req.query.period as Period) ?? 'daily';
    const dateStr = req.query.date as string | undefined;
    const date = dateStr ? new Date(dateStr) : new Date();

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      res.status(400).json({ error: 'Invalid period' });
      return;
    }

    const { start, end } = getPeriodBounds(period, date);
    const rows = getArticlesByPublishedPeriod(start, end);

    rows.sort((a, b) => {
      const nameCmp = a.source.name.localeCompare(b.source.name);
      if (nameCmp !== 0) return nameCmp;
      const aDate = a.article.publishedAt?.getTime() ?? 0;
      const bDate = b.article.publishedAt?.getTime() ?? 0;
      return bDate - aDate;
    });

    res.json({
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      articles: rows.map((r) => ({
        id: r.article.id,
        url: r.article.url,
        title: r.article.title,
        sourceName: r.source.name,
        sourceCategory: r.source.category,
        publishedAt: r.article.publishedAt?.toISOString() ?? null,
        fetchedAt: r.article.fetchedAt.toISOString(),
      })),
    });
  });

  // ── Static frontend ──────────────────────────────────────────────────
  const webDist = path.resolve(__dirname, '../../dist/web');
  app.use(express.static(webDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });

  return app;
}
