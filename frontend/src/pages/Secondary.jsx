// src/pages/Play.jsx  (Secondary page)
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import QuestionList from '../components/QuestionList.jsx';
import EditorPane from '../components/EditorPane.jsx';
import { templates } from '../lib/languageTemplates.js';

const API = 'http://localhost:8000/api';

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    height: '100vh',
    background: '#0f172a',
    color: '#e5e7eb',
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  },
  left: { borderRight: '1px solid #1f2937', overflow: 'auto', background: '#0b1220' },
  right: { display: 'flex', flexDirection: 'column' },
  prompt: { padding: 12, borderBottom: '1px solid #1f2937', whiteSpace: 'pre-wrap' },
  toolbar: {
    padding: 8,
    borderBottom: '1px solid #1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#0b1220',
  },
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
    border: '1px solid  #1f2937',
    padding: 8,
    borderRadius: 8,
    overflow: 'auto',
  },
  muted: { color: '#9ca3af' },
};

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
  const [questions, setQuestions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(templates.python);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet('/questions');
        setQuestions(data);
        const initial =
          (qid && data.find((q) => q.id === qid)?.id) || (data[0] && data[0].id) || null;
        setSelectedId(initial);
      } catch (e) {
        setLoadError(String(e.message || e));
      }
    })();
  }, [qid]);

  useEffect(() => {
    setCode(templates[language]);
  }, [language, selectedId]);

  const selected = useMemo(
    () => questions.find((q) => q.id === selectedId),
    [questions, selectedId]
  );

  async function run() {
    if (!selected) return;
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
    if (!selected) return;
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
    <div style={styles.container}>
      <div style={styles.left}>
        <QuestionList
          questions={questions}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      <div style={styles.right}>
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'auto auto 1fr auto auto',
            height: '100%',
            background: '#0b1220',
          }}
        >
          <div style={{ ...styles.prompt, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/" style={{ color: '#93c5fd', textDecoration: 'none' }}>
              ← Back to Categories
            </Link>
          </div>

          <div style={styles.prompt}>
            {loadError && (
              <div style={{ color: '#f87171' }}>
                Failed to load questions: {loadError}
              </div>
            )}
            {!loadError && selected ? (
              <>
                <h3 style={{ margin: '4px 0' }}>{selected.title}</h3>
                <p style={{ marginTop: 8 }}>{selected.prompt}</p>
                <p>
                  <strong>Input:</strong> {selected.inputFormat}
                </p>
                <p>
                  <strong>Output:</strong> {selected.outputFormat}
                </p>
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
              </>
            ) : !loadError ? (
              <em style={styles.muted}>Loading…</em>
            ) : null}
          </div>

          <div style={styles.toolbar}>
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
            <div style={{ flex: 1 }} />
          </div>

          <div style={{ height: '100%' }}>
            <EditorPane language={language} code={code} onChange={setCode} />
          </div>

          <div style={styles.actions}>
            <button
              onClick={run}
              disabled={running || !selected}
              style={{
                ...styles.button,
                ...(running ? {} : styles.buttonPrimary),
              }}
            >
              {running ? 'Running…' : 'Run'}
            </button>
            <button onClick={submit} disabled={!selected} style={styles.button}>
              Submit
            </button>
            {result?.error && (
              <span style={{ color: '#f87171', marginLeft: 12 }}>
                {String(result.error)}
              </span>
            )}
          </div>

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
