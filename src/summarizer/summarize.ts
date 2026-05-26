import { getArticlesByPublishedPeriod, upsertSummary, upsertSummaryZh, getPeriodBounds } from '../db/queries.js';
import { chat } from './deepseekClient.js';
import { SYSTEM_PROMPT, SYSTEM_PROMPT_ZH, buildSourcePrompt, buildSourcePromptZh, buildDigestPrompt, buildDigestPromptZh } from './prompts.js';
import type { Period } from '../db/queries.js';

export async function summarizePeriod(period: Period, date: Date = new Date()) {
  const { start, end } = getPeriodBounds(period, date);
  const rows = getArticlesByPublishedPeriod(start, end);

  if (rows.length === 0) {
    console.log(`No articles found for ${period} period starting ${start.toISOString()}`);
    return;
  }

  // Group articles by source
  const bySource = new Map<
    number,
    { sourceName: string; sourceId: number; articles: typeof rows }
  >();
  for (const row of rows) {
    const key = row.source.id;
    if (!bySource.has(key)) {
      bySource.set(key, { sourceName: row.source.name, sourceId: row.source.id, articles: [] });
    }
    bySource.get(key)!.articles.push(row);
  }

  const perSourceSummaries: Array<{ sourceName: string; summary: string }> = [];

  // Per-source summaries
  for (const [sourceId, { sourceName, articles }] of bySource) {
    console.log(`  Summarizing ${sourceName} (${articles.length} articles)...`);
    try {
      const articleData = articles.map((r) => r.article);
      const [enSummary, zhSummary] = await Promise.all([
        chat(SYSTEM_PROMPT, buildSourcePrompt(sourceName, period, start, articleData)),
        chat(SYSTEM_PROMPT_ZH, buildSourcePromptZh(sourceName, period, start, articleData)),
      ]);
      const summaryId = upsertSummary({ period, periodStart: start, periodEnd: end, sourceId, contentMd: enSummary });
      upsertSummaryZh(summaryId, zhSummary);
      perSourceSummaries.push({ sourceName, summary: enSummary });
    } catch (err) {
      console.error(
        `  Failed to summarize ${sourceName}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Cross-source digest
  if (perSourceSummaries.length > 1) {
    console.log(`  Building cross-source digest...`);
    try {
      const [enDigest, zhDigest] = await Promise.all([
        chat(SYSTEM_PROMPT, buildDigestPrompt(period, start, perSourceSummaries)),
        chat(SYSTEM_PROMPT_ZH, buildDigestPromptZh(period, start, perSourceSummaries)),
      ]);
      const summaryId = upsertSummary({ period, periodStart: start, periodEnd: end, contentMd: enDigest });
      upsertSummaryZh(summaryId, zhDigest);
    } catch (err) {
      console.error(`  Failed to build digest:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(
    `${period} summarization complete (${rows.length} articles, ${bySource.size} sources)`,
  );
}
