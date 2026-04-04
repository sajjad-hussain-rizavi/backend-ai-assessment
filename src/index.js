'use strict';

require('dotenv').config();

const express = require('express');
const config  = require('./config');
const logger  = require('./logger');

const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler  } = require('./middleware/errorHandler');

const healthRouter = require('./routes/health');
const marketRouter = require('./routes/market');
const askRouter    = require('./routes/ask');
const chatRouter   = require('./routes/chat');

// ─────────────────────────────────────────────────────────────────
// App setup
// ─────────────────────────────────────────────────────────────────
const app = express();

// Trust proxy headers (needed when behind nginx)
app.set('trust proxy', 1);

// Parse JSON bodies
app.use(express.json());

// Allow browser requests from any origin (needed for Railway deployment)
// Also set Connection: keep-alive explicitly so Railway's proxy doesn't
// silently drop the socket between requests.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Connection', 'keep-alive');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Attach requestId + per-request child logger + finish-time logging
app.use(requestLogger);

// ─────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────
// API routes first — must come before '/' or chatRouter swallows everything
app.use('/api/health', healthRouter);
app.use('/api/market', marketRouter);
app.use('/api/ask',    askRouter);

// Chat UI last — only serves GET /
app.use('/',           chatRouter);

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    requestId: req.requestId,
  });
});

// Central error handler (must be last)
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.env,
      groqModel: config.groq.model,
      binanceUrl: config.binance.baseUrl,
    },
    `BTC AI Backend listening on port ${config.port}`
  );
  // Explicitly confirm the API key is present at startup — a missing key
  // causes silent failures on message 2+ when the axios header was baked at boot.
  if (!config.groq.apiKey) {
    logger.error('GROQ_API_KEY is not set — all AI requests will fail');
  } else {
    logger.info({ keyPrefix: config.groq.apiKey.slice(0, 8) + '...' }, 'Groq API key loaded');
  }
});

// Graceful shutdown
function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received — closing server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit if connections don't drain in time
  setTimeout(() => {
    logger.warn('Forcing process exit after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app; // exported for testing
