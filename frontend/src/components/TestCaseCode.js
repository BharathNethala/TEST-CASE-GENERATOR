import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CreatePrButton from './CreatePrButton';

export default function TestCaseCode({ code, framework, owner, repo }) {
  if (!code) {
    return <p className="subtle">Generate a test to preview code and create a PR.</p>;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    alert('✅ Test code copied to clipboard!');
  };

  return (
    <div>
      <div className="code-block">
        <div className="code-actions">
          <span className="badge">{framework || 'Test'}</span>
          <button className="btn btn-secondary" onClick={handleCopy}>📋 Copy</button>
        </div>
        <SyntaxHighlighter
          language="javascript"
          style={coy}
          customStyle={{ margin: 0, padding: 16, background: 'transparent' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      <div style={{ marginTop: 12 }}>
        <CreatePrButton code={code} owner={owner} repo={repo} />
      </div>
    </div>
  );
}
