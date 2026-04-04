# Crypto AI predictor

A conversational AI backend for cryptocurrency market analysis. Combines live Binance market data with Groq-hosted LLMs to answer questions about crypto prices, trends, and trading pairs — through both a browser chat UI and a terminal CLI.

---

## Features

- **Browser chat UI** — open the deployed URL and start chatting instantly, no setup needed
- **Multi-turn conversations** — full history is maintained across messages within a session
- **Live market data** — price and 24h klines injected into every prompt from Binance's public API
- **Symbol switching** — switch between BTC, ETH, SOL, BNB, XRP mid-conversation with instant cache invalidation
- **30-second server-side cache** — Binance is only hit once per 30s per symbol, not on every message
- **Terminal CLI** — `node chat.js` for a full-featured ANSI chat session from the command line
- **Structured logging** — every request tagged with a unique `requestId` for easy tracing in Railway/Datadog/etc.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| AI inference | [Groq API](https://console.groq.com) — `llama-3.1-8b-instant` (default) |
| Market data | Binance public REST API (no key required) |
| Logging | Pino (NDJSON in production, pretty in dev) |
| Deployment | Railway |

---

## Project Structure

```
src/
├── index.js                  # Express app entry point
├── config.js                 # Env var config
├── logger.js                 # Pino logger setup
├── lib/
│   ├── ollama.js             # Groq API client (generate, buildPrompt)
│   ├── market.js             # Binance price + klines fetcher
│   └── cache.js              # In-memory TTL cache (30s)
├── routes/
│   ├── chat.js               # GET  /          — browser chat UI
│   ├── ask.js                # POST /api/ask   — AI chat endpoint
│   ├── market.js             # GET  /api/market/price|klines
│   └── health.js             # GET  /api/health
└── middleware/
    ├── requestLogger.js      # requestId + timing on every request
    └── errorHandler.js       # Centralised error → JSON response

chat.js                       # Terminal CLI chat client
cli.js                        # One-shot CLI commands (price, klines, ask)
railway.json                  # Railway deployment config
```

---

## API Reference

### `GET /`
Serves the browser-based chat UI. Open in any browser.

---

### `GET /api/health`
Returns server and Groq connectivity status.

```json
{
  "ok": true,
  "service": "btc-ai-backend",
  "groq": "reachable",
  "model": "llama-3.1-8b-instant",
  "timestamp": "2026-04-03T20:43:24.000Z"
}
```

---

### `POST /api/ask`
Main AI endpoint. Fetches live market data, builds a system prompt, and sends the conversation to Groq.

**Request body:**
```json
{
  "question": "Is BTC looking bullish today?",
  "history": [
    { "role": "user", "content": "What's the current price?" },
    { "role": "assistant", "content": "BTC is trading at $66,919." }
  ],
  "symbol": "BTCUSDT",
  "model": "llama-3.1-8b-instant",
  "includeMarketContext": true
}
```

| Field | Type | Required | Default |
|---|---|---|---|
| `question` | string | ✅ | — |
| `history` | array | ❌ | `[]` |
| `symbol` | string | ❌ | `BTCUSDT` |
| `model` | string | ❌ | `GROQ_MODEL` env var |
| `includeMarketContext` | boolean | ❌ | `true` |

**Response:**
```json
{
  "question": "Is BTC looking bullish today?",
  "answer": "Based on the current data...",
  "model": "llama-3.1-8b-instant",
  "durationMs": 141,
  "marketContext": {
    "symbol": "BTCUSDT",
    "price": "66919.60",
    "fetchedAt": "2026-04-03T20:43:24.329Z",
    "klinesCount": 24
  },
  "requestId": "289b4b52-3776-4139-a5fa-0eb72bf0e3eb"
}
```

---

### `POST /api/ask/symbol-change`
Invalidates the server-side cache for a symbol when the user switches trading pairs. Called automatically by the browser UI.

```json
{ "symbol": "BTCUSDT" }
```

---

### `GET /api/market/price`
Returns the current spot price for a symbol.

```
GET /api/market/price?symbol=ETHUSDT
```

```json
{
  "symbol": "ETHUSDT",
  "price": "3241.55",
  "fetchedAt": "2026-04-03T20:43:24.329Z"
}
```

---

### `GET /api/market/klines`
Returns OHLCV candlestick data.

```
GET /api/market/klines?symbol=BTCUSDT&interval=1h&limit=24
```

**Valid intervals:** `1s 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M`

---

## Local Setup

**1. Clone and install**
```bash
git clone <your-repo>
cd backend-groq-ai-assessment
npm install
```

**2. Configure environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
GROQ_API_KEY=your_key_from_console.groq.com
GROQ_MODEL=llama-3.1-8b-instant
PORT=3002
NODE_ENV=development
```

Get a free Groq API key at [console.groq.com](https://console.groq.com) — no credit card required.

**3. Start the server**
```bash
npm start          # production
npm run dev        # with nodemon auto-restart
```

**4. Open the chat**

Browser: [http://localhost:3002](http://localhost:3002)

Terminal:
```bash
node chat.js                      # default BTC, market data on
node chat.js --no-market          # skip live market context
node chat.js --symbol ETHUSDT     # different trading pair
```

---

## Deploy to Railway

**1. Push to GitHub**
```bash
git add .
git commit -m "initial commit"
git push origin main
```

**2. Create Railway project**

Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → select your repository.

**3. Set environment variables**

In the Railway dashboard → your service → Variables:

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | Your key from console.groq.com |
| `GROQ_MODEL` | `llama-3.1-8b-instant` |
| `NODE_ENV` | `production` |

> Do **not** set `PORT` — Railway injects it automatically.

**4. Deploy**

Railway picks up `railway.json` automatically and runs `node src/index.js`. Your public URL (e.g. `https://your-app.up.railway.app`) serves the chat UI directly.

**Verify deployment** — check Railway logs for:
```
Groq API key loaded { keyPrefix: "gsk_..." }
BTC AI Backend listening on port XXXX
```

---

## Groq Model Options

| Model | Speed | Quality | Best for |
|---|---|---|---|
| `llama-3.1-8b-instant` | Fastest | Good | Default — high throughput |
| `llama-3.3-70b-versatile` | Slower | Best | Deeper analysis |
| `mixtral-8x7b-32768` | Fast | Great | Balance of speed + quality |

Change the model via the `GROQ_MODEL` env var, or pass `"model"` in the request body to override per-request.

---

## Supported Trading Pairs

Any valid Binance spot pair works — pass as `symbol` in requests or select in the UI.

**Examples:** `BTCUSDT` `ETHUSDT` `SOLUSDT` `BNBUSDT` `XRPUSDT` `ADAUSDT` `DOGEUSDT` `AVAXUSDT` `DOTUSDT` `LINKUSDT`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | *(required)* | Groq API key |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Default LLM model |
| `GROQ_TIMEOUT_MS` | `30000` | Groq request timeout in ms |
| `PORT` | `3002` | HTTP server port (auto-set by Railway) |
| `NODE_ENV` | `development` | `development` or `production` |
| `BINANCE_BASE_URL` | `https://api.binance.com` | Binance API base URL |
| `BTC_SYMBOL` | `BTCUSDT` | Default trading pair |
| `BINANCE_TIMEOUT_MS` | `10000` | Binance request timeout in ms |
