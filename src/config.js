'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3002,

  groq: {
    apiKey:    process.env.GROQ_API_KEY  || '',
    model:     process.env.GROQ_MODEL    || 'llama-3.1-8b-instant',
    timeoutMs: parseInt(process.env.GROQ_TIMEOUT_MS, 10) || 30_000,
  },

  binance: {
    baseUrl: process.env.BINANCE_BASE_URL || 'https://api.binance.com',
    symbol: process.env.BTC_SYMBOL || 'BTCUSDT',
    /** ms before we give up on a market request */
    timeoutMs: parseInt(process.env.BINANCE_TIMEOUT_MS, 10) || 10_000,
  },

  /** 'development' | 'production' | 'test' */
  env: process.env.NODE_ENV || 'development',
};

module.exports = config;
