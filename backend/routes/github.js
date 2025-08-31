// backend/routes/github.js
const express = require('express');
const router = express.Router();

// NOTE: this path matches your zip structure
const controller = require('../controllers/githubController');

// Do NOT call the functions here — just pass references
router.post('/list-files', controller.listFiles);
router.post('/generate-summaries', controller.generateSummaries);
router.post('/generate-code', controller.generateCode);
router.post('/create-pr', controller.createPr);

module.exports = router;
