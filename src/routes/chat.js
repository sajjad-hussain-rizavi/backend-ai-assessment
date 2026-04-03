'use strict';

const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Crypto AI Chat</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0a0a0f;
    --surface:   #111118;
    --border:    #1e1e2e;
    --accent:    #f7931a;
    --accent2:   #e8ff47;
    --text:      #e8e8f0;
    --muted:     #55556a;
    --user-bg:   #1a1a28;
    --ai-bg:     #0f1a0f;
    --ai-border: #1a3a1a;
    --up:        #22c55e;
    --down:      #ef4444;
    --mono:      'DM Mono', monospace;
    --sans:      'Syne', sans-serif;
  }

  html, body {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    overflow: hidden;
  }

  /* ── Layout ── */
  #app {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100vh;
    max-width: 860px;
    margin: 0 auto;
    padding: 0 16px;
  }

  /* ── Header ── */
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0 16px;
    border-bottom: 1px solid var(--border);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-icon {
    width: 36px;
    height: 36px;
    background: var(--accent);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 800;
    color: #000;
    font-family: var(--sans);
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text);
  }

  .logo-sub {
    font-size: 11px;
    font-family: var(--mono);
    color: var(--muted);
    margin-top: 2px;
    letter-spacing: 0.05em;
  }

  #ticker {
    font-family: var(--mono);
    font-size: 12px;
    text-align: right;
  }

  #ticker-price {
    font-size: 16px;
    font-weight: 500;
    color: var(--accent);
    letter-spacing: 0.02em;
  }

  #ticker-change {
    font-size: 11px;
    margin-top: 2px;
    color: var(--muted);
  }

  /* ── Controls ── */
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0 8px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .ctrl-label {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-right: 4px;
  }

  .sym-btn {
    font-family: var(--mono);
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.05em;
  }

  .sym-btn:hover { border-color: var(--accent); color: var(--accent); }
  .sym-btn.active { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 500; }

  .toggle-wrap {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle-label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
  }

  .toggle {
    width: 34px;
    height: 18px;
    background: var(--border);
    border-radius: 9px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .toggle.on { background: var(--accent); }

  .toggle::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: left 0.2s;
  }

  .toggle.on::after { left: 19px; }

  /* ── Messages ── */
  #messages {
    overflow-y: auto;
    padding: 20px 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  .msg {
    display: flex;
    gap: 12px;
    animation: fadeUp 0.25s ease;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .msg-avatar {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 2px;
    font-family: var(--sans);
  }

  .msg.user .msg-avatar  { background: var(--user-bg); border: 1px solid var(--border); color: var(--muted); }
  .msg.ai   .msg-avatar  { background: var(--accent); color: #000; }

  .msg-body { flex: 1; min-width: 0; }

  .msg-meta {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 5px;
  }

  .msg-name {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .msg.user .msg-name { color: var(--muted); }
  .msg.ai   .msg-name { color: var(--accent); }

  .msg-time {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
  }

  .msg-content {
    font-size: 14px;
    line-height: 1.65;
    color: var(--text);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .msg.ai .msg-content {
    background: var(--ai-bg);
    border: 1px solid var(--ai-border);
    border-radius: 0 8px 8px 8px;
    padding: 12px 14px;
  }

  .msg.user .msg-content {
    background: var(--user-bg);
    border: 1px solid var(--border);
    border-radius: 8px 0 8px 8px;
    padding: 12px 14px;
  }

  .msg-meta-foot {
    display: flex;
    gap: 10px;
    margin-top: 5px;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
  }

  .market-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    background: rgba(247,147,26,0.08);
    border: 1px solid rgba(247,147,26,0.2);
    border-radius: 3px;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--accent);
  }

  /* ── Thinking ── */
  .thinking .msg-content {
    background: var(--ai-bg);
    border: 1px solid var(--ai-border);
    border-radius: 0 8px 8px 8px;
    padding: 12px 14px;
  }

  .dots span {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    margin-right: 4px;
    animation: bounce 1.2s infinite;
  }

  .dots span:nth-child(2) { animation-delay: 0.2s; }
  .dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40%            { transform: translateY(-5px); opacity: 1; }
  }

  /* ── Input area ── */
  #input-area {
    padding: 12px 0 20px;
    border-top: 1px solid var(--border);
  }

  .input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  #question {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--sans);
    font-size: 14px;
    padding: 12px 14px;
    resize: none;
    outline: none;
    min-height: 46px;
    max-height: 140px;
    line-height: 1.5;
    transition: border-color 0.15s;
  }

  #question:focus { border-color: var(--accent); }
  #question::placeholder { color: var(--muted); }

  #send-btn {
    background: var(--accent);
    color: #000;
    border: none;
    border-radius: 8px;
    padding: 12px 18px;
    cursor: pointer;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
    height: 46px;
  }

  #send-btn:hover:not(:disabled) { opacity: 0.85; }
  #send-btn:active:not(:disabled) { transform: scale(0.97); }
  #send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .input-hint {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
  }

  /* ── System messages ── */
  .sys-msg {
    text-align: center;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    padding: 4px 0;
  }

  .sys-msg.error { color: var(--down); }

  /* ── Empty state ── */
  #empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    padding: 40px 20px;
  }

  #empty-state .big-icon {
    font-size: 40px;
    opacity: 0.3;
  }

  #empty-state h2 {
    font-size: 16px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.05em;
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 8px;
  }

  .suggestion {
    font-family: var(--mono);
    font-size: 11px;
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--muted);
    transition: all 0.15s;
    background: transparent;
  }

  .suggestion:hover { border-color: var(--accent); color: var(--accent); background: rgba(247,147,26,0.05); }

  /* ── Clear btn ── */
  #clear-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 5px;
    padding: 3px 10px;
    font-family: var(--mono);
    font-size: 10px;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.05em;
  }

  #clear-btn:hover { border-color: var(--muted); color: var(--text); }

  @media (max-width: 520px) {
    .controls { gap: 5px; }
    .sym-btn { padding: 3px 7px; font-size: 10px; }
    .toggle-wrap { margin-left: 0; width: 100%; }
  }
