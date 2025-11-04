/**
 * backend/index.js
 * - mounts admin routes with adminAuth
 * - simple in-memory TTL cache (2 minutes)
 * - CORS set to frontend at http://localhost:5174
 *
 * Assumes:
 *  - admin_routes.js exists and exports an Express router
 *  - middleware/adminAuth.js exists and exports a middleware function
 *  - providers/zepto.js, providers/blinkit.js, providers/swiggy.js exist
 *  - utils/normalize.js exists and exports computeNormalized
 *  - products.json exists (seed file)
 *
 * Usage:
 *  node index.js
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const adminRoutes = require('./admin_routes');
const adminAuth = require('./middleware/adminAuth');
const productRoutes = require('./routes/products');

const { fetchZeptoProducts } = require('./providers/zepto');
const { fetchBlinkitProducts } = require('./providers/blinkit');
const { fetchSwiggyProducts } = require('./providers/swiggy');
const { computeNormalized } = require('./utils/normalize');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow only frontend origin (you requested port 5174)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5174';
app.use(cors({ origin: FRONTEND_ORIGIN }));

app.use(express.json());

// --- mount admin routes with auth middleware ---
// All requests to /admin/* must pass adminAuth first
app.use('/admin', adminAuth, adminRoutes);
app.use('/products', productRoutes);

// --- simple in-memory TTL cache ---
const cache = {}; // { key: { ts: number, data: any } }
const TTL_MS = 1000 * 60 * 2; // 2 minutes

function setCache(key, data) {
  cache[key] = { ts: Date.now(), data };
}
function getCache(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    delete cache[key];
    return null;
  }
  return entry.data;
}
function delCache(key) {
  delete cache[key];
}

// --- health ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper to generate a stable-ish id for non-persistent seed items
function makeListingId(obj) {
  const seed = `${obj.provider || ''}|${obj.name || ''}|${obj.unit || ''}`;
  return crypto.createHash('md5').update(seed).digest('hex').slice(0, 12);
}

// --- aggregated products with normalization + caching ---
app.get('/products', async (req, res) => {
  try {
    const category = req.query.category || 'grocery';
    const providerFilter = req.query.provider || 'all';
    const cacheKey = `products:${category}:${providerFilter}`;

    // return cached if fresh
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    // load local seed products (if exists)
    let localProducts = [];
    try {
      const raw = fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8');
      localProducts = JSON.parse(raw);
    } catch (e) {
      // ignore and continue with empty local list
      localProducts = [];
    }

    // fetch from providers (simulated or real, depending on provider files)
    const [zepto, blinkit, swiggy] = await Promise.all([
      fetchZeptoProducts(category).catch(err => { console.error('zepto fetch err', err && err.message); return []; }),
      fetchBlinkitProducts(category).catch(err => { console.error('blinkit fetch err', err && err.message); return []; }),
      fetchSwiggyProducts(category).catch(err => { console.error('swiggy fetch err', err && err.message); return []; })
    ]);

    // merge
    let merged = [...localProducts, ...zepto, ...blinkit, ...swiggy];

    // provider filter if requested (case-insensitive)
    if (providerFilter && providerFilter !== 'all') {
      merged = merged.filter(p => (p.provider || '').toLowerCase() === providerFilter.toLowerCase());
    }

    // compute normalized fields if missing & ensure listing_id
    merged = merged.map(p => {
      const copy = { ...p };
      if (copy.normalized_price === undefined || copy.normalized_price === null) {
        const { normalized_price, normalized_unit } = computeNormalized(copy.price, copy.unit);
        copy.normalized_price = normalized_price;
        copy.normalized_unit = normalized_unit;
      }
      if (!copy.listing_id) copy.listing_id = makeListingId(copy);
      return copy;
    });

    // cache and respond
    setCache(cacheKey, merged);
    res.json(merged);
  } catch (err) {
    console.error('GET /products error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'server_error' });
  }
});

// --- product detail by listing_id or product_id (simple) ---
app.get('/products/:product_id', (req, res) => {
  try {
    const productId = req.params.product_id;
    // try to use cached merged data first (best-effort)
    const cached = getCache('products:grocery:all') || [];
    const matches = cached.filter(r => String(r.listing_id) === String(productId) || String(r.product_id) === String(productId));
    return res.json(matches);
  } catch (err) {
    console.error('GET /products/:product_id error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'server_error' });
  }
});

// --- cheapest by normalized price per product (keeps seed shape) ---
app.get('/products/cheapest', async (req, res) => {
  try {
    // Use merged (cached) data if possible
    const merged = getCache('products:grocery:all') || await (async () => {
      // fallback: call /products handler logic quickly (no cache set)
      const local = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json')));
      const [zepto, blinkit, swiggy] = await Promise.all([
        fetchZeptoProducts('grocery').catch(()=>[]),
        fetchBlinkitProducts('grocery').catch(()=>[]),
        fetchSwiggyProducts('grocery').catch(()=>[])
      ]);
      const all = [...local, ...zepto, ...blinkit, ...swiggy].map(p => {
        const copy = { ...p };
        if (copy.normalized_price === undefined || copy.normalized_price === null) {
          const { normalized_price, normalized_unit } = computeNormalized(copy.price, copy.unit);
          copy.normalized_price = normalized_price;
          copy.normalized_unit = normalized_unit;
        }
        if (!copy.listing_id) copy.listing_id = makeListingId(copy);
        return copy;
      });
      return all;
    })();

    // group by product name (or product_id if present) and pick min normalized_price
    const byKey = {};
    merged.forEach(item => {
      const key = item.product_id ? `pid:${item.product_id}` : `name:${(item.name||'').toLowerCase()}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(item);
    });
    const cheapest = Object.values(byKey).map(list => {
      // prefer items with defined normalized_price
      const withNorm = list.filter(i => i.normalized_price !== null && i.normalized_price !== undefined);
      const base = withNorm.length ? withNorm : list;
      // pick min by normalized_price if available else by price
      base.sort((a,b) => {
        const va = (a.normalized_price !== null && a.normalized_price !== undefined) ? a.normalized_price : a.price;
        const vb = (b.normalized_price !== null && b.normalized_price !== undefined) ? b.normalized_price : b.price;
        return va - vb;
      });
      return base[0];
    });

    res.json(cheapest);
  } catch (err) {
    console.error('GET /products/cheapest error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'server_error' });
  }
});

// --- helper endpoints for cache control (optional, useful after admin edits) ---
// Clear all product caches
app.post('/internal/cache/clear', (req, res) => {
  // Note: keep this internal-only in production behind auth/network rules
  Object.keys(cache).forEach(k => delete cache[k]);
  res.json({ success: true, cleared: true });
});

// delete a specific cache key (e.g. products:grocery:all)
app.post('/internal/cache/delete', (req, res) => {
  const key = req.body && req.body.key;
  if (!key) return res.status(400).json({ error: 'key_required' });
  delete cache[key];
  res.json({ success: true, key });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
});
