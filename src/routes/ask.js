'use strict';

const { Router } = require('express');
const { generate, buildPrompt } = require('../lib/ollama');
const { getPrice, getKlines } = require('../lib/market');
const cache  = require('../lib/cache');
const config = require('../config');

const router = Router();

/**
 * POST /api/ask
 * Body: {
 *   question : string   (required)
 *   history  : array    (optional, [{role:'user'|'assistant', content:string}])
 *   symbol   : string   (optional, defaults to BTCUSDT)
 *   model    : string   (optional, overrides default model)
 *   includeMarketContext : boolean (optional, default true)
 * }
 */
router.post('/', async (req, res, next) => {
  const {
    question,
    history = [],
    symbol = config.binance.symbol,
    model,
    includeMarketContext = true,
  } = req.body || {};

  // ── Validation ──────────────────────────────────────────────────
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      error: '`question` is required and must be a non-empty string',
      requestId: req.requestId,
    });
  }

  // Sanitise history: drop any turns missing role or content so Groq never
  // receives malformed messages (the most common cause of silent hangs on
  // the second request).
  const safeHistory = Array.isArray(history)
    ? history.filter(
        t => t &&
             (t.role === 'user' || t.role === 'assistant') &&
             typeof t.content === 'string' &&
             t.content.trim().length > 0
      ).map(t => ({ role: t.role, content: t.content.trim() }))
    : [];

  req.log.info(
    { symbol, model: model || config.groq.model, includeMarketContext, historyLength: safeHistory.length },
    'Ask request received'
  );

  try {
    // ── Optionally enrich with market data ───────────────────────
    let marketContext = null;

    if (includeMarketContext) {
      const sym = symbol.toUpperCase();
      const [priceData, klinesData] = await Promise.allSettled([
        getPrice(sym),
        getKlines({ symbol: sym, interval: '1h', limit: 24 }),
      ]);

      marketContext = {};

      if (priceData.status === 'fulfilled') {
        marketContext.symbol    = priceData.value.symbol;
        marketContext.price     = priceData.value.price;
        marketContext.fetchedAt = priceData.value.fetchedAt;
      } else {
        req.log.warn({ err: priceData.reason?.message }, 'Could not fetch price for context');
      }

      if (klinesData.status === 'fulfilled') {
        marketContext.klines = klinesData.value.klines;
      } else {
        req.log.warn({ err: klinesData.reason?.message }, 'Could not fetch klines for context');
      }

      if (!marketContext.price && !marketContext.klines) {
        req.log.warn('No market data obtained; proceeding without market context');
        marketContext = null;
      }
    }

    // ── Build system prompt, pass sanitised history + question ───
    const systemPrompt = buildPrompt(marketContext);
    const result = await generate(systemPrompt, safeHistory, question.trim(), model);

    req.log.info(
      { model: result.model, durationMs: result.durationMs },
      'Ask request fulfilled'
    );

    res.json({
      question:   question.trim(),
      answer:     result.answer,
      model:      result.model,
      durationMs: result.durationMs,
      marketContext: marketContext
        ? {
            symbol:      marketContext.symbol,
            price:       marketContext.price,
            fetchedAt:   marketContext.fetchedAt,
            klinesCount: marketContext.klines?.length ?? 0,
          }
        : null,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ask/symbol-change
 * Called by the frontend when the user switches trading pair.
 * Busts the cache for the old symbol so the new one is fetched fresh.
 * Body: { symbol: string }
 */
router.post('/symbol-change', (req, res) => {
  const { symbol } = req.body || {};
  if (symbol && typeof symbol === 'string') {
    const sym = symbol.toUpperCase();
    cache.invalidate(`price:${sym}`);
    cache.invalidate(`klines:${sym}:1h:24`);
    req.log.info({ symbol: sym }, 'Cache invalidated for symbol change');
  }
  res.json({ ok: true });
});

module.exports = router;
