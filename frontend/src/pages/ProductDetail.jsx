import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard';

const COMPARE_KEY = 'sasta_compare_listings';
function loadCompare() { try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]').map(String); } catch (e) { return []; } }
function saveCompare(arr) { localStorage.setItem(COMPARE_KEY, JSON.stringify(arr.map(String))); }

export default function ProductDetail(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareList, setCompareList] = useState(loadCompare());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get('/products', { params: {} });
        const all = res.data || [];
        const items = all.filter(p => String(p.listing_id) === String(id) || String(p.product_id) === String(id));
        const result = items.length ? items : all.filter(p => (p.name || '').toLowerCase().includes(String(id).toLowerCase()));
        setListings(result);
      } catch (e) {
        console.error(e);
        setListings([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function toggleCompare(listing_id) {
    const cur = loadCompare();
    const sId = String(listing_id);
    const exists = cur.includes(sId);
    const next = exists ? cur.filter(x => x !== sId) : [...cur, sId];
    setCompareList(next);
    saveCompare(next);
  }

  return (
    <div style={{padding:20}}>
      <button onClick={() => navigate(-1)} style={{marginBottom:12}}>← Back</button>
      <h2>Product listings</h2>
      {loading && <div>Loading...</div>}
      {!loading && listings.length === 0 && <div>No listings found for this product.</div>}

      {!loading && listings.length > 0 && (
        <>
          <div style={{marginBottom:12}}>
            <strong>{listings[0].name}</strong> — {listings.length} listing(s)
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12}}>
            {listings.map(l => (
              <div key={String(l.listing_id ?? l.id ?? l.product_id ?? l.name)} style={{position:'relative'}}>
                <div style={{position:'absolute', top:8, right:8}}>
                  <label style={{fontSize:12}}>
                    <input
                      type="checkbox"
                      checked={loadCompare().includes(String(l.listing_id ?? l.id ?? l.product_id ?? l.name))}
                      onChange={() => toggleCompare(l.listing_id ?? l.id ?? l.product_id ?? l.name)}
                    /> Compare
                  </label>
                </div>
                <ProductCard p={l} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
