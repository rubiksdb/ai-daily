import type { Period, SummariesResponse, ArticlesResponse } from './types.js';

export async function fetchSummaries(period: Period, date: string): Promise<SummariesResponse> {
  const res = await fetch(`/api/summaries?period=${period}&date=${date}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function triggerPoll(): Promise<{ newArticles: number }> {
  const res = await fetch('/api/poll', { method: 'POST' });
  if (!res.ok) throw new Error(`Poll failed ${res.status}`);
  return res.json();
}

export async function triggerSummarize(period: Period, date: string): Promise<void> {
  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, date }),
  });
  if (!res.ok) throw new Error(`Summarize failed ${res.status}`);
}

export async function publishToWechat(period: Period, date: string): Promise<void> {
  const res = await fetch('/api/publish/wechat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, date }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Publish failed ${res.status}`);
  }
}

export async function fetchArticles(period: Period, date: string): Promise<ArticlesResponse> {
  const res = await fetch(`/api/articles?period=${period}&date=${date}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
