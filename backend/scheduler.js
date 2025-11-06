/**
 * backend/scheduler.js
 *
 * Lightweight scheduler to prefetch provider data and write cache.
 * - Respects USE_MOCKS env var
 * - Writes to backend/cache/products_cache.json
 *
 * Run: node scheduler.js
 * To run continuously: nohup node scheduler.js & or use pm2 / systemd
 */

const path = require('path');
const { writeCache } = require('./cache/index');

const USE_MOCKS = String(process.env.USE_MOCKS || 'true').toLowerCase() === 'true';
const INTERVAL_SEC = Number(process.env.SCRAPER_INTERVAL_SEC || 120); // default every 2 minutes

function tryRequire(p) {
  try { return require(p); } catch (e) { return null; }
}

async function runOnce() {
  console.log('[scheduler] starting fetch cycle - USE_MOCKS=', USE_MOCKS);
  const adapters = [];
  if (USE_MOCKS) {
    const mz = tryRequire('./providers/mocks/zepto');
    const mb = tryRequire('./providers/mocks/blinkit');
    const mi = tryRequire('./providers/mocks/instamart');
    const bbb = tryRequire('./providers/mocks/bigbasket');
    const mj = tryRequire('./providers/mocks/jiomart');
    const md = tryRequire('./providers/mocks/dmart');
    if (mz && mz.fetchZeptoProducts) adapters.push(mz.fetchZeptoProducts);
    if (mb && mb.fetchBlinkitProducts) adapters.push(mb.fetchBlinkitProducts);
    if (mi && mi.fetchInstamartProducts) adapters.push(mi.fetchInstamartProducts);
    if (bbb && bbb.fetchBigBasketProducts) adapters.push(bbb.fetchBigBasketProducts);
    if (mj && mj.fetchJiomartProducts) adapters.push(mj.fetchJiomartProducts);
    if (md && md.fetchDmartProducts) adapters.push(md.fetchDmartProducts);
  } else {
    const zepto = tryRequire('./providers/zepto') || tryRequire('./providers/zepto_scraper') || tryRequire('./providers/mocks/zepto');
    const blinkit = tryRequire('./providers/blinkit') || tryRequire('./providers/blinkit_scraper') || tryRequire('./providers/mocks/blinkit');
    const instamart = tryRequire('./providers/instamart') || tryRequire('./providers/instamart_scraper') || tryRequire('./providers/mocks/instamart');
    const bigbasket = tryRequire('./providers/bigbasket') || tryRequire('./providers/bigbasket_scraper') || tryRequire('./providers/mocks/bigbasket');
    const jiomart = tryRequire('./providers/jiomart') || tryRequire('./providers/jiomart_scraper') || tryRequire('./providers/mocks/jiomart');
    const dmart = tryRequire('./providers/dmart') || tryRequire('./providers/dmart_scraper') || tryRequire('./providers/mocks/dmart');
    if (zepto && zepto.fetchZeptoProducts) adapters.push(zepto.fetchZeptoProducts);
    if (blinkit && blinkit.fetchBlinkitProducts) adapters.push(blinkit.fetchBlinkitProducts);
    if (instamart && instamart.fetchInstamartProducts) adapters.push(instamart.fetchInstamartProducts);
    if (bigbasket && bigbasket.fetchBigBasketProducts) adapters.push(bigbasket.fetchBigBasketProducts);
    if (jiomart && jiomart.fetchJiomartProducts) adapters.push(jiomart.fetchJiomartProducts);
    if (dmart && dmart.fetchDmartProducts) adapters.push(dmart.fetchDmartProducts);
  }

  if (adapters.length === 0) {
    console.warn('[scheduler] no adapters found');
    return;
  }

  try {
    const results = await Promise.all(adapters.map(fn => {
      try { return Promise.resolve(fn('grocery')).catch(err => { console.warn('adapter error', err && err.message); return []; }); }
      catch (e) { console.warn('adapter invocation failed', e && e.message); return Promise.resolve([]); }
    }));

    const merged = results.flat().map(item => ({ ...item }));
    // write cache
    const ok = writeCache(merged);
    if (ok) console.log('[scheduler] wrote cache with', merged.length, 'items');
    else console.warn('[scheduler] failed to write cache');
  } catch (err) {
    console.error('[scheduler] fetch cycle error', err && err.message);
  }
}

async function loop() {
  await runOnce();
  setInterval(async () => {
    await runOnce();
  }, INTERVAL_SEC * 1000);
}

if (require.main === module) {
  loop().catch(e => { console.error('scheduler fatal', e && e.message); process.exit(1); });
}

module.exports = { runOnce };
