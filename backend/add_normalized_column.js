/**
 * add_normalized_column.js
 * Adds normalized_price (price per 100g or per 100ml) and normalized_unit columns to listings if missing.
 */

const db = require('./db');

function addColumns() {
  // Add columns only if they don't exist
  const pragma = db.prepare("PRAGMA table_info(listings)").all();
  const columns = pragma.map(r => r.name);

  if (!columns.includes('normalized_price')) {
    db.prepare('ALTER TABLE listings ADD COLUMN normalized_price REAL').run();
    console.log('Added column normalized_price');
  } else {
    console.log('normalized_price column already exists');
  }

  if (!columns.includes('normalized_unit')) {
    db.prepare('ALTER TABLE listings ADD COLUMN normalized_unit TEXT').run();
    console.log('Added column normalized_unit');
  } else {
    console.log('normalized_unit column already exists');
  }
}

addColumns();
