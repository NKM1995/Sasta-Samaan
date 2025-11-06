/**
 * routes/products.js
 * - Chooses mocked providers or "real" provider adapters based on USE_MOCKS env flag.
 * - Aggregates adapter results in parallel, merges, and optionally normalizes.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const USE_MOCKS = String(process.env.USE_MOCKS || 'true').toLowerCase() === 'true';

// helper to safely require a module path, falling back to null if missing
function tryRequire(p) {
  try { return require(p); } catch (e) { return null; }
}

// load adapters depending on flag
const adapters = [];

// prioritized order: try real adapters if USE_MOCKS is false, otherwise load mocks
if (!USE_MOCKS) {
  // try to load real adapters (these may not exist yet)
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
} else {
  // load mocks (safe)
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
}

// optional normalization util
let computeNormalized = null;
try { computeNormalized = require('../utils/compute_normalized_price').computeNormalized; } catch (e) { /* ignore */ }

router.get('/', async (req, res) => {
  try {
    const category = req.query.category || 'grocery';

    // call each adapter in parallel; protect each call with catch so one failure won't break everything
    const promises = adapters.map(fn => {
      try { return Promise.resolve(fn(category)).catch(err => { console.warn('adapter error', err && err.message); return []; }); }
      catch (e) { console.warn('adapter invocation failed', e && e.message); return Promise.resolve([]); }
    });

    const results = await Promise.all(promises);
    let merged = results.flat().map(item => ({ ...item }));

    if (computeNormalized) {
      merged = merged.map(it => {
        try {
          if (it.normalized_price == null) {
            const n = computeNormalized(it.price, it.unit);
            it.normalized_price = n.normalized_price;
            it.normalized_unit = n.normalized_unit;
          }
        } catch (e) { /* ignore */ }
        return it;
      });
    }

    // include local products.json first, if present
    try {
      const local = JSON.parse(fs.readFileSync(path.join(__dirname,'..','products.json')));
      merged = [...local, ...merged];
    } catch (e) { /* ignore if no local file */ }

    res.json(merged);
  } catch (err) {
    console.error('products route err', err && err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
