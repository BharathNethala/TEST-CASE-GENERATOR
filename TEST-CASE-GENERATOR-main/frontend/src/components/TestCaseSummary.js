import React from 'react';

export default function TestCaseSummary({
  summaries = [],
  selectedSummary,
  setSelectedSummary,
  onGenerateCode,
  loading,
  canGenerate
}) {
  return (
    <div>
      {(!summaries || summaries.length === 0) && (
        <p className="subtle">Run “Generate Summaries” after selecting files.</p>
      )}

      <div className="list">
        {summaries.map((s, idx) => {
          const checked = selectedSummary === s;
          return (
            <label key={idx} className="list-item" style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name="summary"
                checked={checked}
                onChange={() => setSelectedSummary(s)}
              />
              <span style={{ whiteSpace: 'pre-wrap' }}>{s}</span>
            </label>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
        <button className="btn" onClick={onGenerateCode} disabled={loading || !canGenerate}>
          {loading ? 'Generating code…' : 'Generate Test Code'}
        </button>
      </div>
    </div>
  );
}
