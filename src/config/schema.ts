import { z } from 'zod';

const ScrapeConfigSchema = z.object({
  item_selector: z.string(),
  title_selector: z.string(),
  link_selector: z.string(),
  date_selector: z.string().optional(),
  content_selector: z.string().optional(),
});

const BaseSourceSchema = z.object({
  name: z.string(),
  category: z.string(),
});

const RssSourceSchema = BaseSourceSchema.extend({
  type: z.literal('rss'),
  feed_url: z.string().url(),
});

const ScrapeSourceSchema = BaseSourceSchema.extend({
  type: z.literal('scrape'),
  url: z.string().url(),
  scrape: ScrapeConfigSchema,
});

const TwitterSourceSchema = BaseSourceSchema.extend({
  type: z.literal('twitter'),
  handle: z.string().optional(),
  query: z.string().optional(),
}).refine((s) => s.handle !== undefined || s.query !== undefined, {
  message: 'Twitter source requires either handle or query',
});

const GitHubReleasesSourceSchema = BaseSourceSchema.extend({
  type: z.literal('github_releases'),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
});

export const SourceSchema = z.discriminatedUnion('type', [
  RssSourceSchema,
  ScrapeSourceSchema,
  TwitterSourceSchema,
  GitHubReleasesSourceSchema,
]);

export const ConfigSchema = z.object({
  sources: z.array(SourceSchema),
});

export type Source = z.infer<typeof SourceSchema>;
export type RssSource = z.infer<typeof RssSourceSchema>;
export type ScrapeSource = z.infer<typeof ScrapeSourceSchema>;
export type TwitterSource = z.infer<typeof TwitterSourceSchema>;
export type GitHubReleasesSource = z.infer<typeof GitHubReleasesSourceSchema>;
export type AppConfig = z.infer<typeof ConfigSchema>;
