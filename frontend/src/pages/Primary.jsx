// src/pages/Primary.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#e5e7eb',
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    padding: '24px',
  },
  container: { maxWidth: 1100, margin: '0 auto' },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  h1: { margin: 0, fontSize: 28 },
  action: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 999,
    background: '#2563eb',
    color: '#fff',
    border: '1px solid #2563eb',
    textDecoration: 'none',
  },
  category: {
    background: '#0b1220',
    border: '1px solid #1f2937',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  catHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    cursor: 'pointer',
  },
  chevron: {
    width: 10,
    height: 10,
    borderRight: '2px solid #9ca3af',
    borderBottom: '2px solid #9ca3af',
    transform: 'rotate(-45deg)',
    transition: 'transform 150ms',
  },
  chevronOpen: { transform: 'rotate(45deg)' },
  catTitle: { fontSize: 18, fontWeight: 600 },
  catDesc: { color: '#9ca3af', fontSize: 13 },
  catBody: { padding: 16, borderTop: '1px solid #1f2937' },
  groupTitle: { fontWeight: 600, margin: '8px 0 6px' },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid #1f2937',
    background: '#111827',
    color: '#e5e7eb',
    textDecoration: 'none',
    fontSize: 14,
  },
  badge: {
    fontSize: 11,
    padding: '2px 6px',
    borderRadius: 6,
    background: '#0b2a4a',
    color: '#cfe8ff',
    border: '1px solid #1f2937',
  },
  small: { color: '#9ca3af', fontSize: 12 },
  err: { color: '#fca5a5', fontSize: 14 },
};

const CF_ENDPOINT = 'https://codeforces.com/api/problemset.problems';

// Our categories mapped to Codeforces tags (case sensitive as returned)
const CF_CATEGORIES = [
  { key: 'strings', title: 'Strings', desc: 'Parsing, hashing, substrings', tags: ['strings'] },
  { key: 'dp', title: 'Dynamic Programming', desc: 'Knapsack, paths, states', tags: ['dp'] },
  { key: 'graphs', title: 'Graphs', desc: 'DFS/BFS, trees, shortest paths', tags: ['graphs', 'trees', 'dfs and similar', 'shortest paths'] },
  { key: 'math', title: 'Math & Number Theory', desc: 'Number theory, combinatorics', tags: ['math', 'number theory', 'combinatorics'] },
  { key: 'greedy', title: 'Greedy & Binary Search', desc: 'Greedy choices and searching', tags: ['greedy', 'binary search', 'two pointers'] },
  { key: 'impl', title: 'Implementation & Brute Force', desc: 'Simulations, constructive', tags: ['implementation', 'brute force', 'constructive algorithms'] },
];

function tierFromRating(r) {
  if (r == null) return 'Easy';
  if (r < 1200) return 'Easy';
  if (r < 1800) return 'Medium';
  return 'Hard';
}

function Category({ cat, open, onToggle }) {
  return (
    <div style={styles.category}>
      <div style={styles.catHeader} onClick={onToggle}>
        <div style={{ ...styles.chevron, ...(open ? styles.chevronOpen : {}) }} />
        <div style={{ display: 'grid' }}>
          <span style={styles.catTitle}>{cat.title}</span>
          <span style={styles.catDesc}>{cat.desc}</span>
        </div>
      </div>
      {open && (
        <div style={styles.catBody}>
          {['Easy', 'Medium', 'Hard'].map((lvl) => (
            <div key={lvl} style={{ marginBottom: 12 }}>
              <div style={styles.groupTitle}>{lvl}</div>
              <div style={styles.pillRow}>
                {(cat.groups[lvl] || []).map((p) => (
                  <Link
                    key={p.id}
                    to={`/play/${p.id}`}
                    state={{ externalProblem: p }}
                    style={styles.pill}
                    title={`Open ${p.title}`}
                  >
                    <span>{p.title}</span>
                    <span style={styles.badge}>{lvl}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div style={styles.small}>
            Showing up to {cat.limitPerLevel} per difficulty • Source: Codeforces
          </div>
        </div>
      )}
    </div>
  );
}

export default function Primary() {
  const navigate = useNavigate();
  const [cats, setCats] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(() => new Set());
  const limitPerLevel = 10;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(CF_ENDPOINT);
        if (!res.ok) throw new Error(`CF fetch failed: ${res.status}`);
        const json = await res.json();
        if (json.status !== 'OK') throw new Error('CF API status not OK');

        const problems = json.result.problems || [];
        // Map to internal shape
        const mapped = problems
          .filter((p) => p.contestId && p.index && p.name) // basic sanity
          .map((p) => ({
            id: `${p.contestId}-${p.index}`,
            title: p.name,
            rating: p.rating ?? null,
            tags: p.tags || [],
            url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
            source: 'codeforces',
          }));

        // Build categories using tag inclusion
        const built = CF_CATEGORIES.map((c) => {
          const inCat = mapped.filter((m) =>
            m.tags.some((t) => c.tags.includes(t))
          );
          // Bucket by difficulty
          const groups = { Easy: [], Medium: [], Hard: [] };
          for (const m of inCat) {
            const lvl = tierFromRating(m.rating);
            if (groups[lvl].length < limitPerLevel) {
              groups[lvl].push({
                id: m.id,
                title: m.title,
                difficulty: lvl,
                url: m.url,
                rating: m.rating,
                tags: m.tags,
              });
            }
          }
          return { key: c.key, title: c.title, desc: c.desc, groups, limitPerLevel };
        });

        if (alive) setCats(built);
      } catch (e) {
        if (alive) setErr(String(e?.message || e));
      }
    })();
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => cats || [], [cats]);

  function toggle(key) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <h1 style={styles.h1}>Practice Categories (Codeforces)</h1>
          <Link to="/play" style={styles.action}>Open Playground</Link>
        </div>

        {err && <div style={styles.err}>Failed to load problems: {err}</div>}
        {!err && !categories.length && <div style={styles.small}>Loading problems…</div>}

        {categories.map((cat) => (
          <Category
            key={cat.key}
            cat={cat}
            open={open.has(cat.key)}
            onToggle={() => toggle(cat.key)}
          />
        ))}
      </div>
    </div>
  );
}
