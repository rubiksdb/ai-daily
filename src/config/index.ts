import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ConfigSchema, type AppConfig, type Source } from './schema.js';

let cached: AppConfig | null = null;

export function loadConfig(configPath?: string): AppConfig {
  if (cached) return cached;

  const filePath = configPath ?? path.resolve(process.cwd(), 'sites.yaml');
  const raw = yaml.load(fs.readFileSync(filePath, 'utf-8'));
  const result = ConfigSchema.safeParse(raw);

  if (!result.success) {
    console.error('Invalid sites.yaml:');
    for (const issue of result.error.issues) {
      console.error(` - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  validateRequiredEnvVars(result.data.sources);
  cached = result.data;
  return cached;
}

function validateRequiredEnvVars(sources: Source[]) {
  const types = new Set(sources.map((s) => s.type));
  const missing: string[] = [];

  if (!process.env.DEEPSEEK_API_KEY) missing.push('DEEPSEEK_API_KEY');
  if (types.has('twitter') && !process.env.TWITTER_BEARER_TOKEN)
    missing.push('TWITTER_BEARER_TOKEN');

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
