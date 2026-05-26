# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start backend with hot reload (tsx watch)
npm run dev:web      # Start Vite dev server for frontend (proxies /api → :3000)

# Build
npm run build        # Compile TS + build Vite frontend → dist/

# Production
npm start            # Run compiled dist/index.js

# Docker
docker compose up --build   # Full production build and run

# Type checking / linting
npx tsc --noEmit            # Backend type check
npx tsc --project src/web/tsconfig.json  # Frontend type check
npm run lint
npm run format
```

## Architecture

This is a TypeScript Node.js service that polls AI news sources, summarizes them via DeepSeek API, and serves a React dashboard.

**Backend** (`src/`):
- `index.ts` — entrypoint: runs DB migrations, starts Express server + cron scheduler
- `config/` — loads and Zod-validates `sites.yaml`; exits with error on bad config or missing API keys
- `db/` — SQLite via `better-sqlite3` + Drizzle ORM. Schema: `sources`, `articles`, `summaries`. `migrate.ts` runs raw SQL on startup (no Drizzle migrations needed). `queries.ts` has all typed query helpers
- `poller/` — fetcher adapter pattern: `Fetcher` interface in `types.ts`, one adapter per source type (`rssFetcher`, `scrapeFetcher`, `twitterFetcher`, `githubReleasesFetcher`). `index.ts` dispatches by `source.type`
- `summarizer/` — `deepseekClient.ts` wraps OpenAI SDK pointed at `https://api.deepseek.com`. `summarize.ts` groups articles by source, calls DeepSeek per source, then builds a cross-source digest
- `scheduler/` — four `node-cron` jobs: poll at 06:00, daily summary at 07:00, weekly on Monday 07:00, monthly on 1st 07:00
- `server/` — Express app with REST API (`/api/summaries`, `/api/sources`, `/api/poll`, `/api/summarize`) and static serving of the Vite build

**Frontend** (`src/web/`):
- Vite + React SPA. Has its own `tsconfig.json` and `vite.config.ts`
- Single `App.tsx` with sidebar (period selector + date picker + manual trigger buttons) and main content area (digest card + per-source collapsible cards)
- Vite dev server proxies `/api` to `:3000`

## Adding a new source type

1. Add a new Zod schema variant to `src/config/schema.ts` and add the type to `SourceSchema`
2. Create `src/poller/myTypeFetcher.ts` implementing the `Fetcher` interface
3. Register it in the `FETCHERS` map in `src/poller/index.ts`

## Environment variables

```
DEEPSEEK_API_KEY=      # required
TWITTER_BEARER_TOKEN=  # required if twitter sources present
GITHUB_TOKEN=          # optional, raises GitHub rate limit
PORT=3000
POLL_CRON=0 6 * * *    # cron for daily poll
SQLITE_PATH=./data/ai-daily.db
```

Copy `.env.example` to `.env` and fill in values before running.
