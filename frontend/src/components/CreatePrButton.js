import React, { useState } from 'react';

export default function CreatePrButton({ code, owner, repo }) {
  const [loading, setLoading] = useState(false);
  const [prUrl, setPrUrl] = useState(null);
  const [error, setError] = useState(null);

  async function handleCreatePr() {
    if (!code || !owner || !repo) {
      setError('Missing code, owner, or repo');
      return;
    }
    const ok = window.confirm(`Create a PR to ${owner}/${repo}?`);
    if (!ok) return;

    setLoading(true);
    setError(null);
    setPrUrl(null);
    try {
      const res = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          code,
          filePath: `tests/generated/ai.test.${Date.now()}.spec.js`
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ? JSON.stringify(data.detail) : data.error || 'Failed to create PR');
      }
      setPrUrl(data.prUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
      <button
        className="btn"
        onClick={handleCreatePr}
        disabled={loading || !code || !owner || !repo}
        style={{
          backgroundColor: '#61dafb',
          color: '#1e1e1e',
          padding: '10px 16px',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer',
          border: 'none'
        }}
      >
        {loading ? 'Creating PR…' : '🚀 Create Pull Request'}
      </button>

      {error && (
        <div
          style={{
            backgroundColor: '#2a2a2a',
            color: '#ff6b6b',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ff6b6b'
          }}
        >
          ❌ {error}
        </div>
      )}

      {prUrl && (
        <div
          style={{
            backgroundColor: '#1e1e1e',
            color: '#f5f5f5',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '1px solid #333'
          }}
        >
          ✅ PR Created:&nbsp;
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#61dafb', textDecoration: 'underline' }}
          >
            {prUrl}
          </a>
        </div>
      )}
    </div>
  );
}
