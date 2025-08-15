import React, { useMemo, useState } from 'react';

export default function FileList({ files = [], selected = [], onToggle, onSelectAll, onClear, loading }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!q) return files;
    const s = q.toLowerCase();
    return files.filter(f => f.toLowerCase().includes(s));
  }, [q, files]);

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <input
          className="input"
          placeholder="Search files…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <button className="btn btn-secondary" onClick={onSelectAll} disabled={loading || !files.length}>
          Select All
        </button>
        <button className="btn btn-secondary" onClick={onClear} disabled={!selected.length}>
          Clear
        </button>
      </div>

      <div className="list">
        {loading && <div className="subtle">Loading files…</div>}
        {!loading && !filtered.length && <div className="subtle">No files.</div>}
        {filtered.map(path => {
          const checked = selected.includes(path);
          return (
            <label key={path} className="list-item" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(path)}
              />
              <span style={{ wordBreak: 'break-all' }}>{path}</span>
            </label>
          );
        })}
      </div>

      <div style={{ marginTop: 10 }} className="subtle">
        Selected: <strong>{selected.length}</strong>
      </div>
    </>
  );
}