</style>
</head>
<body>
<div id="app">

  <!-- Header -->
  <header>
    <div class="logo">
      <div class="logo-icon">₿</div>
      <div>
        <div class="logo-text">Crypto AI</div>
        <div class="logo-sub">Powered by Groq · Live market data</div>
      </div>
    </div>
    <div id="ticker">
      <div id="ticker-price">—</div>
      <div id="ticker-change">loading...</div>
    </div>
  </header>

  <!-- Controls -->
  <div class="controls">
    <span class="ctrl-label">Pair</span>
    <button class="sym-btn active" data-sym="BTCUSDT">BTC</button>
    <button class="sym-btn" data-sym="ETHUSDT">ETH</button>
    <button class="sym-btn" data-sym="SOLUSDT">SOL</button>
    <button class="sym-btn" data-sym="BNBUSDT">BNB</button>
    <button class="sym-btn" data-sym="XRPUSDT">XRP</button>

    <div class="toggle-wrap">
      <span class="toggle-label">Market data</span>
      <div class="toggle on" id="mkt-toggle" title="Toggle live market context"></div>
      <button id="clear-btn">CLEAR</button>
    </div>
  </div>

  <!-- Messages -->
  <div id="messages">
    <div id="empty-state">
      <div class="big-icon">◈</div>
      <h2>Ask anything about crypto</h2>
      <div class="suggestions">
        <button class="suggestion">What's the BTC trend today?</button>
        <button class="suggestion">Is ETH bullish right now?</button>
        <button class="suggestion">Explain RSI to me</button>
        <button class="suggestion">Compare BTC and SOL this week</button>
        <button class="suggestion">What affects crypto prices?</button>
      </div>
    </div>
  </div>

  <!-- Input -->
  <div id="input-area">
    <div class="input-row">
      <textarea id="question" rows="1" placeholder="Ask about crypto markets…"></textarea>
      <button id="send-btn">SEND</button>
    </div>
    <div class="input-hint">
      <span>Enter to send · Shift+Enter for new line</span>
      <span id="history-count">0 messages</span>
    </div>
  </div>

</div>

