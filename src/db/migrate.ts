import Database from 'better-sqlite3';

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    config TEXT NOT NULL,
    last_polled_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content_text TEXT,
    published_at INTEGER,
    fetched_at INTEGER NOT NULL,
    is_processed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL CHECK(period IN ('daily','weekly','monthly')),
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    source_id INTEGER REFERENCES sources(id),
    content_md TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_is_processed ON articles(is_processed)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at)`,
  `CREATE INDEX IF NOT EXISTS idx_summaries_period ON summaries(period, period_start)`,
  `CREATE TABLE IF NOT EXISTS summaries_zh (
    summary_id INTEGER PRIMARY KEY REFERENCES summaries(id),
    content_md TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

export function runMigrations() {
  const dbPath = process.env.SQLITE_PATH ?? './data/ai-daily.db';
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');

  for (const sql of MIGRATIONS) {
    sqlite.exec(sql);
  }

  sqlite.close();
  console.log('Database migrations complete');
}
