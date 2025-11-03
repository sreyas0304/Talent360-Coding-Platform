// src/components/QuestionList.jsx
import React from 'react';

const styles = {
  header: {
    padding: 12,
    borderBottom: '1px solid #1f2937',
    fontWeight: 600,
  },
  item: {
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #1f2937',
  },
  active: { background: '#0b2a4a' },
  row: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  small: { color: '#9ca3af' },
};

export default function QuestionList({ questions, selectedId, onSelect }) {
  return (
    <div>
      <div style={styles.header}>
        <strong>Questions</strong> ({questions.length})
      </div>
      {questions.map((q) => {
        const isActive = q.id === selectedId;
        return (
          <div
            key={q.id}
            onClick={() => onSelect(q.id)}
            style={{
              ...styles.item,
              ...(isActive ? styles.active : {}),
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = '#111827';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={styles.row}>
              <span>{q.title}</span>
              <small style={styles.small}>{q.difficulty}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
