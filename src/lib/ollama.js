'use strict';

const https  = require('https');
const config = require('../config');
const logger = require('../logger');

/**
 * Make a POST request to the Groq API using Node's built-in https.
 * Reads the API key fresh on every call — no stale module-load state.
 * Sets a hard socket timeout so a slow/hung response never blocks forever.
 */
function groqPost(path, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);

    const req = https.request({
      hostname: 'api.groq.com',
      path,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization':  `Bearer ${config.groq.apiKey}`,
      },
    }, res => {
      // Hard timeout on the response stream itself
      res.setTimeout(timeoutMs, () => {
        req.destroy(new Error('Groq response stream timed out'));
      });

      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          reject(new Error(`Groq returned non-JSON (HTTP ${res.statusCode}): ${raw.slice(0, 200)}`));
        }
      });
    });

    // Hard timeout on the whole request (connection + response)
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Groq request timed out'));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

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
    const { status } = await groqPost('/openai/v1/models', {}, 5000);
    return status < 500 ? 'reachable' : 'unreachable';
  } catch {
    return 'unreachable';
  }
}

/**
 * Send a conversation to Groq using proper multi-turn messages.
 *
 * @param {string}  systemPrompt
 * @param {Array}   history       [{role:'user'|'assistant', content:string}]
 * @param {string}  question
 * @param {string}  [model]
 * @returns {Promise<{ answer: string, model: string, durationMs: number }>}
 */
async function generate(systemPrompt, history, question, model = config.groq.model) {
  const log = logger.child({ fn: 'generate', model });
  const t0  = Date.now();

  const messages = [
    { role: 'system',    content: systemPrompt },
    ...history,
    { role: 'user',      content: question     },
  ];

  log.info({ messageCount: messages.length }, 'Sending messages to Groq');

  let status, data;
  try {
    ({ status, data } = await groqPost(
      '/openai/v1/chat/completions',
      { model, messages },
      config.groq.timeoutMs
    ));
  } catch (err) {
    const durationMs = Date.now() - t0;
    log.error({ durationMs, err: err.message }, 'Groq request failed');
    throw normaliseError(err);
  }

  const durationMs = Date.now() - t0;

  if (status !== 200) {
    log.error({ status, durationMs, body: data }, 'Groq returned non-200');
    const msg =
      status === 401 ? 'Invalid Groq API key — check GROQ_API_KEY in your .env' :
      status === 429 ? 'Groq rate limit hit — slow down or upgrade your plan' :
      data?.error?.message || `Groq error (HTTP ${status})`;
    throw Object.assign(new Error(msg), { status: status >= 500 ? 502 : status });
  }

  const answer = data.choices?.[0]?.message?.content || '';

  log.info(
    { durationMs, promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens },
    'Groq generation complete'
  );

  return { answer: answer.trim(), model: data.model || model, durationMs };
}

/**
 * Build the system prompt: persona + optional live market context.
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
        lines.push(`${k.openTime} | ${k.open} | ${k.high} | ${k.low} | ${k.close} | ${k.volume}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function normaliseError(err) {
  const message =
    err.message.includes('timed out')  ? err.message :
    err.message.includes('non-JSON')   ? err.message :
    err.message || 'Groq request failed';
  return Object.assign(new Error(message), { status: 502 });
}

module.exports = { pingOllama, generate, buildPrompt };
