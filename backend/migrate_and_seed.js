const db = require('./db');
const fs = require('fs');
const path = require('path');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      standard_unit TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY,
      product_id INTEGER,
      provider TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT,
      raw_name TEXT,
      fetched_at TEXT,
      url TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
    );
  `);
}

function seed() {
  const file = path.join(__dirname, 'products.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));

  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, brand, category, standard_unit)
    VALUES (@id, @name, @brand, @category, @unit)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name;
  `);

  const insertListing = db.prepare(`
    INSERT INTO listings (product_id, provider, price, unit, raw_name, fetched_at, url)
    VALUES (@product_id, @provider, @price, @unit, @raw_name, @fetched_at, @url);
  `);

  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      insertProduct.run({
        id: r.id,
        name: r.name,
        brand: r.brand || null,
        category: r.category || null,
        unit: r.unit || null,
      });
      insertListing.run({
        product_id: r.id,
        provider: r.provider || 'unknown',
        price: r.price || 0,
        unit: r.unit || null,
        raw_name: r.name,
        fetched_at: new Date().toISOString(),
        url: r.url || null,
      });
    }
  });
  insertMany(raw);
  console.log('Seeded', raw.length, 'rows into DB.');
}

migrate();
seed();
console.log('Migration + seed complete.');
