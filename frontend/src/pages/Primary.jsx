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

const PROBLEMS_API = (import.meta.env?.VITE_PROBLEMS_API ?? '/api/v1/problems/').trim();

function tierFromDifficultyStr(d) {
  const v = String(d || '').toLowerCase();
  if (v === 'hard') return 'Hard';
  if (v === 'medium') return 'Medium';
  return 'Easy';
  }

function Category({ cat, open, onToggle }) {
  return (
    <div style={styles.category}>
      <div style={styles.catHeader} onClick={onToggle}>
        <div style={{ ...styles.chevron, ...(open ? styles.chevronOpen : {}) }} />
        <div style={{ display: 'grid' }}>
          <span style={styles.catTitle}>{cat.title}</span>
          {!!cat.desc && <span style={styles.catDesc}>{cat.desc}</span>}
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
          <div style={styles.small}>Showing up to {cat.limitPerLevel} per difficulty • Source: Local API</div>
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
        const res = await fetch(PROBLEMS_API, { mode: 'cors' });
       if (!res.ok) throw new Error(`Problems fetch failed: ${res.status}`);
       const raw = await res.json(); // expects an array of { slug, title, difficulty, categories[] }

       // Build dynamic categories from the response
       // catName -> { Easy:[], Medium:[], Hard:[] }
       const bucket = new Map();
       for (const item of raw || []) {
         const title = item.title || item.slug;
         const id = item.slug || title.replace(/\s+/g, '-').toLowerCase();
         const lvl = tierFromDifficultyStr(item.difficulty);
         const catNames = Array.isArray(item.categories) ? item.categories : [];

         for (const name of catNames) {
           const key = String(name || '').trim();
           if (!key) continue;
           if (!bucket.has(key)) {
             bucket.set(key, { key, title: key, desc: '', groups: { Easy: [], Medium: [], Hard: [] } });
           }
           const entry = bucket.get(key);
           if (entry.groups[lvl].length < limitPerLevel) {
             entry.groups[lvl].push({
               id,                 // we'll use slug as the route param
               title,
               difficulty: lvl,
               // keep a hint of origin for future use
               source: 'local',
             });
           }
         }
       }

       // Sort categories and freeze list
       const built = Array.from(bucket.values()).sort((a, b) =>
         a.title.localeCompare(b.title)
       );
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
          <h1 style={styles.h1}>Practice Categories (Local API)</h1>
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
