/**
 * compute_normalized_price.js
 * - Parses listing.unit (e.g., "5 kg", "400 g", "1 L", "200 ml")
 * - Computes normalized_price as price per 100g (for solids) or per 100ml (for liquids)
 * - Stores normalized_price (number) and normalized_unit ("per_100g" or "per_100ml" or null)
 *
 * Edge cases:
 * - Units like "pack of 4 x 200 g" not handled perfectly — will attempt to parse numbers.
 * - Units like "pcs" or ambiguous units will be left with normalized_price = NULL (manual mapping needed).
 */

const db = require('./db');

function parseUnitToGrams(unitStr) {
  if (!unitStr) return null;
  const s = unitStr.toString().toLowerCase().trim();

  // common patterns
  // examples: "5 kg", "500 g", "1 l", "200 ml", "400 g", "2 x 400 g", "2pcs", "250gm"
  // normalize spacing
  const clean = s.replace(/\s+/g, ' ').replace(/,/g, '').trim();

  // handle patterns like "2 x 400 g" or "2*400 g"
  const multMatch = clean.match(/^(\d+(?:\.\d+)?)\s*[x\*]\s*(\d+(?:\.\d+)?)\s*(kg|g|l|ml|ltr|pcs|pc|gm)?$/);
  if (multMatch) {
    const qty = parseFloat(multMatch[1]);
    const size = parseFloat(multMatch[2]);
    const unit = (multMatch[3] || 'g').toLowerCase();
    const total = qty * size;
    return unitToGrams(total, unit);
  }

  // direct extract: number + unit
  const m = clean.match(/([\d\.]+)\s*(kg|g|gm|gram|grams|l|ml|ltr|pcs|pc)?/);
  if (m) {
    const num = parseFloat(m[1]);
    const unit = (m[2] || 'g').toLowerCase();
    return unitToGrams(num, unit);
  }

  // fallback: try to extract first number and assume grams
  const m2 = clean.match(/([\d\.]+)/);
  if (m2) {
    const num = parseFloat(m2[1]);
    return unitToGrams(num, 'g');
  }

  return null;
}

function unitToGrams(value, unit) {
  if (!value) return null;
  unit = (unit || '').toLowerCase();
  if (unit === 'kg' ) return value * 1000;
  if (unit === 'g' || unit === 'gm' || unit === 'gram' || unit === 'grams') return value;
  if (unit === 'l' || unit === 'ltr' ) return value * 1000; // liters => ml, we store as grams-equivalent? we'll treat liquids separately
  if (unit === 'ml') return value; // ml
  if (unit === 'pcs' || unit === 'pc' || unit === 'piece' || unit === 'pieces') return null;
  // unknown -> null
  return null;
}

function compute() {
  const rows = db.prepare('SELECT id, price, unit FROM listings').all();
  const update = db.prepare('UPDATE listings SET normalized_price = @normalized_price, normalized_unit = @normalized_unit WHERE id = @id');
  let updated = 0;
  const tx = db.transaction((rows) => {
    for (const r of rows) {
      const u = r.unit ? String(r.unit).trim() : null;
      const gramsOrMl = parseUnitToGrams(u);
      if (gramsOrMl === null) {
        update.run({ normalized_price: null, normalized_unit: null, id: r.id });
        continue;
      }

      // Decide whether it's solid (g/kg) or liquid (ml/L)
      const unitLower = (u || '').toLowerCase();
      const isLiquid = /l|ml|ltr/.test(unitLower);

      if (isLiquid) {
        // gramsOrMl is in ml; compute price per 100ml
        const per100 = (r.price / gramsOrMl) * 100;
        update.run({ normalized_price: Math.round(per100 * 100) / 100, normalized_unit: 'per_100ml', id: r.id });
        updated++;
      } else {
        // solids: grams -> compute price per 100g
        const per100 = (r.price / gramsOrMl) * 100;
        update.run({ normalized_price: Math.round(per100 * 100) / 100, normalized_unit: 'per_100g', id: r.id });
        updated++;
      }
    }
  });

  tx(rows);
  console.log('Normalized price computed for', updated, 'rows.');
}

compute();
