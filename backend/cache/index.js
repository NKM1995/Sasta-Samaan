/**
 * backend/cache/index.js
 * Simple file-based cache helper
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname);
const CACHE_FILE = path.join(CACHE_DIR, 'products_cache.json');

function writeCache(obj) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ generated_at: new Date().toISOString(), data: obj }, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('writeCache failed', e && e.message);
    return false;
  }
}

function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.warn('readCache failed', e && e.message);
    return null;
  }
}

function cacheAgeSeconds(parsedCache) {
  if (!parsedCache || !parsedCache.generated_at) return Infinity;
  const then = new Date(parsedCache.generated_at).getTime();
  const now = Date.now();
  return Math.floor((now - then) / 1000);
}

module.exports = { CACHE_DIR, CACHE_FILE, writeCache, readCache, cacheAgeSeconds };
