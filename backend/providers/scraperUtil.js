/**
 * providers/scraperUtil.js
 *
 * - lightweight request wrapper using axios
 * - simple in-memory TTL cache
 * - polite default headers (user-agent)
 * - retry with exponential backoff
 *
 * Note: For JS-heavy pages consider Puppeteer/Playwright (see notes later).
 */

const axios = require('axios');

const DEFAULT_USER_AGENT = process.env.SASTA_USER_AGENT || 'SastaSamaanBot/1.0 (+https://example.com)';

const cache = new Map(); // key -> { value, expiresAt }

function setCache(key, value, ttlSec = 60) {
  cache.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

function getCache(key) {
  const rec = cache.get(key);
  if (!rec) return null;
  if (Date.now() > rec.expiresAt) { cache.delete(key); return null; }
  return rec.value;
}

async function fetchHtmlWithRetries(url, { timeout = 10000, maxRetries = 2, headers = {}, cacheTtl = 30 } = {}) {
  const cacheKey = `html:${url}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const ua = { 'User-Agent': DEFAULT_USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };
  const allHeaders = Object.assign({}, ua, headers);

  let attempt = 0;
  let lastErr = null;
  while (attempt <= maxRetries) {
    try {
      const resp = await axios.get(url, { timeout, headers: allHeaders });
      const html = resp.data;
      setCache(cacheKey, html, cacheTtl);
      return html;
    } catch (err) {
      lastErr = err;
      attempt += 1;
      const delay = 300 * Math.pow(2, attempt); // exponential backoff
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function safeText(el, defaultVal = '') {
  try {
    if (!el) return defaultVal;
    return (el.text() || '').trim();
  } catch (e) { return defaultVal; }
}

function safeAttr(el, name, defaultVal = '') {
  try {
    if (!el) return defaultVal;
    return (el.attr(name) || '').trim();
  } catch (e) { return defaultVal; }
}

module.exports = { fetchHtmlWithRetries, safeText, safeAttr, setCache, getCache };
