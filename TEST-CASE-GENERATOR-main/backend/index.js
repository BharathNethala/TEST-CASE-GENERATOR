const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

const githubRoutes = require('./routes/github.js');

const backendEnv = path.resolve(__dirname, '.env');
const rootEnv = path.resolve(__dirname, '..', '.env');
const envPath = fs.existsSync(backendEnv) ? backendEnv : (fs.existsSync(rootEnv) ? rootEnv : null);
if (envPath) dotenv.config({ path: envPath }); else dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

console.log('Mounting routes from', require.resolve('./routes/github.js'));
app.use('/api/github', githubRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled backend error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Backend running on port ${port}`));
