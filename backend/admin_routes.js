/**
 * backend/admin_routes.js - admin endpoints + audit + auto-cache clear
 */
const express = require('express');
const router = express.Router();
const db = require('./db');
const axios = require('axios');

function maskToken(token) {
  if (!token) return null;
  const t = String(token);
  if (t.length <= 8) return '****' + t.slice(-4);
  return '****' + t.slice(-4);
}

// GET /admin/unmapped
router.get('/unmapped', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT listings.id AS listing_id, listings.product_id, listings.raw_name, listings.provider, listings.unit, listings.price, listings.fetched_at, listings.url
      FROM listings
      WHERE normalized_price IS NULL OR normalized_price = ''
      ORDER BY listings.fetched_at DESC
      LIMIT 200
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/unmapped error', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// GET /admin/unmapped/count
router.get('/unmapped/count', (req, res) => {
  try {
    const row = db.prepare("SELECT COUNT(*) AS cnt FROM listings WHERE normalized_price IS NULL OR normalized_price = ''").get();
    res.json({ count: row.cnt });
  } catch (err) {
    console.error('GET /admin/unmapped/count error', err);
    res.status(500).json({ error: 'db_error' });
  }
});

/**
 * POST /admin/map
 * Updates a listing and writes an audit record.
 * After success, calls internal cache clear endpoint to invalidate product cache.
 */
router.post('/map', (req, res) => {
  try {
    const { listing_id, product_id, normalized_price, normalized_unit } = req.body || {};
    if (!listing_id) return res.status(400).json({ error: 'listing_id_required' });

    const parts = [];
    const params = { id: listing_id };
    if (product_id !== undefined) {
      parts.push('product_id = @product_id');
      params.product_id = product_id;
    }
    if (normalized_price !== undefined) {
      parts.push('normalized_price = @normalized_price');
      params.normalized_price = normalized_price;
    }
    if (normalized_unit !== undefined) {
      parts.push('normalized_unit = @normalized_unit');
      params.normalized_unit = normalized_unit;
    }

    if (parts.length === 0) {
      return res.status(400).json({ error: 'nothing_to_update' });
    }

    const sql = `UPDATE listings SET ${parts.join(', ')} WHERE id = @id`;
    db.prepare(sql).run(params);

    const updated = db.prepare('SELECT * FROM listings WHERE id = @id').get({ id: listing_id });

    // Audit logging
    const rawToken = req.get('x-admin-token') || (req.get('authorization') || '').split(' ')[1];
    const adminId = maskToken(rawToken);
    const payload = JSON.stringify({
      listing_id,
      product_id: product_id === undefined ? null : product_id,
      normalized_price: normalized_price === undefined ? null : normalized_price,
      normalized_unit: normalized_unit === undefined ? null : normalized_unit
    });
    db.prepare(`
      INSERT INTO admin_audit (listing_id, action, payload, admin_id)
      VALUES (@listing_id, @action, @payload, @admin_id)
    `).run({
      listing_id,
      action: 'map',
      payload,
      admin_id: adminId
    });

    // Attempt to clear product cache by calling internal endpoint (fire-and-forget)
    (async () => {
      try {
        const url = `http://localhost:${process.env.PORT || 3000}/internal/cache/clear`;
        await axios.post(url);
        console.log('Cache clear requested after admin map');
      } catch (e) {
        console.warn('Failed to clear cache after admin map', e && e.message);
      }
    })();

    res.json({ success: true, updated });
  } catch (err) {
    console.error('POST /admin/map error', err);
    res.status(500).json({ error: 'db_error' });
  }
});

/**
 * GET /admin/audit
 */
router.get('/audit', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, listing_id, action, payload, admin_id, created_at FROM admin_audit ORDER BY created_at DESC LIMIT 200').all();
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/audit error', err);
    res.status(500).json({ error: 'db_error' });
  }
});

module.exports = router;
