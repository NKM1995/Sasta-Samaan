const db = require('./db');
try {
  // Use single quotes for the empty string literal
  const row = db.prepare("SELECT COUNT(*) AS cnt FROM listings WHERE normalized_price IS NULL OR normalized_price = ''").get();
  console.log('COUNT result:', row);
} catch (err) {
  console.error('DEBUG: DB error when counting unmapped:', err && err.stack ? err.stack : err);
}
