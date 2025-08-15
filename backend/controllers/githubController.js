// backend/controllers/githubController.js
require('dotenv').config();
const fetch = require('node-fetch'); // Node 20 has global fetch, but keeping for compatibility
const { octokit, getDefaultBranch, getHeadSha } = require('../github'); // Updated import

// --- helpers ---
const CODE_EXTS = new Set([
  'js','jsx','ts','tsx','mjs','cjs',
  'py','java','kt','kts','go','rb','php','cs','swift','rs',
  'vue','svelte','json','yml','yaml'
]);

function extOf(path) {
  const i = path.lastIndexOf('.');
  return i === -1 ? '' : path.slice(i + 1).toLowerCase();
}

// robust, recursive file listing via git tree API
async function listAllFiles(owner, repo) {
  const defaultBranch = await getDefaultBranch(owner, repo);
  const headSha = await getHeadSha(owner, repo, defaultBranch);
  const tree = await octokit.git.getTree({
    owner, repo, tree_sha: headSha, recursive: 'true'
  });
  const files = (tree.data.tree || [])
    .filter(entry => entry.type === 'blob')
    .map(entry => entry.path)
    .filter(p => CODE_EXTS.has(extOf(p)));

  return files;
}

async function getFileContent(owner, repo, filePath) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
    if (Array.isArray(data)) throw new Error(`'${filePath}' is a directory, not a file`);
    if (data && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    if (data && data.download_url) {
      const r = await fetch(data.download_url);
      if (!r.ok) throw new Error(`Failed to download ${filePath}: ${r.status}`);
      return await r.text();
    }
    throw new Error(`No content for ${filePath}`);
  } catch (e) {
    if (e.status === 404) {
      throw new Error(`GitHub 404 for ${filePath}. Check ${owner}/${repo}/${filePath}`);
    }
    throw e;
  }
}

// --- controllers ---

// 1) List files
async function listFiles(req, res) {
  try {
    const { owner, repo } = req.body || {};
    if (!owner || !repo) return res.status(400).json({ error: 'Owner and repo are required' });
    const files = await listAllFiles(owner, repo);
    if (!files.length) {
      return res.status(200).json({ files: [], note: 'No matching code files found' });
    }
    res.json({ files });
  } catch (err) {
    console.error('Error listing files:', err.response?.data || err.message || err);
    if (String(err).includes('404')) {
      return res.status(404).json({
        error: 'Repository or path not found.',
        hint: 'Verify owner/repo and token permissions.'
      });
    }
    res.status(500).json({ error: 'Failed to list files', detail: err.message });
  }
}

// 2) Generate summaries
async function generateSummaries(req, res) {
  try {
    const { files = [], owner, repo, framework } = req.body || {};
    if (!owner || !repo) return res.status(400).json({ error: 'Owner and repo are required' });
    if (!files.length) return res.status(400).json({ error: 'No files selected' });

    let context = '';
    for (const p of files) {
      const content = await getFileContent(owner, repo, p);
      context += `\n\n// FILE: ${p}\n${content}`;
      if (context.length > 15000) break;
    }

    const prompt = `
You are a test case generator AI.
Framework preference: ${framework || 'Not specified'}.
Read the code below and produce a clear bullet list (5-12 bullets)
of specific, high-value test cases. Keep each bullet short (one line).

${context}
`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiData.error?.message || 'AI API request failed');

    const raw = (aiData.choices?.[0]?.message?.content || '').trim();
    const summaries = raw.split('\n')
      .map(line => line.replace(/^\s*[-*]\s*/, '').trim())
      .filter(Boolean);

    res.json({ summaries });
  } catch (err) {
    console.error('Error generating summaries:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to generate summaries', detail: err.message });
  }
}

// 3) Generate code
async function generateCode(req, res) {
  try {
    const { summary, framework, files = [], owner, repo } = req.body || {};
    if (!summary) return res.status(400).json({ error: 'Summary is required' });
    if (!owner || !repo) return res.status(400).json({ error: 'Owner and repo are required' });

    let context = '';
    for (const p of files) {
      const content = await getFileContent(owner, repo, p);
      context += `\n\n// FILE: ${p}\n${content}`;
      if (context.length > 15000) break;
    }

    const prompt = `
Generate a complete ${framework || 'Playwright'} test file that implements:
"${summary}"

Use best practices for the chosen framework. Include all necessary imports and setup.
Target the code context below when possible. Output ONLY the code.

${context}
`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiData.error?.message || 'AI API request failed');

    const code = (aiData.choices?.[0]?.message?.content || '').trim();
    res.json({ code });
  } catch (err) {
    console.error('Error generating code:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to generate code', detail: err.message });
  }
}

// 4) Create PR (Updated)
async function createPr(req, res) {
  try {
    const { owner, repo, code, filePath } = req.body || {};
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo are required' });
    }
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const path = filePath?.trim() || `tests/generated/test-${Date.now()}.spec.ts`;

    const baseBranch = await getDefaultBranch(owner, repo);
    const headSha = await getHeadSha(owner, repo, baseBranch);
    const branchName = `ai-test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    console.log("=== Creating PR Debug ===");
    console.log({ owner, repo, baseBranch, headSha, branchName, path });

    console.log("➡ Creating branch...");
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: headSha
    });

    console.log("➡ Creating/Updating file...");
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: 'Add AI-generated test case',
      content: Buffer.from(code).toString('base64'),
      branch: branchName
    });

    console.log("➡ Creating pull request...");
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: 'Add AI-generated test case',
      head: branchName,
      base: baseBranch,
      body: 'This PR adds an AI-generated test case.'
    });

    console.log("✅ Pull request created:", pr.data.html_url);
    res.json({ prUrl: pr.data.html_url });

  } catch (err) {
    console.error("❌ Error creating PR:", err.response?.data || err.message || err);

    if (String(err.message || '').includes('Reference already exists')) {
      return res.status(409).json({ error: 'Branch already exists. Try again.' });
    }

    res.status(500).json({
      error: 'Failed to create PR',
      detail: err.response?.data || { message: err.message || String(err) }
    });
  }
}

module.exports = {
  listFiles,
  generateSummaries,
  generateCode,
  createPr
};
