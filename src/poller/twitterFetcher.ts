import { TwitterApi } from 'twitter-api-v2';
import type { FetchedArticle, Fetcher } from './types.js';
import type { Source } from '../config/schema.js';

let client: TwitterApi | null = null;

function getClient() {
  if (!client) {
    client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!);
  }
  return client.readOnly;
}

export const twitterFetcher: Fetcher = {
  async fetch(source: Source): Promise<FetchedArticle[]> {
    if (source.type !== 'twitter') return [];
    const api = getClient();
    const tweetFields: ('created_at' | 'text' | 'author_id')[] = [
      'created_at',
      'text',
      'author_id',
    ];

    try {
      if (source.handle) {
        const user = await api.v2.userByUsername(source.handle);
        if (!user.data) return [];
        const timeline = await api.v2.userTimeline(user.data.id, {
          max_results: 20,
          'tweet.fields': tweetFields,
          exclude: ['retweets', 'replies'],
        });
        return (timeline.data.data ?? []).map((t) => tweetToArticle(t, source.handle!));
      }

      if (source.query) {
        const results = await api.v2.search(source.query, {
          max_results: 20,
          'tweet.fields': tweetFields,
        });
        return (results.data.data ?? []).map((t) => tweetToArticle(t));
      }
    } catch (err) {
      console.error(`Twitter fetch failed for ${source.name}:`, err);
    }

    return [];
  },
};

function tweetToArticle(
  tweet: { id: string; text: string; created_at?: string },
  handle?: string,
): FetchedArticle {
  return {
    url: `https://twitter.com/${handle ?? 'i'}/status/${tweet.id}`,
    title: tweet.text.slice(0, 120),
    contentText: tweet.text,
    publishedAt: tweet.created_at ? new Date(tweet.created_at) : undefined,
  };
}
