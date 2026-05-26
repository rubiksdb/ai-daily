import type { Period } from '../db/queries.js';

export const SYSTEM_PROMPT = `You are an expert AI industry analyst. Your job is to synthesize news and posts into clear, insightful summaries. Write in a direct, informative tone. Use markdown with headers and bullet points. Focus on significance and implications, not just repeating facts.`;

export const SYSTEM_PROMPT_ZH = `你是一位专业的AI行业分析师。你的工作是将新闻和文章综合成清晰、有深度的摘要。用简洁、信息丰富的语气写作。使用Markdown格式，包含标题和要点。重点关注重要性和影响，而不仅仅是重复事实。`;

export function buildSourcePrompt(
  sourceName: string,
  period: Period,
  periodStart: Date,
  articles: Array<{
    title: string;
    url: string;
    contentText?: string | null;
    publishedAt?: Date | null;
  }>,
): string {
  const dateLabel = periodStart.toISOString().slice(0, 10);
  const periodLabel = { daily: `daily (${dateLabel})`, weekly: `weekly (week of ${dateLabel})`, monthly: `monthly (${dateLabel.slice(0, 7)})` }[period];
  const items = articles
    .map((a, i) => {
      const date = a.publishedAt ? a.publishedAt.toISOString().slice(0, 10) : '';
      const content = a.contentText ? `\n   ${a.contentText.slice(0, 500)}` : '';
      return `${i + 1}. [${date}] ${a.title}\n   ${a.url}${content}`;
    })
    .join('\n\n');

  return `Summarize the following ${articles.length} posts/articles from **${sourceName}** (${periodLabel}):\n\n${items}\n\nWrite a concise summary (3-5 bullet points) highlighting the most important developments. For each point, link the relevant article title(s) inline using markdown, e.g. [Article Title](url).`;
}

export function buildSourcePromptZh(
  sourceName: string,
  period: Period,
  periodStart: Date,
  articles: Array<{
    title: string;
    url: string;
    contentText?: string | null;
    publishedAt?: Date | null;
  }>,
): string {
  const dateLabel = periodStart.toISOString().slice(0, 10);
  const periodLabel = { daily: `${dateLabel}`, weekly: `${dateLabel} 所在周`, monthly: `${dateLabel.slice(0, 7)}` }[period];
  const items = articles
    .map((a, i) => {
      const date = a.publishedAt ? a.publishedAt.toISOString().slice(0, 10) : '';
      const content = a.contentText ? `\n   ${a.contentText.slice(0, 500)}` : '';
      return `${i + 1}. [${date}] ${a.title}\n   ${a.url}${content}`;
    })
    .join('\n\n');

  return `请用中文总结以下来自 **${sourceName}** 的 ${articles.length} 篇文章（${periodLabel}）：\n\n${items}\n\n请写一个简洁的摘要（3-5个要点），重点介绍最重要的进展。每个要点请用Markdown格式内联链接相关文章，例如：[文章标题](url)。`;
}

export function buildDigestPrompt(
  period: Period,
  periodStart: Date,
  summaries: Array<{ sourceName: string; summary: string }>,
): string {
  const dateLabel = periodStart.toISOString().slice(0, 10);
  const periodLabel = { daily: `Daily (${dateLabel})`, weekly: `Weekly (week of ${dateLabel})`, monthly: `Monthly (${dateLabel.slice(0, 7)})` }[period];
  const parts = summaries.map((s) => `### ${s.sourceName}\n${s.summary}`).join('\n\n');

  return `Below are individual summaries from various AI sources for the ${periodLabel} digest.\n\n${parts}\n\nWrite a cross-source **${periodLabel} AI Digest** with:\n1. One-sentence "takeaway" for the period\n2. Top 3-5 major themes or stories across all sources\n3. Notable releases, announcements, or controversies`;
}

export function buildDigestPromptZh(
  period: Period,
  periodStart: Date,
  summaries: Array<{ sourceName: string; summary: string }>,
): string {
  const dateLabel = periodStart.toISOString().slice(0, 10);
  const periodLabel = { daily: `${dateLabel}每日`, weekly: `${dateLabel} 所在周每周`, monthly: `${dateLabel.slice(0, 7)}每月` }[period];
  const parts = summaries.map((s) => `### ${s.sourceName}\n${s.summary}`).join('\n\n');

  return `以下是来自各AI信息源的${periodLabel}摘要。\n\n${parts}\n\n请用中文撰写一份跨来源的**${periodLabel}AI摘要**，包含：\n1. 本期一句话总结\n2. 所有来源中最重要的3-5个主题或故事\n3. 值得关注的发布、公告或争议`;
}
