'use strict';

const { Router } = require('express');
const { generate, buildPrompt } = require('../lib/ollama');
const { getPrice, getKlines } = require('../lib/market');
const config = require('../config');

const router = Router();

/**
 * POST /api/ask
 * Body: {
 *   question : string   (required)
 *   history  : array    (optional, [{role, content}])
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

  req.log.info(
    { symbol, model: model || config.groq.model, includeMarketContext, historyLength: history.length },
    'Ask request received'
  );

  try {
    // ── Optionally enrich with market data ───────────────────────
    let marketContext = null;

    if (includeMarketContext) {
      const [priceData, klinesData] = await Promise.allSettled([
        getPrice(symbol.toUpperCase()),
        getKlines({ symbol: symbol.toUpperCase(), interval: '1h', limit: 24 }),
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

    // ── Build system prompt, pass history + question separately ──
    const systemPrompt = buildPrompt(marketContext);
    const result = await generate(systemPrompt, history, question.trim(), model);

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

module.exports = router;
