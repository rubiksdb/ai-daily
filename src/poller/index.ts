import { loadConfig } from '../config/index.js';
import { upsertSource, insertArticleIfNew, updateSourcePolledAt } from '../db/queries.js';
import { rssFetcher } from './rssFetcher.js';
import { scrapeFetcher } from './scrapeFetcher.js';
import { twitterFetcher } from './twitterFetcher.js';
import { githubReleasesFetcher } from './githubReleasesFetcher.js';
import type { Source } from '../config/schema.js';
import type { Fetcher } from './types.js';

const FETCHERS: Record<Source['type'], Fetcher> = {
  rss: rssFetcher,
  scrape: scrapeFetcher,
  twitter: twitterFetcher,
  github_releases: githubReleasesFetcher,
};

export async function pollAll() {
  console.log('[pollAll] Loading config...');
  const config = loadConfig();
  console.log(`[pollAll] Polling ${config.sources.length} sources...`);

  let totalNew = 0;

  for (const source of config.sources) {
    console.log(`[pollAll] Upserting source: ${source.name} (${source.type})`);
    const sourceId = upsertSource(source);
    const fetcher = FETCHERS[source.type];

    try {
      console.log(`[pollAll] Fetching: ${source.name}`);
      const articles = await fetcher.fetch(source);
      console.log(`[pollAll] Fetched ${articles.length} articles from ${source.name}`);
      let newCount = 0;

      for (const article of articles) {
        const inserted = insertArticleIfNew({
          sourceId,
          url: article.url,
          title: article.title,
          contentText: article.contentText,
          publishedAt: article.publishedAt,
        });
        if (inserted) newCount++;
      }

      updateSourcePolledAt(sourceId);
      console.log(`  [${source.name}] ${newCount} new articles (${articles.length} fetched)`);
      totalNew += newCount;
    } catch (err) {
      console.error(`  [${source.name}] Error:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Poll complete. ${totalNew} new articles total.`);
  return totalNew;
}
