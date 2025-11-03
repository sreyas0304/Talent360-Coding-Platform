// src/pages/Play.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import EditorPane from '../components/EditorPane.jsx';
import { templates } from '../lib/languageTemplates.js';

// Allow overriding the API base with Vite env, else default to localhost.
const API = import.meta.env?.VITE_API_BASE || 'http://localhost:8000/api';

// Fallback demo questions used if backend API is offline
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
    // Let the entire left pane own scrolling; not the inner question box
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
    // Wrap long lines to avoid needing a horizontal scrollbar within the question
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowX: 'hidden',
    overflowY: 'auto',
    maxWidth: '100%',
  },
  muted: { color: '#9ca3af' },
  link: { color: '#93c5fd', textDecoration: 'none' },
};

function parseCodeforcesId(id = '') {
  const i = id.lastIndexOf('-');
  if (i <= 0) return null;
  const contestId = id.slice(0, i);
  const index = id.slice(i + 1);
  if (!/^\d+$/.test(contestId)) return null;
  return { contestId, index };
}

function levelFromRating(r) {
  if (r == null) return 'Easy';
  if (r < 1200) return 'Easy';
  if (r < 1800) return 'Medium';
  return 'Hard';
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function Play() {
  const { qid } = useParams();
  const location = useLocation();
  const ext = location.state?.externalProblem || null;

  const containerRef = useRef(null);
  const [leftPct, setLeftPct] = useState(() => {
    const saved = localStorage.getItem('leftPanePct');
    const n = saved ? Number(saved) : 33;
    return Number.isFinite(n) ? Math.min(70, Math.max(20, n)) : 33;
  });
  const [dragging, setDragging] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(templates.python);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [apiOnline, setApiOnline] = useState(true);

  // External statement handling
  const [statement, setStatement] = useState('');
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState('');

  useEffect(() => {
    (async () => {
      let list;
      try {
        const data = await apiGet('/questions'); // try backend
        setApiOnline(true);
        list = data;
      } catch (e) {
        // Backend unreachable → use fallback demo questions
        setApiOnline(false);
        list = DEMO_QUESTIONS;
      }

      if (ext) {
        // Show ONLY the clicked external Codeforces problem in the list
        const pseudo = {
          id: ext.id, // e.g., "1831-A"
          title: `${ext.title} (Codeforces)`,
          difficulty: levelFromRating(ext.rating),
          prompt:
            `External problem from Codeforces.\n\nView full statement at:\n${ext.url}\n\nUse the editor to practice locally. (Run/Submit disabled for external problems.)`,
          inputFormat: 'See linked statement',
          outputFormat: 'See linked statement',
          examples: [],
          __external: true,
          url: ext.url,
        };
        list = [pseudo];
      }

      setQuestions(list);
      const initial =
        (qid && list.find((q) => q.id === qid)?.id) ||
        (list[0] && list[0].id) ||
        null;
      setSelectedId(initial);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid]);

  useEffect(() => {
    setCode(templates[language]);
  }, [language, selectedId]);

  const selected = useMemo(
    () => questions.find((q) => q.id === selectedId),
    [questions, selectedId]
  );
  const isExternal = !!selected?.__external;

  // Fetch full statement for external Codeforces problems (readable text via r.jina.ai proxy)
  useEffect(() => {
    let alive = true;
    setStatement('');
    setStatementError('');
    setStatementLoading(false);

    if (!isExternal || !selected?.id) return;
    const cf = parseCodeforcesId(selected.id);
    if (!cf) return;

    (async () => {
      try {
        setStatementLoading(true);
        const url = `https://r.jina.ai/http://codeforces.com/problemset/problem/${cf.contestId}/${cf.index}`;
        const res = await fetch(url);
        if (!alive) return;
        if (!res.ok) throw new Error(`Failed to fetch statement (${res.status})`);
        const text = await res.text();
        if (!alive) return;
        setStatement(text || '(No content)');
      } catch (e) {
        if (!alive) return;
        setStatementError(String(e?.message || e));
      } finally {
        if (!alive) return;
        setStatementLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isExternal, selected?.id]);

  // --- Drag to resize left pane ---
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
      localStorage.setItem('leftPanePct', String(leftPct));
      document.body.style.cursor = '';
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp, { once: true });
    document.body.style.cursor = 'col-resize';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.body.style.cursor = '';
    };
  }, [dragging, leftPct]);

  function startDrag(e) {
    e.preventDefault();
    setDragging(true);
  }

  async function run() {
    if (!selected || isExternal || !apiOnline) return;
    setRunning(true);
    setResult(null);
    try {
      const data = await apiPost('/run', {
        questionId: selected.id,
        language,
        code,
      });
      setResult(data);
    } catch (e) {
      setResult({ error: String(e?.message || e) });
    } finally {
      setRunning(false);
    }
  }

  async function submit() {
    if (!selected || isExternal || !apiOnline) return;
    try {
      const data = await apiPost('/submit', {
        questionId: selected.id,
        language,
        code,
        result: result || { passed: 0, total: 0, runtime_ms: 0 },
      });
      alert(`Saved! Submission ID: ${data.id}`);
    } catch (e) {
      alert(`Submit failed: ${String(e?.message || e)}`);
    }
  }

  return (
    <div style={styles.container} ref={containerRef}>
      {/* LEFT: Full question content (resizable) */}
      <div style={{ ...styles.left, flex: `0 0 ${leftPct}%` }}>
        <div style={styles.prompt}>
          {loadError && (
            <div style={{ color: '#f87171' }}>
              Failed to load questions: {loadError}
            </div>
          )}
          {!apiOnline && (
            <div style={styles.info}>
              Backend API <code>{API}</code> is offline. Using demo questions. Start your backend to enable Run/Submit.
            </div>
          )}
          {!loadError && selected ? (
            <>
              {isExternal ? (
                <>
                  <div style={styles.info}>
                    External Codeforces problem.{' '}
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.link}
                    >
                      Open original ↗
                    </a>
                    . Run/Submit are disabled because local test cases are not available.
                  </div>
                  <h3 style={{ margin: '4px 0' }}>{selected.title}</h3>
                  {statementLoading && (
                    <em style={styles.muted}>Loading full statement…</em>
                  )}
                  {statementError && (
                    <div style={{ color: '#f87171' }}>
                      Failed to load statement: {statementError}
                    </div>
                  )}
                  {!!statement && <pre style={styles.pre}>{statement}</pre>}
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
          ) : !loadError ? (
            <em style={styles.muted}>Loading…</em>
          ) : null}
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
              disabled={isExternal || !apiOnline || running || !selected}
              style={{
                ...styles.button,
                ...(isExternal || !apiOnline || running ? {} : styles.buttonPrimary),
              }}
              title={
                isExternal
                  ? 'Disabled for external problems'
                  : !apiOnline
                  ? 'Backend API is offline'
                  : 'Run'
              }
            >
              {running ? 'Running…' : 'Run'}
            </button>
            <button
              onClick={submit}
              disabled={isExternal || !apiOnline || !selected}
              style={styles.button}
              title={
                isExternal
                  ? 'Disabled for external problems'
                  : !apiOnline
                  ? 'Backend API is offline'
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
                  <strong>Verdict:</strong> {result.passed}/{result.total} tests
                  passed{' '}
                  {typeof result.runtime_ms === 'number'
                    ? `in ${result.runtime_ms}ms`
                    : ''}
                </div>
                <ol>
                  {result.results?.map((r, i) => (
                    <li key={i} style={{ marginTop: 8 }}>
                      <div>
                        Test #{i + 1}:{' '}
                        {r.ok ? '✅ Passed' : '❌ Failed'} ({r.status})
                      </div>
                      {r.compile_output && (
                        <pre style={styles.pre}>
                          Compile Output:
                          {'\n'}
                          {r.compile_output}
                        </pre>
                      )}
                      {r.stderr && (
                        <pre style={styles.pre}>
                          Stderr:
                          {'\n'}
                          {r.stderr}
                        </pre>
                      )}
                      {!r.ok && (
                        <>
                          <pre style={styles.pre}>
                            Input:
                            {'\n'}
                            {r.input}
                          </pre>
                          <pre style={styles.pre}>
                            Expected:
                            {'\n'}
                            {r.expected}
                          </pre>
                          <pre style={styles.pre}>
                            Got:
                            {'\n'}
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
