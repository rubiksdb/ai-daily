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
    <div style={styles.appContainer}>
      <header style={styles.topBar}>
        <div style={styles.topBarBrand}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <span style={styles.topBarTitle}>AI Daily</span>
        </div>
      </header>
      <div style={{ display: 'flex', flex: 1 }}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
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

        <div style={{ ...styles.sectionLabel, marginTop: 24 }}>Actions</div>
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
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#f8f9fa',
  },
  topBar: {
    height: 64,
    background: '#ffffff',
    borderBottom: '1px solid #e8eaed',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(60,64,67,.12)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  topBarBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  topBarTitle: { fontSize: 22, fontWeight: 400, color: '#202124', letterSpacing: '-0.3px' },
  sidebar: {
    width: 256,
    minWidth: 256,
    background: '#f8f9fa',
    padding: '12px 0 16px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    color: '#5f6368',
    letterSpacing: '0.8px',
    marginBottom: 4,
    padding: '4px 16px',
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: '#3c4043',
    textAlign: 'left' as const,
    padding: '0 16px',
    borderRadius: 24,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    width: 'calc(100% - 16px)',
    marginLeft: 8,
    marginBottom: 2,
    height: 40,
  },
  navBtnActive: { background: '#d2e3fc', color: '#0d47a1', fontWeight: 600 },
  dateInput: {
    background: '#ffffff',
    border: '1px solid #dadce0',
    borderRadius: 4,
    color: '#202124',
    padding: '8px 12px',
    fontSize: 13,
    width: 'calc(100% - 32px)',
    margin: '0 16px',
    display: 'block',
  },
  actionBtn: {
    background: '#1a73e8',
    border: 'none',
    borderRadius: 4,
    color: '#ffffff',
    padding: '9px 16px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    width: 'calc(100% - 32px)',
    marginLeft: 16,
    letterSpacing: '0.25px',
  },
  wechatBtn: { marginTop: 8, background: '#1aad19' },
  actionMsg: { marginTop: 12, marginLeft: 16, fontSize: 12, color: '#137333', lineHeight: 1.4 },
  main: { flex: 1, padding: '28px 40px', overflowY: 'auto' as const },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' as const },
  title: { fontSize: 24, fontWeight: 400, color: '#202124' },
  dateRange: { color: '#5f6368', fontSize: 14 },
  status: { color: '#5f6368', padding: '40px 0' },
  empty: { color: '#5f6368', padding: '60px 0', textAlign: 'center' as const, fontSize: 15 },
  digestCard: {
    background: '#ffffff',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    lineHeight: 1.7,
    boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
  },
  digestLabel: {
    fontWeight: 500,
    color: '#1a73e8',
    marginBottom: 16,
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 500,
    color: '#5f6368',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
  },
  grid: { display: 'grid', gap: 8 },
  card: {
    background: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' },
  sourceName: { flex: 1, fontWeight: 500, fontSize: 14, color: '#202124' },
  categoryTag: { fontSize: 11, padding: '3px 8px', borderRadius: 12, fontWeight: 500 },
  expandBtn: {
    background: 'none',
    border: 'none',
    color: '#5f6368',
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 4,
  },
  cardBody: { padding: '12px 16px 16px', lineHeight: 1.7, borderTop: '1px solid #e8eaed', color: '#202124' },
  viewToggle: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 0,
    background: '#ffffff',
    borderRadius: 24,
    padding: 4,
    border: '1px solid #dadce0',
  },
  viewBtn: {
    background: 'none',
    border: 'none',
    color: '#3c4043',
    padding: '6px 16px',
    borderRadius: 20,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '0.1px',
  },
  viewBtnActive: { background: '#d2e3fc', color: '#1967d2', fontWeight: 600 },
  filterBar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const },
  filterChip: {
    background: 'none',
    border: '1px solid #dadce0',
    borderRadius: 8,
    color: '#3c4043',
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  filterChipActive: { background: '#d2e3fc', color: '#1967d2', borderColor: '#d2e3fc', fontWeight: 600 },
  articleRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #e8eaed',
    gap: 12,
  },
  articleLink: { color: '#202124', textDecoration: 'none', fontSize: 14, flex: 1, lineHeight: 1.4 },
  articleDate: { color: '#5f6368', fontSize: 12, whiteSpace: 'nowrap' as const },
  articleCount: { fontSize: 12, color: '#5f6368', marginLeft: 'auto' },
};
