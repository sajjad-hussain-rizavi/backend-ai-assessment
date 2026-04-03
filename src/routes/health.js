'use strict';

const { Router } = require('express');
const { pingOllama } = require('../lib/ollama');
const config = require('../config');

const router = Router();

/**
 * GET /api/health
 * Returns overall service health and Ollama reachability.
 */
router.get('/', async (req, res, next) => {
  try {
    const ollamaStatus = await pingOllama();

    req.log.info({ ollamaStatus }, 'Health check complete');

    res.json({
      ok: true,
      service: 'btc-ai-backend',
      groq: ollamaStatus,
      model: config.groq.model,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
