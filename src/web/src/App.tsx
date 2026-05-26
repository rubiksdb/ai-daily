import React, { useState, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import { fetchSummaries, fetchArticles, triggerPoll, triggerSummarize, publishToWechat } from './api.js';
import type { Period, Summary, SummariesResponse, Article, ArticlesResponse } from './types.js';

const PERIODS: Period[] = ['daily', 'weekly', 'monthly'];
const CATEGORY_COLORS: Record<string, string> = {
  'ai-companies': '#4299e1',
  'china-ai': '#fc8181',
  people: '#68d391',
  research: '#f6ad55',
  releases: '#b794f4',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [period, setPeriod] = useState<Period>('daily');
  const [date, setDate] = useState(todayStr());
  const [view, setView] = useState<'summaries' | 'articles'>('summaries');
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [data, setData] = useState<SummariesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articlesData, setArticlesData] = useState<ArticlesResponse | null>(null);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSummaries(period, date);
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [period, date]);

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    setArticlesError(null);
    try {
      const res = await fetchArticles(period, date);
      setArticlesData(res);
    } catch (e) {
      setArticlesError(String(e));
    } finally {
      setArticlesLoading(false);
    }
  }, [period, date]);

  useEffect(() => { if (view === 'summaries') load(); }, [load, view]);
  useEffect(() => { if (view === 'articles') loadArticles(); }, [loadArticles, view]);

  async function handlePoll() {
    setActionMsg('Polling sources...');
    try {
      const { newArticles } = await triggerPoll();
      setActionMsg(`Poll complete — ${newArticles} new articles`);
      setTimeout(() => setActionMsg(null), 4000);
    } catch (e) {
      setActionMsg(`Poll failed: ${e}`);
    }
  }

  async function handleSummarize() {
    setActionMsg('Generating summary...');
    try {
      await triggerSummarize(period, date);
      setActionMsg('Summary generated');
      await load();
      setTimeout(() => setActionMsg(null), 3000);
    } catch (e) {
      setActionMsg(`Summarize failed: ${e}`);
    }
  }

  async function handlePublishWechat() {
    setActionMsg('Publishing to WeChat...');
    try {
      await publishToWechat(period, date);
      setActionMsg('Published to WeChat');
      setTimeout(() => setActionMsg(null), 4000);
    } catch (e) {
      setActionMsg(`WeChat publish failed: ${e}`);
    }
  }

  const digest = data?.summaries.find((s) => s.sourceId === null);
  const perSource = data?.summaries.filter((s) => s.sourceId !== null) ?? [];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>🤖 AI Daily</div>

        <div style={styles.sectionLabel}>Period</div>
        {PERIODS.map((p) => (
          <button
            key={p}
            style={{ ...styles.navBtn, ...(period === p ? styles.navBtnActive : {}) }}
            onClick={() => setPeriod(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}

        <div style={{ ...styles.sectionLabel, marginTop: 24 }}>Date</div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={styles.dateInput}
        />

        <div style={{ flex: 1 }} />

        <button style={styles.actionBtn} onClick={handlePoll}>
          ↻ Poll Now
        </button>
        <button style={{ ...styles.actionBtn, marginTop: 8 }} onClick={handleSummarize}>
          ✦ Summarize
        </button>
        <button style={{ ...styles.actionBtn, ...styles.wechatBtn }} onClick={handlePublishWechat}>
          微信发布
        </button>

        {actionMsg && <div style={styles.actionMsg}>{actionMsg}</div>}
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            {period.charAt(0).toUpperCase() + period.slice(1)} Digest
          </h1>
          {data && view === 'summaries' && (
            <span style={styles.dateRange}>
              {data.periodStart.slice(0, 10)}
              {period !== 'daily' && ` → ${data.periodEnd.slice(0, 10)}`}
            </span>
          )}
          {articlesData && view === 'articles' && (
            <span style={styles.dateRange}>
              {articlesData.periodStart.slice(0, 10)}
              {period !== 'daily' && ` → ${articlesData.periodEnd.slice(0, 10)}`}
            </span>
          )}
          <div style={styles.viewToggle}>
            <button
              style={{ ...styles.viewBtn, ...(view === 'summaries' ? styles.viewBtnActive : {}) }}
              onClick={() => setView('summaries')}
            >
              Summaries
            </button>
            <button
              style={{ ...styles.viewBtn, ...(view === 'articles' ? styles.viewBtnActive : {}) }}
              onClick={() => setView('articles')}
            >
              Articles
            </button>
          </div>
          {view === 'summaries' && (
            <div style={{ ...styles.viewToggle, marginLeft: 8 }}>
              <button
                style={{ ...styles.viewBtn, ...(lang === 'en' ? styles.viewBtnActive : {}) }}
                onClick={() => setLang('en')}
              >
                EN
              </button>
              <button
                style={{ ...styles.viewBtn, ...(lang === 'zh' ? styles.viewBtnActive : {}) }}
                onClick={() => setLang('zh')}
              >
                中文
              </button>
            </div>
          )}
        </div>

        {view === 'summaries' && (
          <>
            {loading && <div style={styles.status}>Loading...</div>}
            {error && <div style={{ ...styles.status, color: '#fc8181' }}>{error}</div>}

            {!loading && data?.summaries.length === 0 && (
              <div style={styles.empty}>
                <p>No summaries yet for this period.</p>
                <p style={{ marginTop: 8, opacity: 0.6 }}>
                  Click "Poll Now" to fetch articles, then "Summarize" to generate a digest.
                </p>
              </div>
            )}

            {digest && (
              <div style={styles.digestCard}>
                <div style={styles.digestLabel}>✦ Full Digest</div>
                <Markdown>{(lang === 'zh' ? digest.contentMdZh : null) ?? digest.contentMd}</Markdown>
              </div>
            )}

            {perSource.length > 0 && (
              <>
                <h2 style={styles.sectionTitle}>By Source</h2>
                <div style={styles.grid}>
                  {perSource.map((s) => (
                    <SummaryCard key={s.id} summary={s} lang={lang} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {view === 'articles' && (
          <>
            {articlesLoading && <div style={styles.status}>Loading...</div>}
            {articlesError && <div style={{ ...styles.status, color: '#fc8181' }}>{articlesError}</div>}

            {!articlesLoading && articlesData?.articles.length === 0 && (
              <div style={styles.empty}>
                <p>No articles yet for this period.</p>
                <p style={{ marginTop: 8, opacity: 0.6 }}>
                  Click "Poll Now" to fetch articles.
                </p>
              </div>
            )}

            {articlesData && articlesData.articles.length > 0 && (
              <ArticlesList articles={articlesData.articles} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ArticlesList({ articles }: { articles: Article[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categories = Array.from(new Set(articles.map((a) => a.sourceCategory))).sort();
  const visible = categoryFilter ? articles.filter((a) => a.sourceCategory === categoryFilter) : articles;

  return (
    <div>
      <div style={styles.filterBar}>
        <button
          style={{ ...styles.filterChip, ...(categoryFilter === null ? styles.filterChipActive : {}) }}
          onClick={() => setCategoryFilter(null)}
        >
          All
        </button>
        {categories.map((cat) => {
          const color = CATEGORY_COLORS[cat] ?? '#a0aec0';
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              style={{
                ...styles.filterChip,
                ...(active ? { background: color + '33', color, borderColor: color } : {}),
              }}
              onClick={() => setCategoryFilter(active ? null : cat)}
            >
              {cat}
            </button>
          );
        })}
        <span style={styles.articleCount}>{visible.length} articles</span>
      </div>

      <div style={styles.card}>
        {visible.map((a) => {
          const color = CATEGORY_COLORS[a.sourceCategory] ?? '#a0aec0';
          const dateStr = a.publishedAt ? a.publishedAt.slice(0, 10) : '—';
          return (
            <div key={a.id} style={styles.articleRow}>
              <span style={{ ...styles.categoryTag, background: color + '22', color, flexShrink: 0 }}>
                {a.sourceCategory}
              </span>
              <span style={{ ...styles.sourceName, flexShrink: 0, width: 140, fontSize: 12 }}>
                {a.sourceName}
              </span>
              <a href={a.url} target="_blank" rel="noreferrer" style={styles.articleLink}>
                {a.title}
              </a>
              <span style={styles.articleDate}>{dateStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ summary, lang }: { summary: Summary; lang: 'en' | 'zh' }) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORY_COLORS[summary.sourceCategory ?? ''] ?? '#a0aec0';
  const content = (lang === 'zh' ? summary.contentMdZh : null) ?? summary.contentMd;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={{ ...styles.categoryTag, background: color + '22', color }}>
          {summary.sourceCategory}
        </span>
        <span style={styles.sourceName}>{summary.sourceName}</span>
        <button style={styles.expandBtn} onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      {expanded && (
        <div style={styles.cardBody}>
          <Markdown>{content}</Markdown>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 200,
    minWidth: 200,
    background: '#1a202c',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #2d3748',
  },
  logo: { fontSize: 18, fontWeight: 700, marginBottom: 24, color: '#fff' },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', color: '#718096', marginBottom: 8, letterSpacing: 1 },
  navBtn: {
    background: 'none',
    border: 'none',
    color: '#a0aec0',
    textAlign: 'left',
    padding: '8px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    width: '100%',
    marginBottom: 4,
  },
  navBtnActive: { background: '#2d3748', color: '#fff', fontWeight: 600 },
  dateInput: {
    background: '#2d3748',
    border: '1px solid #4a5568',
    borderRadius: 6,
    color: '#e2e8f0',
    padding: '6px 10px',
    fontSize: 13,
    width: '100%',
  },
  actionBtn: {
    background: '#2b6cb0',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13,
    width: '100%',
  },
  wechatBtn: { marginTop: 8, background: '#1aad19' },
  actionMsg: { marginTop: 12, fontSize: 12, color: '#68d391', lineHeight: 1.4 },
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 700, color: '#fff' },
  dateRange: { color: '#718096', fontSize: 14 },
  status: { color: '#a0aec0', padding: '40px 0' },
  empty: { color: '#718096', padding: '60px 0', textAlign: 'center', fontSize: 15 },
  digestCard: {
    background: '#1a202c',
    border: '1px solid #4a5568',
    borderRadius: 10,
    padding: 24,
    marginBottom: 32,
    lineHeight: 1.7,
  },
  digestLabel: { fontWeight: 700, color: '#f6ad55', marginBottom: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#a0aec0', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { display: 'grid', gap: 12 },
  card: { background: '#1a202c', border: '1px solid #2d3748', borderRadius: 8 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' },
  sourceName: { flex: 1, fontWeight: 600, fontSize: 14 },
  categoryTag: { fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 },
  expandBtn: { background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: 12 },
  cardBody: { padding: '0 16px 16px', lineHeight: 1.7, borderTop: '1px solid #2d3748', paddingTop: 12 },
  viewToggle: { marginLeft: 'auto', display: 'flex', gap: 4, background: '#1a202c', borderRadius: 8, padding: 4 },
  viewBtn: {
    background: 'none',
    border: 'none',
    color: '#718096',
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  viewBtnActive: { background: '#2d3748', color: '#fff' },
  filterBar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const },
  filterChip: {
    background: 'none',
    border: '1px solid #2d3748',
    borderRadius: 20,
    color: '#a0aec0',
    padding: '4px 12px',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500,
  },
  filterChipActive: { background: '#2d3748', color: '#fff', borderColor: '#4a5568' },
  articleRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '9px 16px',
    borderBottom: '1px solid #2d3748',
    gap: 12,
  },
  articleLink: { color: '#e2e8f0', textDecoration: 'none', fontSize: 13, flex: 1, lineHeight: 1.4 },
  articleDate: { color: '#4a5568', fontSize: 12, whiteSpace: 'nowrap' as const },
  articleCount: { fontSize: 12, color: '#4a5568', marginLeft: 'auto' },
};
