# ── Stage 1: build frontend ──────────────────────────────────────────
FROM node:22-alpine AS web-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --config src/web/vite.config.ts 2>/dev/null || npx vite build --config src/web/vite.config.ts

# ── Stage 2: compile TypeScript ──────────────────────────────────────
FROM node:22-alpine AS ts-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --project tsconfig.json
COPY --from=web-builder /app/dist/web ./dist/web

# ── Stage 3: runtime ─────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=ts-builder /app/dist ./dist
COPY sites.yaml ./

RUN mkdir -p data

EXPOSE 3000
ENV NODE_ENV=production
ENV SQLITE_PATH=/app/data/ai-daily.db

CMD ["node", "dist/index.js"]
