export type Period = 'daily' | 'weekly' | 'monthly';

export interface Summary {
  id: number;
  sourceId: number | null;
  sourceName: string | null;
  sourceCategory: string | null;
  contentMd: string;
  contentMdZh: string | null;
  createdAt: string;
}

export interface SummariesResponse {
  period: Period;
  periodStart: string;
  periodEnd: string;
  summaries: Summary[];
}

export interface Article {
  id: number;
  url: string;
  title: string;
  sourceName: string;
  sourceCategory: string;
  publishedAt: string | null;
  fetchedAt: string;
}

export interface ArticlesResponse {
  period: Period;
  periodStart: string;
  periodEnd: string;
  articles: Article[];
}
