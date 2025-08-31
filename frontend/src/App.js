import React, { useState } from 'react';
import './index.css';
import FileList from './components/FileList';
import TestCaseSummary from './components/TestCaseSummary';
import TestCaseCode from './components/TestCaseCode';

const API = '/api/github';

export default function App() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [framework, setFramework] = useState('Jest');

  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  const [selectedSummary, setSelectedSummary] = useState('');
  const [code, setCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

  const [error, setError] = useState(null);

  async function fetchFiles() {
    setError(null);
    setLoadingFiles(true);
    setFiles([]);
    setSelectedFiles([]);
    try {
      const res = await fetch(`${API}/list-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Failed to list files');
      setFiles(data.files || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function generateSummaries() {
    setError(null);
    setLoadingSummaries(true);
    setSummaries([]);
    setSelectedSummary('');
    setCode('');
    try {
      const res = await fetch(`${API}/generate-summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, files: selectedFiles, framework })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Failed to generate summaries');
      setSummaries(data.summaries || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSummaries(false);
    }
  }

  async function generateCode() {
    if (!selectedSummary) return;
    setError(null);
    setLoadingCode(true);
    setCode('');
    try {
      const res = await fetch(`${API}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          summary: selectedSummary,
          framework,
          files: selectedFiles
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Failed to generate code');
      setCode(data.code || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingCode(false);
    }
  }

  const canSummarize = owner && repo && selectedFiles.length > 0 && !loadingSummaries;
  const canCode = selectedSummary && !loadingCode;

  return (
    <div className="container">
      
      {/* Heading Section - now full width centered */}
      <div style={{ width: '100%', textAlign: 'center', marginBottom: 18 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
          AI-Powered Test Case Generator
        </h1>
        <p style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1rem' }}>
          Generate and submit AI-driven test cases directly to your GitHub repository
        </p>
      </div>

      {/* Search Bar Card */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="header" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '20px' }}>
          <div style={{ minWidth: '200px' }}>
            <label className="subtle">GitHub Owner</label>
            <input
              className="input"
              placeholder="e.g. BharathNethala"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              style={{ marginTop: '5px' }}
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <label className="subtle">Repository</label>
            <input
              className="input"
              placeholder="e.g. ReelsClone"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              style={{ marginTop: '5px' }}
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <label className="subtle">Framework</label>
            <select
              className="select"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              style={{ marginTop: '5px' }}
            >
              <option>Jest</option>
              <option>React Testing Library</option>
              <option>Playwright</option>
              <option>Selenium</option>
              <option>PyTest</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn"
              onClick={fetchFiles}
              disabled={loadingFiles || !owner || !repo}
            >
              {loadingFiles ? 'Loading files...' : 'Load Files'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-err" style={{ marginTop: '20px' }}>❌ {error}</div>}
      </div>

      {/* File Selection and Summary */}
      <div className="grid">
        <div className="card">
          <div className="card-title">
            1) Select Files <span className="badge">{files.length} files</span>
          </div>
          <FileList
            files={files}
            selected={selectedFiles}
            onToggle={(path) =>
              setSelectedFiles((prev) =>
                prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
              )
            }
            onSelectAll={() => setSelectedFiles(files)}
            onClear={() => setSelectedFiles([])}
            loading={loadingFiles}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <button className="btn" disabled={!canSummarize} onClick={generateSummaries}>
              {loadingSummaries ? 'Generating...' : 'Generate Summaries'}
            </button>
            <span className="subtle">Select multiple files to improve context.</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">2) Pick a Summary</div>
          <TestCaseSummary
            summaries={summaries}
            selectedSummary={selectedSummary}
            setSelectedSummary={setSelectedSummary}
            onGenerateCode={generateCode}
            loading={loadingSummaries || loadingCode}
            canGenerate={!!canCode}
          />
        </div>
      </div>

      <div style={{ height: 18 }} />

      {/* Generated Test Code */}
      <div className="card">
        <div className="card-title">3) Generated Test Code</div>
        <TestCaseCode code={code} framework={framework} owner={owner} repo={repo} />
      </div>
    </div>
  );
}
