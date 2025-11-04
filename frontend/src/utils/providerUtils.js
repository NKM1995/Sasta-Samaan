/**
 * src/utils/providerUtils.js (ES module)
 *
 * Export named functions so frontend `import { canonicalKey } from './providerUtils'` works cleanly.
 */

const canonicalMap = {
  'swiggy instamart': 'instamart',
  'swiggyinstamart': 'instamart',
  'instamart': 'instamart',
  'swiggy': 'swiggy',
  'zepto': 'zepto',
  'blinkit': 'blinkit',
  'bigbasket': 'bigbasket',
  'jiomart': 'jiomart',
  'dmart': 'dmart'
};

const displayMap = {
  instamart: 'Instamart',
  swiggy: 'Swiggy',
  zepto: 'Zepto',
  blinkit: 'Blinkit',
  bigbasket: 'BigBasket',
  jiomart: 'JioMart',
  dmart: 'Dmart'
};

export function normalizeRaw(name = '') {
  return (name || '').toString().trim().toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d"]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalKey(providerName = '') {
  const n = normalizeRaw(providerName);
  if (canonicalMap[n]) return canonicalMap[n];
  const compact = n.replace(/\s+/g, '');
  if (canonicalMap[compact]) return canonicalMap[compact];
  if (n.indexOf('instamart') !== -1) return 'instamart';
  if (n.indexOf('swiggy') !== -1) return 'swiggy';
  if (n.indexOf('blinkit') !== -1) return 'blinkit';
  if (n.indexOf('bigbasket') !== -1 || n.indexOf('bb') === 0) return 'bigbasket';
  if (n.indexOf('jiomart') !== -1) return 'jiomart';
  if (n.indexOf('dmart') !== -1) return 'dmart';
  if (n.indexOf('zepto') !== -1) return 'zepto';
  return compact || n || 'unknown';
}

export function displayName(providerName = '') {
  const key = canonicalKey(providerName);
  return displayMap[key] || providerName || key;
}
