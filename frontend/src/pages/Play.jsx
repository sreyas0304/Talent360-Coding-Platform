// src/pages/Play.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import EditorPane from '../components/EditorPane.jsx';
import { templates } from '../lib/languageTemplates.js';

/**
 * Runner API (for Run/Submit & fetching your submissions)
 * Set in frontend/.env as:  VITE_API_BASE=http://localhost:8000/api
 * If empty, Run/Submit buttons stay disabled and no network calls are made.
 */
const API = (import.meta.env?.VITE_API_BASE ?? '').trim();
const API_ENABLED = API.length > 0;

/**
 * Problems API (read-only problem content).
 * In dev, use Vite proxy (Option A): point this to a *relative* path.
 * vite.config.js should proxy '/api' -> 'http://localhost:8001'
 */
const PROBLEMS_API = (import.meta.env?.VITE_PROBLEMS_API ?? '/api/v1/problems/').trim();

/** Demo fallback if a slug can't be loaded */
const DEMO_QUESTIONS = [
  {
    id: 'two_sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    prompt:
      'Given an array of integers and a target, return the indices of the two numbers that add up to the target (0-based).',
    inputFormat: 'n followed by n integers on one line, then target on next line',
    outputFormat: 'two indices i j or -1 if none',
    examples: [{ input: '4\n2 7 11 15\n9', output: '0 1' }],
  },
  {
    id: 'reverse_string',
    title: 'Reverse String',
    difficulty: 'Easy',
    prompt: 'Read a string s and print its reverse.',
    inputFormat: 'string s',
    outputFormat: 'reversed string',
    examples: [{ input: 'hello', output: 'olleh' }],
  },
  {
    id: 'fibonacci_n',
    title: 'Nth Fibonacci',
    difficulty: 'Medium',
    prompt: 'Given n (0-indexed), print the nth Fibonacci number where F0=0, F1=1.',
    inputFormat: 'integer n (0 ≤ n ≤ 45)',
    outputFormat: 'F(n)',
    examples: [{ input: '7', output: '13' }],
  },
];

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    background: '#0f172a',
    color: '#e5e7eb',
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  },
  left: {
    borderRight: '1px solid #1f2937',
    overflowY: 'auto',
    overflowX: 'hidden',
    background: '#0b1220',
    display: 'flex',
    flexDirection: 'column',
  },
  right: { display: 'flex', flexDirection: 'column' },
  resizer: {
    width: 6,
    cursor: 'col-resize',
    background: 'transparent',
    borderRight: '1px solid #1f2937',
    borderLeft: '1px solid #0b1220',
    userSelect: 'none',
  },
  topbar: {
    padding: 12,
    borderBottom: '1px solid #1f2937',
    background: '#0b1220',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
  },
  prompt: {
    padding: 12,
    borderBottom: '1px solid #1f2937',
    whiteSpace: 'pre-wrap',
    height: 'auto',
    overflowY: 'visible',
    overflowX: 'hidden',
    background: '#0b1220',
  },
  info: {
    padding: 8,
    marginBottom: 8,
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: 8,
  },
  selectWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  select: {
    background: '#111827',
    color: '#e5e7eb',
    border: '1px solid #1f2937',
    padding: '6px 10px',
    borderRadius: 8,
  },
  actions: {
    padding: 10,
    borderTop: '1px solid #1f2937',
    display: 'flex',
    gap: 8,
    background: '#0b1220',
  },
  button: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #1f2937',
    background: '#111827',
    color: '#e5e7eb',
    cursor: 'pointer',
  },
  buttonPrimary: { background: '#2563eb', borderColor: '#2563eb', color: '#fff' },
  results: {
    padding: 10,
    borderTop: '1px solid #1f2937',
    maxHeight: 180,
    overflow: 'auto',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
    background: '#0b1220',
  },
  pre: {
    background: '#111827',
    border: '1px solid #1f2937',
    padding: 8,
    borderRadius: 8,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowX: 'hidden',
    overflowY: 'auto',
    maxWidth: '100%',
  },
  muted: { color: '#9ca3af' },
  link: { color: '#93c5fd', textDecoration: 'none' },
  textarea: {
    width: '100%',
    minHeight: 180,
    background: '#111827',
    color: '#e5e7eb',
    border: '1px solid #1f2937',
    borderRadius: 8,
    padding: 8,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
};

