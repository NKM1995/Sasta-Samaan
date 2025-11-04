import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import { canonicalKey as canonicalProviderKey, displayName as providerDisplayName } from '../utils/providerUtils';

/**
 * Home.jsx with an additional mergeSimilarGroups pass to reduce near-duplicate product cards.
 *
 * Heuristic:
 * - brand must match (or one missing)
 * - normalized unit must match (or both missing)
 * - name similarity (token Jaccard) >= SIM_THRESHOLD (0.65)
 *
 * If groups are merged, their listings arrays are combined (then dedup per provider).
 */

const SIM_THRESHOLD = 0.65; // tune this: raise to be stricter, lower to be more aggressive

function normalizeText(s = '') {
  return (s || '').toString().trim().toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripParentheses(s = '') {
  return (s || '').replace(/\((.*?)\)/g, ' ').replace(/\[(.*?)\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function removeBrandFromName(name = '', brand = '') {
  if (!name) return name;
  let n = name.toString();
  if (brand) {
    const b = brand.toString().trim();
    if (b) {
      const re = new RegExp(b.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'), 'ig');
      n = n.replace(re, ' ');
    }
  }
  n = n.replace(/\b(by|from|brand|brand:)\b/ig, ' ');
  return n.replace(/\s+/g, ' ').trim();
}

function normalizeUnit(unit = '', name = '') {
  const combined = `${unit || ''} ${name || ''}`.toLowerCase();
  const rx = /(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gm|gram|grams|ml|l|ltr|litre|litres|pcs|pc|piece|pieces)\b/;
  const m = combined.match(rx);
  if (m) {
    let num = Number(m[1].toString().replace(',', '.'));
    const u = m[2];
    if (/kg|kgs|kilogram/.test(u)) return `${(num * 1000)}g`;
    if (/g|gm|gram/.test(u)) return `${num}g`;
    if (/l|ltr|litre/.test(u)) return `${(num * 1000)}ml`;
    if (/ml/.test(u)) return `${num}ml`;
    return `${num}${u}`;
  }
  const rx2 = /(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gm|ml|l)\b/;
  const m2 = combined.match(rx2);
  if (m2) {
    const count = Number(m2[1]);
    let unitNum = Number(m2[2].toString().replace(',', '.'));
    const u = m2[3];
    if (/kg/.test(u)) return `${(count * unitNum * 1000)}g`;
    if (/g/.test(u)) return `${(count * unitNum)}g`;
    if (/l/.test(u)) return `${(count * unitNum * 1000)}ml`;
    if (/ml/.test(u)) return `${(count * unitNum)}ml`;
  }
  return '';
}

function normalizeProductName(name = '', brand = '') {
  if (!name) return '';
  let n = name.toString();
  n = stripParentheses(n);
  n = removeBrandFromName(n, brand);
  n = n.replace(/\b(pack of|pack|combo|combo of|packet|pouch|fresh|new|extra|refill|family pack|economy pack|value pack)\b/ig, ' ');
  n = n.replace(/(\d+(?:[.,]\d+)?\s*(kg|kgs|g|gm|gram|grams|ml|l|ltr|litre|litres|pcs|pc|piece|pieces))/ig, ' ');
  n = n.replace(/[^a-zA-Z0-9 ]+/g, ' ');
  n = n.replace(/\s+/g, ' ').trim().toLowerCase();
  const parts = n.split(' ').slice(0, 10);
  return parts.join(' ').trim();
}

function tokensOf(s = '') {
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}

function jaccardSimilarity(a = '', b = '') {
  const ta = new Set(tokensOf(a));
  const tb = new Set(tokensOf(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const x of ta) if (tb.has(x)) inter++;
  const union = new Set([...ta, ...tb]).size;
  return inter / union;
}

function canonicalProductKey(item) {
  if (item.product_id) return String(item.product_id);
  const brand = normalizeText(item.brand || '');
  const nameNorm = normalizeProductName(item.name || item.raw && item.raw.name || '', brand);
  const unitNorm = normalizeUnit(item.unit || '', item.name || item.raw && item.raw.name || '') || '';
  return `${brand}||${nameNorm}||${unitNorm}`.replace(/\s+/g, ' ').trim();
}

/**
 * Merge groups if similar by brand, unit and name similarity threshold.
 * Returns new array of groups where each group's listings are combined.
 */
function mergeSimilarGroups(groups) {
  const merged = [];
  const used = new Array(groups.length).fill(false);

  for (let i = 0; i < groups.length; i++) {
    if (used[i]) continue;
    const base = { ...groups[i], listings: [...groups[i].listings] };
    used[i] = true;

    for (let j = i + 1; j < groups.length; j++) {
      if (used[j]) continue;
      const aBrand = normalizeText(base.brand || '');
      const bBrand = normalizeText(groups[j].brand || '');
      // allow match if brands equal OR one is empty
      const brandOk = (!aBrand && !bBrand) || (aBrand === bBrand) || (!aBrand) || (!bBrand);

      const aUnit = (base.unit || '').toString().trim();
      const bUnit = (groups[j].unit || '').toString().trim();
      const unitOk = (!aUnit && !bUnit) || (aUnit === bUnit);

      const aName = normalizeProductName(base.name || '', base.brand || '');
      const bName = normalizeProductName(groups[j].name || '', groups[j].brand || '');
      const sim = jaccardSimilarity(aName, bName);

      if (brandOk && unitOk && sim >= SIM_THRESHOLD) {
        // merge j into base
        base.listings = base.listings.concat(groups[j].listings);
        used[j] = true;
        console.debug(`MERGE: "${base.name}" <= "${groups[j].name}" (sim=${sim.toFixed(2)})`);
      }
    }

    // after merging, dedupe per provider (keep cheapest)
    const byProv = {};
    base.listings.forEach(l => {
      const key = (l.provider_key || (l.provider || '')).toString().toLowerCase().replace(/\s+/g,'');
      if (!byProv[key]) byProv[key] = [];
      byProv[key].push(l);
    });
    const deduped = [];
    Object.values(byProv).forEach(arr => {
      let chosen = arr[0];
      arr.forEach(a => { if (Number(a.price) < Number(chosen.price)) chosen = a; });
      deduped.push(chosen);
    });
    base.listings = deduped;
    merged.push(base);
  }

  return merged;
}

export default function Home() {
  const [q, setQ] = useState('');
  const [productsRaw, setProductsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState({});

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      const res = await api.get('/products', { params });
      let flat = Array.isArray(res.data) ? res.data : [];

      flat = flat.map(it => {
        const incomingProvider = it.provider || 'unknown';
        const canonicalProvKey = canonicalProviderKey(incomingProvider);
        const displayProv = providerDisplayName(incomingProvider);
        return {
          ...it,
          provider: displayProv,
          provider_key: canonicalProvKey,
          normalized_unit: normalizeUnit(it.unit || '', it.name || ''),
          raw_original_provider: incomingProvider
        };
      });

      setProductsRaw(flat);

      const provs = Array.from(new Set(flat.map(x => x.provider).filter(Boolean)));
      setProviderFilter(prev => {
        const next = {};
        provs.forEach(p => { next[p] = prev.hasOwnProperty(p) ? prev[p] : true; });
        return next;
      });
    } catch (e) {
      console.error('fetchProducts error', e);
      setProductsRaw([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); }, []);

  const grouped = useMemo(() => {
    const map = {};
    productsRaw.forEach(item => {
      const key = canonicalProductKey(item);
      if (!map[key]) {
        map[key] = {
          product_id: item.product_id || key,
          name: item.name || (item.raw && item.raw.name) || 'Unknown',
          brand: item.brand || '',
          unit: item.normalized_unit || item.unit || '',
          listings: []
        };
      }
      map[key].listings.push({
        listing_id: item.listing_id ?? item.id ?? null,
        provider: item.provider || 'Unknown',
        provider_key: item.provider_key || '',
        price: item.price,
        unit: item.unit,
        normalized_price: item.normalized_price ?? null,
        normalized_unit: item.normalized_unit ?? null,
        fetched_at: item.fetched_at ?? null,
        link: item.url ?? item.link ?? null,
        raw: item
      });
    });

    let groups = Object.values(map).sort((a,b) => (a.name || '').localeCompare(b.name || ''));

    // Merge similar groups (aggressive dedupe pass)
    groups = mergeSimilarGroups(groups);

    return groups;
  }, [productsRaw]);

  const providers = useMemo(() => {
    const s = new Set();
    productsRaw.forEach(p => { if (p.provider) s.add(p.provider); });
    return Array.from(s).sort();
  }, [productsRaw]);

  function toggleProvider(provider) {
    setProviderFilter(prev => ({ ...prev, [provider]: !prev[provider] }));
  }

  const filteredProducts = useMemo(() => {
    return grouped.map(prod => ({
      ...prod,
      listings: prod.listings.filter(l => providerFilter[l.provider])
    })).filter(p => p.listings.length > 0);
  }, [grouped, providerFilter]);

  return (
    <div className="app-container" style={{ paddingTop: 8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:12 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ fontWeight:700, fontSize:20 }}>Sasta-Samaan</div>
          <div style={{ color:'#6b7280' }}>Price compare MVP</div>
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <SearchBar value={q} onChange={setQ} onEnter={fetchProducts} />
            <button onClick={fetchProducts} style={{ padding:'8px 10px', borderRadius:8 }}>Search</button>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:16, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ fontWeight:700 }}>Providers</div>
        {providers.length === 0 ? <div style={{ color:'#9ca3af' }}>No providers</div> : providers.map(p => (
          <label key={p} style={{ display:'inline-flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none' }}>
            <input type="checkbox" checked={!!providerFilter[p]} onChange={() => toggleProvider(p)} />
            <span style={{ fontSize:14 }}>{p}</span>
          </label>
        ))}
        <button onClick={() => {
          const all = {};
          providers.forEach(p => all[p] = true);
          setProviderFilter(all);
        }} style={{ marginLeft:12 }}>Select all</button>
        <button onClick={() => {
          const none = {};
          providers.forEach(p => none[p] = false);
          setProviderFilter(none);
        }}>Clear</button>
      </div>

      {loading ? <div>Loading products...</div> : (
        <div className="product-grid" style={{ marginBottom: 32 }}>
          {filteredProducts.map(p => <ProductCard key={p.product_id || p.name} product={p} />)}
        </div>
      )}
    </div>
  );
}
