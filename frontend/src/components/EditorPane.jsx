// src/components/EditorPane.jsx
import React from 'react';
import Editor from '@monaco-editor/react';

export default function EditorPane({ language, code, onChange }) {
  const monacoLang =
    language === 'python' ? 'python' : language === 'java' ? 'java' : 'ruby';

  return (
    <Editor
      height="100%"
      language={monacoLang}
      theme="vs-dark"
      value={code}
      onChange={(v) => onChange(v ?? '')}
      options={{ fontSize: 14, minimap: { enabled: false } }}
    />
  );
}
