const express = require('express');
const router = express.Router();

const controller = require('../controllers/githubController');

router.post('/list-files', controller.listFiles);
router.post('/generate-summaries', controller.generateSummaries);
router.post('/generate-code', controller.generateCode);
router.post('/create-pr', controller.createPr);

module.exports = router;
