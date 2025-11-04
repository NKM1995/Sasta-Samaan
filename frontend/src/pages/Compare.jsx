import React, { useEffect, useState } from 'react';
import api from '../api';
import ProductCard from '../components/ProductCard';

const COMPARE_KEY = 'sasta_compare_listings';
function loadCompare() { try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]').map(String); } catch (e) { return []; } }
function saveCompare(arr) { localStorage.setItem(COMPARE_KEY, JSON.stringify(arr.map(String))); }

export default function Compare(){
  const [selected, setSelected] = useState(loadCompare());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get('/products', { params: {} });
        const all = res.data || [];
        // filter by stringified listing_id or fallback to product_id as string
        const chosen = all.filter(p => {
          const pid = p.listing_id ?? p.id ?? p.product_id ?? p.name;
          return selected.includes(String(pid));
        });
        setItems(chosen);
      } catch (e) {
        console.error(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selected]);

  function removeOne(listing_id) {
    const next = selected.filter(x => String(x) !== String(listing_id));
    setSelected(next);
    saveCompare(next);
  }
  function clearAll() {
    setSelected([]);
    saveCompare([]);
  }

  return (
    <div style={{padding:20}}>
      <h2>Compare ({selected.length})</h2>
      <div style={{marginBottom:12}}>
        <button onClick={clearAll}>Clear compare</button>
      </div>

      {loading && <div>Loading...</div>}
      {!loading && items.length === 0 && <div>No items selected for compare.</div>}

      {!loading && items.length > 0 && (
        <div style={{display:'grid', gridTemplateColumns:`repeat(${Math.max(1, items.length)}, minmax(240px,1fr))`, gap:12}}>
          {items.map(it => (
            <div key={String(it.listing_id ?? it.id ?? it.product_id ?? it.name)} style={{position:'relative'}}>
              <div style={{position:'absolute', top:8, right:8}}>
                <button onClick={() => removeOne(String(it.listing_id ?? it.id ?? it.product_id ?? it.name))}>Remove</button>
              </div>
              <ProductCard p={it} />
              <div style={{marginTop:8, fontSize:14}}>
                <div><strong>Normalized:</strong> {it.normalized_price ? `₹${it.normalized_price} / ${it.normalized_unit === 'per_100g' ? '100g' : '100ml'}` : 'N/A'}</div>
                <div>Provider: {it.provider}</div>
                <div>Unit: {it.unit}</div>
                <div>Fetched: {it.fetched_at ? new Date(it.fetched_at).toLocaleString() : '-'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
