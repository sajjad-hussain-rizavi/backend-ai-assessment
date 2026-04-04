# NOTES.md — BTC AI Backend (Groq Edition)

## AI Provider

**Choice: Groq API** — cloud-hosted LLM inference with extremely fast response times.

- Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`
- Auth: `Authorization: Bearer $GROQ_API_KEY`
- Free tier: generous rate limits, no credit card required
- Get your key: https://console.groq.com

### Recommended models

| Model | Speed | Intelligence |
|---|---|---|
| `llama-3.1-8b-instant` | Fastest | Good (default) |
| `llama-3.3-70b-versatile` | Slower | Best |
| `mixtral-8x7b-32768` | Fast | Great balance |

Set in `.env` via `GROQ_MODEL`.

---

## Market Data Source

**Choice: Binance Public REST API** — no API keys needed.

| Endpoint | URL |
|---|---|
| Spot price | `GET https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT` |
| Klines/OHLCV | `GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24` |

Symbol is configurable via `BTC_SYMBOL` env var or per-request query param.

---

## Setup

```bash
npm install
cp .env.example .env
# Add your GROQ_API_KEY to .env
npm start
```

No Ollama or local model required.

---

## Design Goals

### 1. Drop-in Groq replacement
Only `src/lib/ollama.js` and `src/config.js` changed from the Ollama version.
All routes, middleware, prompt builder, and conversation history are identical.

### 2. Structured logging with pino
All logs go through `src/logger.js`. In development: pretty-printed.
In production: NDJSON for log aggregators (Datadog, Loki, CloudWatch).
Each request carries a unique `requestId` through every log line.

### 3. Graceful degradation in `/api/ask`
Market data fetched with `Promise.allSettled` — if Binance is down,
the endpoint still calls Groq without market context rather than failing.

### 4. Error mapping
Groq errors are normalised to friendly messages:
- 401 → "Invalid Groq API key"
- 429 → "Rate limit hit"
- Timeout → "Groq request timed out"

---

## Known Trade-offs

| Issue | Notes |
|---|---|
| No streaming | Full response buffered before replying. Add SSE for real-time output. |
| No caching | Every request hits Binance live. Add a short TTL cache for high traffic. |
| No auth | API is open. Add API-key middleware for production. |
| Rate limits | Free Groq tier has per-minute token limits. Use `llama-3.1-8b-instant` for highest throughput. |

## How to Extend

- **Streaming**: Switch to `stream: true` and pipe SSE to the client
- **Caching**: Wrap `getPrice`/`getKlines` with a 10s TTL in-memory cache
- **Multi-model**: Accept `model` param per-request to let users choose
- **Rate limiting**: Add `express-rate-limit` on `/api/ask`
