import axios from 'axios';
import type { FetchedArticle, Fetcher } from './types.js';
import type { Source } from '../config/schema.js';

export const githubReleasesFetcher: Fetcher = {
  async fetch(source: Source): Promise<FetchedArticle[]> {
    if (source.type !== 'github_releases') return [];

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const { data } = await axios.get(
      `https://api.github.com/repos/${source.repo}/releases?per_page=10`,
      { headers, timeout: 15000 },
    );

    return (
      data as Array<{
        html_url: string;
        name: string;
        tag_name: string;
        body: string;
        published_at: string;
      }>
    ).map((release) => ({
      url: release.html_url,
      title: `${source.repo} ${release.name || release.tag_name}`,
      contentText: release.body ?? undefined,
      publishedAt: release.published_at ? new Date(release.published_at) : undefined,
    }));
  },
};
