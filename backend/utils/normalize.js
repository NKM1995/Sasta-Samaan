/**
 * utils/normalize.js
 * - parseUnitToBase: converts a unit string to grams (for solids) or ml (for liquids)
 * - computeNormalized: returns { normalized_price, normalized_unit } or nulls
 */

function unitToBase(value, unit) {
  if (value == null) return null;
  unit = (unit || '').toString().toLowerCase().trim();
  if (!unit) return null;
  // standardize common tokens
  if (unit.includes('kg')) return value * 1000; // grams
  if (unit === 'g' || unit.includes('gm') || unit.includes('gram')) return value;
  if (unit.includes('l') && !unit.includes('kg')) return value * 1000; // ml
  if (unit.includes('ml')) return value;
  // handle patterns like "400 g" -> should be provided as unit param elsewhere
  return null;
}

function parseUnitStringToBase(unitStr) {
  if (!unitStr) return null;
  const s = unitStr.toLowerCase().replace(/,/g,'').trim();
  // match "2 x 400 g" or "2*400 g"
  const mult = s.match(/^(\d+(?:\.\d+)?)\s*[x\*]\s*(\d+(?:\.\d+)?)/);
  if (mult) {
    const qty = parseFloat(mult[1]);
    const size = parseFloat(mult[2]);
    const unit = s.replace(mult[0],'').trim();
    const base = unitToBase(size, unit || 'g');
    if (base == null) return null;
    return qty * base;
  }
  // match "<number> <unit>" e.g. "5 kg", "400 g", "1 L", "250 ml"
  const m = s.match(/([\d\.]+)\s*(kg|g|gm|gram|grams|l|ml|ltr|pcs|pc|piece)?/);
  if (m) {
    const num = parseFloat(m[1]);
    const unit = (m[2] || 'g');
    return unitToBase(num, unit);
  }
  return null;
}

function computeNormalized(price, unitStr) {
  const base = parseUnitStringToBase(unitStr);
  if (base == null) return { normalized_price: null, normalized_unit: null };
  // decide liquid vs solid (if unitStr contains l or ml -> per_100ml)
  const isLiquid = /l|ml|ltr/.test((unitStr||'').toLowerCase());
  const per100 = (price / base) * 100;
  const rounded = Math.round(per100 * 100) / 100;
  return {
    normalized_price: rounded,
    normalized_unit: isLiquid ? 'per_100ml' : 'per_100g'
  };
}

module.exports = { computeNormalized, parseUnitStringToBase };
