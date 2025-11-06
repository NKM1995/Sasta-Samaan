/**
 * routes/products.js
 * - Now reads cache first if available and fresh (CACHE_TTL_SEC)
 * - Otherwise falls back to adapters (mocks or real) like before
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { readCache, cacheAgeSeconds } = require('../cache/index');

const USE_MOCKS = String(process.env.USE_MOCKS || 'true').toLowerCase() === 'true';
const CACHE_TTL_SEC = Number(process.env.CACHE_TTL_SEC || 300); // default 5 minutes

// helper to safely require a module path, falling back to null if missing
function tryRequire(p) {
  try { return require(p); } catch (e) { return null; }
}

async function fetchAdapters(category) {
  const adapters = [];
  if (USE_MOCKS) {
    const mz = tryRequire('../providers/mocks/zepto') || {};
    const mb = tryRequire('../providers/mocks/blinkit') || {};
    const mi = tryRequire('../providers/mocks/instamart') || {};
    const bbb = tryRequire('../providers/mocks/bigbasket') || {};
    const mj = tryRequire('../providers/mocks/jiomart') || {};
    const md = tryRequire('../providers/mocks/dmart') || {};
    if (mz.fetchZeptoProducts) adapters.push(mz.fetchZeptoProducts);
    if (mb.fetchBlinkitProducts) adapters.push(mb.fetchBlinkitProducts);
    if (mi.fetchInstamartProducts) adapters.push(mi.fetchInstamartProducts);
    if (bbb.fetchBigBasketProducts) adapters.push(bbb.fetchBigBasketProducts);
    if (mj.fetchJiomartProducts) adapters.push(mj.fetchJiomartProducts);
    if (md.fetchDmartProducts) adapters.push(md.fetchDmartProducts);
  } else {
    const zepto = tryRequire('../providers/zepto') || tryRequire('../providers/zepto_scraper') || tryRequire('../providers/mocks/zepto');
    const blinkit = tryRequire('../providers/blinkit') || tryRequire('../providers/blinkit_scraper') || tryRequire('../providers/mocks/blinkit');
    const instamart = tryRequire('../providers/instamart') || tryRequire('../providers/instamart_scraper') || tryRequire('../providers/mocks/instamart');
    const bigbasket = tryRequire('../providers/bigbasket') || tryRequire('../providers/bigbasket_scraper') || tryRequire('../providers/mocks/bigbasket');
    const jiomart = tryRequire('../providers/jiomart') || tryRequire('../providers/jiomart_scraper') || tryRequire('../providers/mocks/jiomart');
    const dmart = tryRequire('../providers/dmart') || tryRequire('../providers/dmart_scraper') || tryRequire('../providers/mocks/dmart');
    if (zepto && zepto.fetchZeptoProducts) adapters.push(zepto.fetchZeptoProducts);
    if (blinkit && blinkit.fetchBlinkitProducts) adapters.push(blinkit.fetchBlinkitProducts);
    if (instamart && instamart.fetchInstamartProducts) adapters.push(instamart.fetchInstamartProducts);
    if (bigbasket && bigbasket.fetchBigBasketProducts) adapters.push(bigbasket.fetchBigBasketProducts);
    if (jiomart && jiomart.fetchJiomartProducts) adapters.push(jiomart.fetchJiomartProducts);
    if (dmart && dmart.fetchDmartProducts) adapters.push(dmart.fetchDmartProducts);
  }

  // call adapters and merge results
  try {
    const results = await Promise.all(adapters.map(fn => {
      try { return Promise.resolve(fn(category)).catch(err => { console.warn('adapter error', err && err.message); return []; }); }
      catch (e) { console.warn('adapter invocation failed', e && e.message); return Promise.resolve([]); }
    }));
    return results.flat().map(item => ({ ...item }));
  } catch (e) {
    console.warn('fetchAdapters failed', e && e.message);
    return [];
  }
}

router.get('/', async (req, res) => {
  try {
    const category = req.query.category || 'grocery';

    // check cache
    const cached = readCache();
    if (cached && cacheAgeSeconds(cached) <= CACHE_TTL_SEC) {
      // optionally filter by category if your cache includes category (not implemented now)
      return res.json(cached.data);
    }

    // if no fresh cache, fetch adapters on-demand
    const merged = await fetchAdapters(category);

    // attach local products.json entries (optional)
    try {
      const local = JSON.parse(fs.readFileSync(path.join(__dirname,'..','products.json')));
      const combined = [...local, ...merged];
      return res.json(combined);
    } catch (e) {
      return res.json(merged);
    }
  } catch (err) {
    console.error('products route err', err && err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