/** helpers */
function joinUrl(base, path) {
  if (!base) return path || '';
  const b = base.endsWith('/') ? base : base + '/';
  const p = (path || '').replace(/^\/+/, '');
  return b + p;
}
async function getProblemsJSON(url) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
  }
function levelFromRating(r) {
  if (r == null) return 'Easy';
  if (r < 1200) return 'Easy';
  if (r < 1800) return 'Medium';
  return 'Hard';
}

/** Runner API helpers (guard against disabled API) */
async function apiGet(path) {
  if (!API_ENABLED) throw new Error('API disabled');
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}
async function apiPost(path, body) {
  if (!API_ENABLED) throw new Error('API disabled');
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function Play() {
  // Route param (your Primary page links to /play/:slug; routes likely defined as ':qid')
  const { qid: slug } = useParams();
  const location = useLocation();
  const ext = location.state?.externalProblem || null; // optional CF external fallback

  // Resizable left pane (default 33%, clamp 20–70%)
  const containerRef = useRef(null);
// Default pane ratio: 40% (left) : 60% (right).
// Use a new storage key so everyone gets the new default once.
const LEFT_PANE_KEY = 'leftPanePct_v2';
const [leftPct, setLeftPct] = useState(() => {
  const saved = localStorage.getItem(LEFT_PANE_KEY);
  const n = saved ? Number(saved) : 40;
  return Number.isFinite(n) ? Math.min(70, Math.max(20, n)) : 40;
});
  const [dragging, setDragging] = useState(false);

  // Data + UI state
  const [questions, setQuestions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(templates.python);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const [loadError, setLoadError] = useState(null);

  // Runner API online/offline (for Run/Submit & submissions)
  const [apiOnline, setApiOnline] = useState(false);

  // External CF statement manual paste
  const [statement, setStatement] = useState('');
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState('');

  // Left-pane tabs
  const [activeTab, setActiveTab] = useState('problem'); // 'problem' | 'solution' | 'submissions'

  // Previous submissions tab data
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState('');

  const [solLoading, setSolLoading] = useState(false);
  const [solError, setSolError] = useState('');
  const [sol, setSol] = useState(null); // single solution text
  const [solByLang, setSolByLang] = useState(null); // map: { python, java, ruby }
  const solutionsCacheRef = useRef(new Map()); // cache by problem id

  // Load the selected problem by slug from Problems API (8001 via Vite proxy)
  useEffect(() => {
    let alive = true;

    function adaptProblem(p) {
      const id = p.slug || p.id || slug || 'problem';
      const title = p.title || p.name || id;
      const statement =
        p.statementMd || p.statement || p.description || p.prompt || '';
      const inputFormat =
        p.inputFormat || p.input || p.io?.input || 'See problem statement';
      const outputFormat =
        p.outputFormat || p.output || p.io?.output || 'See problem statement';

      const rawSamples = Array.isArray(p.samples)
        ? p.samples
        : Array.isArray(p.examples)
        ? p.examples
        : [];
      const examples = rawSamples.map((ex) => ({
        input: ex.input ?? ex.in ?? '',
        output: ex.output ?? ex.out ?? '',
      }));

      // Solutions support
      let solution = null;
      let solutionsByLang = null;
      if (typeof p.solution === 'string') {
        solution = p.solution;
      } else if (Array.isArray(p.solutions) && p.solutions.length) {
        solution = String(p.solutions[0]);
      } else if (p.solutionsByLang && typeof p.solutionsByLang === 'object') {
        solutionsByLang = p.solutionsByLang;
        const anyLang = Object.keys(p.solutionsByLang)[0];
        solution = p.solutionsByLang[anyLang];
      }

      return {
        id,
        title,
        difficulty: p.difficulty ? String(p.difficulty) : 'Easy',
        prompt: statement,
        inputFormat,
        outputFormat,
        examples,
        solution,
        solutionsByLang,
        __external: false,
      };
    }

    async function getJSON(url) {
      // const res = await fetch(url, { mode: 'cors' });
      // if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      // return res.json();
      return getProblemsJSON(url);
    }

    async function fetchBySlug(s) {
      const candidates = [
        joinUrl(PROBLEMS_API, encodeURIComponent(s)),
        joinUrl(PROBLEMS_API, encodeURIComponent(s) + '/'),
      ];
      for (const u of candidates) {
        try {
          const data = await getJSON(u);
          const pr = data?.problem ?? data;
          if (pr && (pr.slug || pr.title)) return adaptProblem(pr);
        } catch {
          /* try next */
        }
      }
      // fallback to list and search
      try {
        const list = await getJSON(joinUrl(PROBLEMS_API, ''));
        const arr = Array.isArray(list) ? list : list?.results || [];
        const match = arr.find((p) => p.slug === s);
        if (match) return adaptProblem(match);
      } catch {
        /* ignore */
      }
      // last resort demo
      return adaptProblem({
        slug: s,
        title: 'Problem not found',
        statement: 'The requested problem could not be loaded from the Local API.',
        samples: [],
      });
    }

    (async () => {
      try {
        setLoadError(null);
        setActiveTab('problem'); // reset to default tab for new slug
        if (slug) {
          const q = await fetchBySlug(slug);
          if (!alive) return;
          setQuestions([q]);
          setSelectedId(q.id);
        } else if (ext) {
          const pseudo = {
            id: ext.id,
            title: `${ext.title} (Codeforces)`,
            difficulty: levelFromRating(ext.rating),
            prompt:
              `External problem from Codeforces. Paste the statement below if you want it visible here.\nLink:\n${ext.url}\n\nRun/Submit are disabled for external problems.`,
            inputFormat: 'See linked statement',
            outputFormat: 'See linked statement',
            examples: [],
            __external: true,
            url: ext.url,
          };
          setQuestions([pseudo]);
          setSelectedId(pseudo.id);
        } else {
          setQuestions(DEMO_QUESTIONS);
          setSelectedId(DEMO_QUESTIONS[0]?.id ?? null);
        }
      } catch (e) {
        if (!alive) return;
        setLoadError(String(e?.message || e));
        setQuestions(DEMO_QUESTIONS);
        setSelectedId(DEMO_QUESTIONS[0]?.id ?? null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug, ext]);

  // Keep editor template synced with language
  useEffect(() => {
    setCode(templates[language]);
  }, [language, selectedId]);

  const selected = useMemo(
    () => questions.find((q) => q.id === selectedId),
    [questions, selectedId]
  );
  const isExternal = !!selected?.__external;

  // External CF: stop auto-fetch, restore cached pasted statement
  useEffect(() => {
    setStatement('');
    setStatementError('');
    setStatementLoading(false);
    if (isExternal && selected?.id) {
      const k = `cf_statement:${selected.id}`;
      const cached = localStorage.getItem(k);
      if (cached) setStatement(cached);
    }
  }, [isExternal, selected?.id]);

  useEffect(() => {
    let alive = true;
    async function loadSolution() {
      setSolError('');
      setSolLoading(false);
      setSol(null);
      setSolByLang(null);
      if (activeTab !== 'solution') return;
      if (isExternal) return; // external problems don't use local solution API
      if (!selected?.id) return;
    
      // Cache hit?
      const cached = solutionsCacheRef.current.get(selected.id);
      if (cached) {
        setSol(cached.sol ?? null);
        setSolByLang(cached.solByLang ?? null);
        return;
      }
    
      const url = joinUrl(PROBLEMS_API, `${encodeURIComponent(selected.id)}/solution/`);
      try {
        setSolLoading(true);
        const data = await getProblemsJSON(url);
        if (!alive) return;
    
        // Adapt various shapes:
        //  - string
        //  - { solution: string }
        //  - { solutionsByLang: { python, java, ruby } }
        //  - { solutions: [string, ...] }
        let text = null;
        let byLang = null;
        if (typeof data === 'string') {
          text = data;
        } else if (data && typeof data === 'object') {
          if (typeof data.solution === 'string') text = data.solution;
          if (data.solutionsByLang && typeof data.solutionsByLang === 'object') {
            byLang = data.solutionsByLang;
            // pick any as default display
            const firstLang = Object.keys(byLang)[0];
            text = byLang[firstLang] ?? text;
          }
          if (!text && Array.isArray(data.solutions) && data.solutions.length) {
            text = String(data.solutions[0]);
          }
        }
        setSol(text);
        setSolByLang(byLang);
        solutionsCacheRef.current.set(selected.id, { sol: text, solByLang: byLang });
      } catch (e) {
        if (!alive) return;
        setSolError(String(e?.message || e));
      } finally {
        if (!alive) return;
        setSolLoading(false);
      }
    }
    loadSolution();
    return () => { alive = false; };
      }, [activeTab, selected?.id, isExternal]);

  // Drag-resize behavior
  useEffect(() => {
    if (!dragging) return;
    const el = containerRef.current;
    if (!el) return;

    function onMove(e) {
      const clientX = e.touches?.[0]?.clientX ?? e.clientX;
      const rect = el.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(70, Math.max(20, pct));
      setLeftPct(clamped);
    }
    function onUp() {
      setDragging(false);
      localStorage.setItem(LEFT_PANE_KEY, String(leftPct));
      document.body.style.cursor = '';
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp, { once: true });
    document.body.style.cursor = 'col-resize';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.body.style.cursor = '';
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
    };
  }, [dragging, leftPct]);

  function startDrag(e) {
    e.preventDefault();
    setDragging(true);
  }

  // Load previous submissions when "submissions" tab is opened
  useEffect(() => {
    let alive = true;
    async function loadSubs() {
      setSubsError('');
      setSubs([]);
      if (activeTab !== 'submissions') return;
      if (!selected?.id) return;
      if (!API_ENABLED) {
        setSubsError('Runner API disabled. Add VITE_API_BASE to enable.');
        return;
      }
      try {
        setSubsLoading(true);
        const data = await apiGet(`/submissions?questionId=${encodeURIComponent(selected.id)}`);
        if (!alive) return;
        setApiOnline(true);
        setSubs(Array.isArray(data) ? data : (data?.results || []));
      } catch (e) {
        if (!alive) return;
        setApiOnline(false);
        setSubsError(String(e?.message || e));
      } finally {
        if (!alive) return;
        setSubsLoading(false);
      }
    }
    loadSubs();
    return () => {
      alive = false;
    };
  }, [activeTab, selected?.id]);

  async function run() {
    if (!selected || isExternal || !API_ENABLED) return;
    setRunning(true);
    setResult(null);
    try {
      const data = await apiPost('/run', {
        questionId: selected.id,
        language,
        code,
      });
      setApiOnline(true);
      setResult(data);
    } catch (e) {
      setApiOnline(false);
      setResult({ error: String(e?.message || e) });
    } finally {
      setRunning(false);
    }
  }

  async function submit() {
    if (!selected || isExternal || !API_ENABLED) return;
    try {
      const data = await apiPost('/submit', {
        questionId: selected.id,
        language,
        code,
        result: result || { passed: 0, total: 0, runtime_ms: 0 },
      });
      setApiOnline(true);
      alert(`Saved! Submission ID: ${data.id}`);
    } catch (e) {
      setApiOnline(false);
      alert(`Submit failed: ${String(e?.message || e)}`);
    }
  }

  return (
    <div style={styles.container} ref={containerRef}>
      {/* LEFT: Tabs + content (resizable) */}
      <div style={{ ...styles.left, flex: `0 0 ${leftPct}%` }}>
        {/* Tabs */}
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid #1f2937',
            background: '#0b1220',
            display: 'flex',
            gap: 8,
          }}
        >
          <button
            onClick={() => setActiveTab('problem')}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #1f2937',
              background: activeTab === 'problem' ? '#2563eb' : '#111827',
              color: activeTab === 'problem' ? '#fff' : '#e5e7eb',
              cursor: 'pointer',
            }}
          >
            Problem
          </button>
          <button
            onClick={() => setActiveTab('solution')}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #1f2937',
              background: activeTab === 'solution' ? '#2563eb' : '#111827',
              color: activeTab === 'solution' ? '#fff' : '#e5e7eb',
              cursor: 'pointer',
            }}
          >
            Solution
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #1f2937',
              background: activeTab === 'submissions' ? '#2563eb' : '#111827',
              color: activeTab === 'submissions' ? '#fff' : '#e5e7eb',
              cursor: isExternal ? 'not-allowed' : 'pointer',
              opacity: isExternal ? 0.6 : 1,
            }}
            title={isExternal ? 'Disabled for external problems' : undefined}
            disabled={isExternal}
          >
            Submitted&nbsp;Solutions
          </button>
        </div>

        {/* Left content */}
        <div style={styles.prompt}>
          {loadError && (
            <div style={{ color: '#f87171' }}>
              Failed to load problem: {loadError}
            </div>
          )}

          {!loadError && selected ? (
            <>
              {/* TAB: PROBLEM */}
              {activeTab === 'problem' && (
                <>
                  {isExternal ? (
                    <>
                      <div style={styles.info}>
                        External Codeforces problem. Codeforces blocks automated loading of
                        statements (CAPTCHA).{' '}
                        <a
                          href={selected.url}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.link}
                        >
                          Open original ↗
                        </a>
                        . Paste the statement below if you want it visible here.
                      </div>
                      <h3 style={{ margin: '4px 0' }}>{selected.title}</h3>
                      <textarea
                        style={styles.textarea}
                        placeholder="Paste the problem statement here (optional)…"
                        value={statement}
                        onChange={(e) => {
                          const v = e.target.value;
                          setStatement(v);
                          if (selected?.id) {
                            localStorage.setItem(`cf_statement:${selected.id}`, v);
                          }
                        }}
                      />
                      {!!statement && (
                        <>
                          <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
                            Preview:
                          </div>
                          <pre style={styles.pre}>{statement}</pre>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 style={{ margin: '4px 0' }}>{selected.title}</h3>
                      <p style={{ marginTop: 8 }}>{selected.prompt}</p>
                      <p>
                        <strong>Input:</strong> {selected.inputFormat}
                      </p>
                      <p>
                        <strong>Output:</strong> {selected.outputFormat}
                      </p>
                      {!!selected.examples?.length && (
                        <div style={{ marginTop: 8 }}>
                          <strong>Examples</strong>
                          <pre style={styles.pre}>
                            {selected.examples
                              .map(
                                (ex, i) =>
                                  `#${i + 1}\nInput:\n${ex.input}\nOutput:\n${ex.output}\n`
                              )
                              .join('\n')}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* TAB: SOLUTION */}
              {activeTab === 'solution' && (
                <>
                  <h3 style={{ margin: '4px 0' }}>Solution</h3>
                  {isExternal ? (
                    <div style={styles.info}>
                      No official solution available for external problems in this view. Open
                      the original link for editorials.
                    </div>
                  
                  ) : solLoading ? (
                              <em style={styles.muted}>Loading solution…</em>
                  ) : solError ? (
                              <div style={{ color: '#f87171' }}>{solError}</div>
                  ) : solByLang ? (
                    <>
                      <div style={{ marginBottom: 8, color: '#9ca3af' }}>
                        Showing solution for <strong>{language}</strong>
                      </div>
                      <pre style={styles.pre}>
                      {String(solByLang[language] ?? sol ?? 'No solution provided.')}
                      </pre>
                    </>
                  ) : sol ? (
                        <pre style={styles.pre}>{String(sol)}</pre>
                  ) : (
                    <div style={styles.info}>No solution provided by the Local API.</div>
                  )}
                </>
              )}

              {/* TAB: SUBMISSIONS */}
              {activeTab === 'submissions' && (
                <>
                  <h3 style={{ margin: '4px 0' }}>Your Submissions</h3>
                  {isExternal && (
                    <div style={styles.info}>Disabled for external problems.</div>
                  )}
                  {!isExternal && !API_ENABLED && (
                    <div style={styles.info}>
                      Runner API is <strong>disabled</strong>. Add <code>VITE_API_BASE</code> to
                      your <code>.env</code> to enable fetching submissions.
                    </div>
                  )}
                  {!isExternal && API_ENABLED && !apiOnline && (
                    <div style={styles.info}>
                      Runner API <code>{API}</code> appears offline. Start it to view your submissions.
                    </div>
                  )}
                  {!isExternal && API_ENABLED && (
                    <>
                      {subsLoading && <em style={styles.muted}>Loading…</em>}
                      {subsError && <div style={{ color: '#f87171' }}>{subsError}</div>}
                      {!subsLoading && !subsError && !subs.length && (
                        <div style={styles.muted}>No submissions yet.</div>
                      )}
                      {!!subs.length && (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {subs.map((s, i) => (
                            <div
                              key={s.id ?? i}
                              style={{
                                border: '1px solid #1f2937',
                                borderRadius: 8,
                                padding: 8,
                                background: '#111827',
                              }}
                            >
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span><strong>Status:</strong> {s.status ?? s.verdict ?? '—'}</span>
                                <span><strong>Lang:</strong> {s.language ?? '—'}</span>
                                {'runtime_ms' in (s || {}) && (
                                  <span><strong>Time:</strong> {s.runtime_ms} ms</span>
                                )}
                                {'memory_kb' in (s || {}) && (
                                  <span><strong>Mem:</strong> {s.memory_kb} KB</span>
                                )}
                                {s.createdAt && (
                                  <span className="muted">
                                    <strong>When:</strong>{' '}
                                    {new Date(s.createdAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {s.error && (
                                <pre style={{ ...styles.pre, marginTop: 8 }}>
Error:
{String(s.error)}
                                </pre>
                              )}
                              {s.code && (
                                <details style={{ marginTop: 8 }}>
                                  <summary style={{ cursor: 'pointer' }}>View code</summary>
                                  <pre style={styles.pre}>{String(s.code)}</pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            !loadError && <em style={styles.muted}>Loading…</em>
          )}
        </div>
      </div>

      {/* Drag handle */}
      <div
        style={styles.resizer}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        title="Drag to resize"
      />

      {/* RIGHT: Topbar + Editor + Actions + Results */}
      <div style={{ ...styles.right, flex: '1 1 0%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto auto',
            height: '100%',
            background: '#0b1220',
          }}
        >
          {/* Top bar: Back (left) + Language select (right) */}
          <div style={styles.topbar}>
            <Link to="/" style={styles.link}>
              ← Back to Categories
            </Link>
            <div style={styles.selectWrap}>
              <label htmlFor="lang">Language:</label>
              <select
                id="lang"
                style={styles.select}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="ruby">Ruby</option>
              </select>
            </div>
          </div>

          {/* Editor */}
          <div style={{ height: '100%' }}>
            <EditorPane language={language} code={code} onChange={setCode} />
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              onClick={run}
              disabled={isExternal || !API_ENABLED || running || !selected}
              style={{
                ...styles.button,
                ...(isExternal || !API_ENABLED || running ? {} : styles.buttonPrimary),
              }}
              title={
                isExternal
                  ? 'Disabled for external problems'
                  : !API_ENABLED
                  ? 'Runner API disabled'
                  : 'Run'
              }
            >
              {running ? 'Running…' : 'Run'}
            </button>
            <button
              onClick={submit}
              disabled={isExternal || !API_ENABLED || !selected}
              style={styles.button}
              title={
                isExternal
                  ? 'Disabled for external problems'
                  : !API_ENABLED
                  ? 'Runner API disabled'
                  : 'Submit'
              }
            >
              Submit
            </button>
            {result?.error && (
              <span style={{ color: '#f87171', marginLeft: 12 }}>
                {String(result.error)}
              </span>
            )}
          </div>

          {/* Results */}
          <div style={styles.results}>
            {result && !result.error && (
              <div>
                <div>
                  <strong>Verdict:</strong> {result.passed}/{result.total} tests passed{' '}
                  {typeof result.runtime_ms === 'number'
                    ? `in ${result.runtime_ms}ms`
                    : ''}
                </div>
                <ol>
                  {result.results?.map((r, i) => (
                    <li key={i} style={{ marginTop: 8 }}>
                      <div>
                        Test #{i + 1}: {r.ok ? '✅ Passed' : '❌ Failed'} ({r.status})
                      </div>
                      {r.compile_output && (
                        <pre style={styles.pre}>
Compile Output:
{r.compile_output}
                        </pre>
                      )}
                      {r.stderr && (
                        <pre style={styles.pre}>
Stderr:
{r.stderr}
                        </pre>
                      )}
                      {!r.ok && (
                        <>
                          <pre style={styles.pre}>
Input:
{r.input}
                          </pre>
                          <pre style={styles.pre}>
Expected:
{r.expected}
                          </pre>
                          <pre style={styles.pre}>
Got:
{r.stdout}
                          </pre>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
