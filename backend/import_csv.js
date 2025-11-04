/**
 * import_csv.js
 * Simple CSV importer: reads seed_skus.csv and inserts into products + listings.
 *
 * HOW:
 * - CSV columns (first non-comment row):
 *   id,name,brand,category,standard_unit,provider,price,unit,fetched_at,url
 *
 * WHY:
 * - Idempotent for products (upsert by id)
 * - Creates a listing for each CSV row so you can model provider snapshots
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

const csvFile = path.join(__dirname, 'seed_skus.csv');

if (!fs.existsSync(csvFile)) {
  console.error('seed_skus.csv not found in backend folder.');
  process.exit(1);
}

const data = fs.readFileSync(csvFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);

// parse CSV naive but robust for our simple CSV (no embedded commas or quotes expected)
const rows = [];
for (const line of data) {
  if (line.startsWith('#')) continue; // skip comment header
  const cols = line.split(',');
  // ensure we have at least 9 columns
  if (cols.length < 9) {
    console.warn('Skipping malformed line:', line);
    continue;
  }
  const [
    idStr, name, brand, category, standard_unit,
    provider, priceStr, unit, fetched_at, url
  ] = (() => {
    // If CSV has more columns (e.g., trailing comma), join extra into url
    const parts = line.split(',');
    const first9 = parts.slice(0,9);
    const rest = parts.slice(9);
    const [a,b,c,d,e,f,g,h,i] = first9;
    return [a,b,c,d,e,f,g,h,i + (rest.length ? (',' + rest.join(',')) : '')];
  })();

  const id = parseInt(idStr, 10) || null;
  const price = parseFloat(priceStr) || 0;
  rows.push({
    id,
    name: name || null,
    brand: brand || null,
    category: category || null,
    standard_unit: standard_unit || null,
    provider: provider || 'unknown',
    price,
    unit: unit || null,
    fetched_at: fetched_at || new Date().toISOString(),
    url: url || null
  });
}

if (rows.length === 0) {
  console.log('No rows parsed from CSV.');
  process.exit(0);
}

// Prepare statements
const insertProduct = db.prepare(`
  INSERT INTO products (id, name, brand, category, standard_unit)
  VALUES (@id, @name, @brand, @category, @standard_unit)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    brand = excluded.brand,
    category = excluded.category,
    standard_unit = excluded.standard_unit
`);

const insertListing = db.prepare(`
  INSERT INTO listings (product_id, provider, price, unit, raw_name, fetched_at, url)
  VALUES (@product_id, @provider, @price, @unit, @raw_name, @fetched_at, @url)
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) {
    // upsert product if id exists else insert and let sqlite assign id if needed
    const pid = r.id;
    if (pid) {
      insertProduct.run({
        id: pid,
        name: r.name,
        brand: r.brand,
        category: r.category,
        standard_unit: r.standard_unit
      });
    } else {
      // If no id provided, create a new product row and fetch its lastInsertRowid
      const res = db.prepare(`
        INSERT INTO products (name, brand, category, standard_unit)
        VALUES (@name, @brand, @category, @standard_unit)
      `).run({
        name: r.name,
        brand: r.brand,
        category: r.category,
        standard_unit: r.standard_unit
      });
      r.id = res.lastInsertRowid;
    }

    // create a listing referencing product id
    insertListing.run({
      product_id: r.id,
      provider: r.provider,
      price: r.price,
      unit: r.unit,
      raw_name: r.name,
      fetched_at: r.fetched_at,
      url: r.url
    });
  }
});

try {
  insertMany(rows);
  console.log('Imported', rows.length, 'rows from CSV.');
} catch (err) {
  console.error('Error importing CSV:', err);
}
