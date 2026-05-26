import Parser from 'rss-parser';
import type { FetchedArticle, Fetcher } from './types.js';
import type { Source } from '../config/schema.js';

const parser = new Parser({ timeout: 15000 });

export const rssFetcher: Fetcher = {
  async fetch(source: Source): Promise<FetchedArticle[]> {
    if (source.type !== 'rss') return [];
    const feed = await parser.parseURL(source.feed_url);
    return (feed.items ?? [])
      .map((item) => ({
        url: item.link ?? item.guid ?? '',
        title: item.title ?? '(no title)',
        contentText: item.contentSnippet ?? item.content ?? undefined,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      }))
      .filter((a) => a.url);
  },
};
