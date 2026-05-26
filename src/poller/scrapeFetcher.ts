import axios from 'axios';
import * as cheerio from 'cheerio';
import type { FetchedArticle, Fetcher } from './types.js';
import type { Source } from '../config/schema.js';

export const scrapeFetcher: Fetcher = {
  async fetch(source: Source): Promise<FetchedArticle[]> {
    if (source.type !== 'scrape') return [];
    const { scrape, url } = source;

    const { data: html } = await axios.get(url, {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ai-daily/1.0)' },
    });

    const $ = cheerio.load(html);
    const articles: FetchedArticle[] = [];

    $(scrape.item_selector).each((_, el) => {
      const titleEl = $(el).find(scrape.title_selector);
      const linkEl = $(el).find(scrape.link_selector);
      const dateEl = scrape.date_selector ? $(el).find(scrape.date_selector) : null;
      const contentEl = scrape.content_selector ? $(el).find(scrape.content_selector) : null;

      const title = titleEl.text().trim();
      const href = linkEl.attr('href') ?? '';
      const articleUrl = href.startsWith('http') ? href : new URL(href, url).href;
      const dateStr = dateEl?.attr('datetime') ?? dateEl?.text().trim();

      if (!title || !articleUrl) return;

      articles.push({
        url: articleUrl,
        title,
        contentText: contentEl?.text().trim() || undefined,
        publishedAt: dateStr ? new Date(dateStr) : undefined,
      });
    });

    return articles;
  },
};
