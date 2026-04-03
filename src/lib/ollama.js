'use strict';

const axios  = require('axios');
const config = require('../config');
const logger = require('../logger');

/** Reusable axios instance scoped to Groq */
const client = axios.create({
  baseURL: 'https://api.groq.com',
  timeout: config.groq.timeoutMs,
  headers: {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${config.groq.apiKey}`,
  },
});

/**
 * Verify Groq is reachable and the API key is valid.
 * @returns {Promise<"reachable"|"unreachable">}
 */
async function pingOllama() {
  if (!config.groq.apiKey) {
    logger.warn('GROQ_API_KEY is not set');
    return 'unreachable';
  }
  try {
    await client.get('/openai/v1/models', { timeout: 5000 });
    return 'reachable';
  } catch {
    return 'unreachable';
  }
}

/**
 * Send a conversation to Groq using proper multi-turn messages.
 *
 * @param {string}  systemPrompt  - System/context text (market data etc.)
 * @param {Array}   history       - Prior turns [{role:'user'|'assistant', content:string}]
 * @param {string}  question      - The current user question
 * @param {string}  [model]       - Override the default model
 * @returns {Promise<{ answer: string, model: string, durationMs: number }>}
 */
async function generate(systemPrompt, history, question, model = config.groq.model) {
  const log = logger.child({ fn: 'generate', model });
  const t0  = Date.now();

  // Proper multi-turn message array — history is real turns, not a flattened string
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: question },
  ];

  log.info({ messageCount: messages.length }, 'Sending messages to Groq');

  try {
    const { data } = await client.post('/openai/v1/chat/completions', {
      model,
      messages,
    });

    const durationMs = Date.now() - t0;
    const answer     = data.choices?.[0]?.message?.content || '';

    log.info(
      {
        durationMs,
        promptTokens:     data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
      'Groq generation complete'
    );

    return {
      answer:    answer.trim(),
      model:     data.model || model,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - t0;
    log.error(
      { durationMs, err: err.message, status: err.response?.status },
      'Groq generation failed'
    );
    throw normaliseError(err);
  }
}

/**
 * Build the system prompt: persona + optional live market context.
 * History and question are now passed separately to generate().
 *
 * @param {Object} [marketContext]
 * @returns {string}
 */
function buildPrompt(marketContext) {
  const lines = [
    'You are a knowledgeable cryptocurrency market analyst assistant.',
    'Answer the user question concisely and factually.',
    'You have access to live market data provided below.',
    'When referencing prices or trends, use the data provided.',
    '',
  ];

  if (marketContext) {
    const { symbol, price, klines, fetchedAt } = marketContext;

    if (price) {
      lines.push(`## Live Market Data (as of ${fetchedAt || 'now'})`);
      lines.push(`- Symbol : ${symbol || 'BTCUSDT'}`);
      lines.push(`- Current price : $${price}`);
      lines.push('');
    }

    if (klines?.length > 0) {
      const recent = klines.slice(-5);
      lines.push(`## Recent Klines (last ${recent.length} candles)`);
      lines.push('openTime | open | high | low | close | volume');
      for (const k of recent) {
        lines.push(
          `${k.openTime} | ${k.open} | ${k.high} | ${k.low} | ${k.close} | ${k.volume}`
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function normaliseError(err) {
  const status  = err.response?.status || 502;
  const message =
    err.code === 'ECONNABORTED'
      ? 'Groq request timed out'
      : err.response?.status === 401
        ? 'Invalid Groq API key — check GROQ_API_KEY in your .env'
        : err.response?.status === 429
          ? 'Groq rate limit hit — slow down or upgrade your plan'
          : err.response?.data?.error?.message || err.message || 'Groq request failed';

  return Object.assign(new Error(message), { status });
}

module.exports = { pingOllama, generate, buildPrompt };
