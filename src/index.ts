import 'dotenv/config';
import { runMigrations } from './db/migrate.js';
import { loadConfig } from './config/index.js';
import { startScheduler } from './scheduler/index.js';
import { createApp } from './server/index.js';

async function main() {
  runMigrations();
  loadConfig(); // validates sites.yaml and env vars at startup

  const port = Number(process.env.PORT ?? 3000);
  const app = createApp();
  app.listen(port, () => {
    console.log(`ai-daily running on http://localhost:${port}`);
  });

  startScheduler();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
