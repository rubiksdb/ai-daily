import type { Source } from '../config/schema.js';

export interface FetchedArticle {
  url: string;
  title: string;
  contentText?: string;
  publishedAt?: Date;
}

export interface Fetcher {
  fetch(source: Source): Promise<FetchedArticle[]>;
}
