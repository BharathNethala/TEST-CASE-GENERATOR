// backend/index.js
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

// NOTE: force the exact file, avoid loading a folder index.js by mistake
const githubRoutes = require('./routes/github.js');

// Load env early
const backendEnv = path.resolve(__dirname, '.env');
const rootEnv = path.resolve(__dirname, '..', '.env');
const envPath = fs.existsSync(backendEnv) ? backendEnv : (fs.existsSync(rootEnv) ? rootEnv : null);
if (envPath) dotenv.config({ path: envPath }); else dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health check route
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Confirm which routes file is mounted
console.log('Mounting routes from', require.resolve('./routes/github.js'));
app.use('/api/github', githubRoutes);

// Global error handler (prevents "Network Error" with no message)
app.use((err, req, res, next) => {
  console.error('Unhandled backend error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Backend running on port ${port}`));
