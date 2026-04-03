'use strict';

/**
 * Minimal in-memory TTL cache.
 * Prevents hammering Binance on every chat message and ticker poll.
 *
 * Usage:
 *   const cache = new TTLCache({ ttlMs: 30_000 });
 *   const value = await cache.get('key', () => expensiveFetch());
 */
class TTLCache {
  constructor({ ttlMs = 30_000 } = {}) {
    this._ttlMs  = ttlMs;
    this._store  = new Map(); // key → { value, expiresAt }
  }

  /**
   * Return cached value if fresh, otherwise call loader(), cache, and return.
   * @param {string}   key
   * @param {Function} loader  - async () => value
   */
  async get(key, loader) {
    const entry = this._store.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value;
    }

    const value = await loader();
    this._store.set(key, { value, expiresAt: Date.now() + this._ttlMs });
    return value;
  }

  invalidate(key) {
    this._store.delete(key);
  }

  clear() {
    this._store.clear();
  }
}

// One shared instance for all market data (30s TTL)
module.exports = new TTLCache({ ttlMs: 30_000 });