<script>
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────
  let history       = [];
  let symbol        = 'BTCUSDT';
  let marketEnabled = true;
  let busy          = false;

  // ── DOM refs ──────────────────────────────────────────────────
  const $msgs       = document.getElementById('messages');
  const $question   = document.getElementById('question');
  const $sendBtn    = document.getElementById('send-btn');
  const $empty      = document.getElementById('empty-state');
  const $histCount  = document.getElementById('history-count');
  const $ticker     = document.getElementById('ticker-price');
  const $tickerChg  = document.getElementById('ticker-change');
  const $mktToggle  = document.getElementById('mkt-toggle');
  const $clearBtn   = document.getElementById('clear-btn');

  // ── Symbol selector ──────────────────────────────────────────
  document.querySelectorAll('.sym-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sym-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      symbol = btn.dataset.sym;
      fetchTicker();
    });
  });

  // ── Market toggle ────────────────────────────────────────────
  $mktToggle.addEventListener('click', () => {
    marketEnabled = !marketEnabled;
    $mktToggle.classList.toggle('on', marketEnabled);
  });

  // ── Clear ────────────────────────────────────────────────────
  $clearBtn.addEventListener('click', () => {
    history = [];
    updateHistCount();
    $msgs.innerHTML = '';
    $msgs.appendChild($empty);
    $empty.style.display = '';
    addSys('Conversation cleared.');
  });

  // ── Suggestion clicks ────────────────────────────────────────
  document.querySelectorAll('.suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      $question.value = btn.textContent;
      send();
    });
  });

  // ── Ticker ───────────────────────────────────────────────────
  async function fetchTicker() {
    try {
      const r = await fetch('/api/market/price?symbol=' + symbol);
      if (!r.ok) return;
      const d = await r.json();
      const price = Number(d.price);
      $ticker.textContent = '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      $tickerChg.textContent = symbol;
    } catch { /* silent */ }
  }

  fetchTicker();
  setInterval(fetchTicker, 60000);

  // ── Auto-resize textarea ──────────────────────────────────────
  $question.addEventListener('input', () => {
    $question.style.height = 'auto';
    $question.style.height = Math.min($question.scrollHeight, 140) + 'px';
  });

  // ── Send on Enter ────────────────────────────────────────────
  $question.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  $sendBtn.addEventListener('click', send);

  // ── Helpers ──────────────────────────────────────────────────
  function now() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function scrollBottom() {
    $msgs.scrollTop = $msgs.scrollHeight;
  }

  function updateHistCount() {
    const turns = Math.floor(history.length / 2);
    $histCount.textContent = turns + ' message' + (turns === 1 ? '' : 's');
  }

  function hideEmpty() {
    if ($empty.parentNode) $empty.style.display = 'none';
  }

  function addSys(text, isError = false) {
    const el = document.createElement('div');
    el.className = 'sys-msg' + (isError ? ' error' : '');
    el.textContent = text;
    $msgs.appendChild(el);
    scrollBottom();
  }

  function addUserMsg(text) {
    hideEmpty();
    const el = document.createElement('div');
    el.className = 'msg user';
    el.innerHTML = \`
      <div class="msg-avatar">U</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-name">You</span>
          <span class="msg-time">\${now()}</span>
        </div>
        <div class="msg-content">\${esc(text)}</div>
      </div>
    \`;
    $msgs.appendChild(el);
    scrollBottom();
  }

  function addThinking() {
    const el = document.createElement('div');
    el.className = 'msg ai thinking';
    el.id = 'thinking-bubble';
    el.innerHTML = \`
      <div class="msg-avatar">AI</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-name">Assistant</span>
          <span class="msg-time">\${now()}</span>
        </div>
        <div class="msg-content"><div class="dots"><span></span><span></span><span></span></div></div>
      </div>
    \`;
    $msgs.appendChild(el);
    scrollBottom();
    return el;
  }

  function replaceThinking(answer, meta, marketCtx) {
    const el = document.getElementById('thinking-bubble');
    if (!el) return;

    let footHtml = \`<span>\${(meta.durationMs / 1000).toFixed(1)}s · \${meta.model}</span>\`;
    if (marketCtx && marketCtx.price) {
      const p = Number(marketCtx.price).toLocaleString('en-US', { minimumFractionDigits: 2 });
      footHtml += \`<span class="market-badge">◈ $\${p} · \${marketCtx.klinesCount} candles</span>\`;
    }

    el.classList.remove('thinking');
    el.innerHTML = \`
      <div class="msg-avatar">AI</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-name">Assistant</span>
          <span class="msg-time">\${now()}</span>
        </div>
        <div class="msg-content">\${esc(answer)}</div>
        <div class="msg-meta-foot">\${footHtml}</div>
      </div>
    \`;
    scrollBottom();
  }

  function esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Main send ─────────────────────────────────────────────────
  async function send() {
    const text = $question.value.trim();
    if (!text || busy) return;

    busy = true;
    $sendBtn.disabled = true;
    $question.value = '';
    $question.style.height = 'auto';

    addUserMsg(text);
    const thinkEl = addThinking();

    try {
      const resp = await fetch('/api/ask', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          question: text,
          history,
          symbol,
          includeMarketContext: marketEnabled,
        }),
      });

      const data = await resp.json();

      if (data.error) {
        thinkEl.remove();
        addSys('Error: ' + data.error, true);
      } else {
        replaceThinking(data.answer, { durationMs: data.durationMs, model: data.model }, data.marketContext);

        history.push({ role: 'user',      content: text        });
        history.push({ role: 'assistant', content: data.answer });
        if (history.length > 20) history = history.slice(-20);
        updateHistCount();
      }
    } catch (err) {
      thinkEl.remove();
      addSys('Network error: ' + err.message, true);
    }

    busy = false;
    $sendBtn.disabled = false;
    $question.focus();
  }
})();
</script>
</body>
</html>`);
});

module.exports = router;
