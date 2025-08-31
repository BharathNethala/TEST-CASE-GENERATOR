const { Octokit } = require('@octokit/rest');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const backendEnv = path.resolve(__dirname, '.env');
const rootEnv = path.resolve(__dirname, '..', '.env');
const envPath = fs.existsSync(backendEnv)
  ? backendEnv
  : fs.existsSync(rootEnv)
  ? rootEnv
  : null;

if (envPath) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded .env from: ${envPath}`);
} else {
  dotenv.config();
}

if (!process.env.GITHUB_TOKEN) {
  console.error('❌ Missing GITHUB_TOKEN in environment variables');
  process.exit(1);
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function getDefaultBranch(owner, repo) {
  const repoMeta = await octokit.repos.get({ owner, repo });
  return repoMeta.data.default_branch;
}

async function getHeadSha(owner, repo, branch) {
  const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  return ref.data.object.sha;
}

async function listRepoFiles(owner, repo) {
  const files = [];

  async function walkDir(dir) {
    const { data: items } = await octokit.repos.getContent({ owner, repo, path: dir });
    for (const item of items) {
      if (item.type === 'file') {
        files.push(item.path);
      } else if (item.type === 'dir') {
        await walkDir(item.path);
      }
    }
  }

  const { data } = await octokit.repos.getContent({ owner, repo, path: '' });
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.type === 'file') {
        files.push(item.path);
      } else if (item.type === 'dir') {
        await walkDir(item.path);
      }
    }
  }

  return files;
}

async function getFileContent(owner, repo, filePath) {
  const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
  if (data.encoding !== 'base64') {
    throw new Error(`Unsupported encoding for ${filePath}`);
  }
  return Buffer.from(data.content, 'base64').toString('utf8');
}

async function createBranch(owner, repo, newBranch) {
  const baseBranch = await getDefaultBranch(owner, repo);
  const headSha = await getHeadSha(owner, repo, baseBranch);

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranch}`,
    sha: headSha,
  });
}

async function createBranchWithFile(owner, repo, branch, filePath, content, commitMessage) {
  const encodedContent = Buffer.from(content).toString('base64');

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: commitMessage,
    content: encodedContent,
    branch,
  });
}

async function createPullRequest(owner, repo, branch, title, body) {
  const baseBranch = await getDefaultBranch(owner, repo);
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    head: branch,
    base: baseBranch,
    title,
    body,
  });
  return pr.html_url;
}

module.exports = {
  octokit,
  getDefaultBranch,
  getHeadSha,
  listRepoFiles,
  getFileContent,
  createBranch,
  createBranchWithFile,
  createPullRequest,
};
