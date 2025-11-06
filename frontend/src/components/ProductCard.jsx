import React, { useEffect, useState } from 'react';
import { addToCart, loadCarts, removeFromCart } from '../utils/cartUtils';
import { canonicalKey, displayName } from '../utils/providerUtils';

/**
 * ProductCard with immediate visual confirmation when adding to cart:
 * - cart button becomes a green check for 2.5s after add
 * - clicking the check performs undo (removes item)
 * - still emits sasta:cart:changed and sasta:toast as before
 */

export default function ProductCard({ product, showOnlyCheapest = false }) {
  const [addedMap, setAddedMap] = useState(() => {
    const carts = loadCarts();
    const map = {};
    Object.keys(carts).forEach(k => { (carts[k] || []).forEach(item => {
      if (String(item.product_id) === String(product.product_id || product.name)) map[k] = true;
    }); });
    return map;
  });

  // transient visual states for provider keys: { providerKey: { showCheck: bool, timeoutId } }
  const [visualState, setVisualState] = useState({});

  // compute listings & cheapest as before
  const listings = (product.listings || []).slice();
  let cheapest = null;
  listings.forEach(l => {
    const p = Number(l.price);
    if (!isNaN(p) && (cheapest === null || p < Number(cheapest.price))) cheapest = l;
  });
  const effectiveListings = showOnlyCheapest ? (cheapest ? [cheapest] : []) : listings;

  // helper: show temporary check for providerKey
  function showTransientCheck(providerKey, duration = 2500) {
    // clear existing timer if any
    const prev = visualState[providerKey];
    if (prev && prev.timeoutId) clearTimeout(prev.timeoutId);

    const timeoutId = setTimeout(() => {
      setVisualState(s => ({ ...s, [providerKey]: { showCheck: false, timeoutId: null } }));
    }, duration);

    setVisualState(s => ({ ...s, [providerKey]: { showCheck: true, timeoutId } }));
  }

  function handleAdd(listing) {
    const key = canonicalKey(listing.provider);
    const item = {
      product_id: product.product_id || product.name,
      name: product.name,
      price: listing.price,
      provider: displayName(listing.provider),
      link: listing.link || (listing.raw && listing.raw.url) || '#',
    };
    addToCart(key, item);
    setAddedMap(prev => ({ ...prev, [key]: true }));
    try { window.dispatchEvent(new CustomEvent('sasta:cart:changed')); } catch(e) {}
    try { window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: `${product.name} added to ${displayName(listing.provider)} cart`, actionText: 'Undo', payload: { providerKey: key, product_id: item.product_id } } })); } catch(e){}
    // transient visual check
    showTransientCheck(key, 2500);
    // register undo handler (same as before)
    window.sastaUndo = function(payload) {
      try {
        removeFromCart(payload.providerKey, payload.product_id);
        window.dispatchEvent(new CustomEvent('sasta:cart:changed'));
      } catch (e) { console.warn('undo failed', e); }
    };
  }

  function handleCheckClick(listing) {
    // Undo behavior: remove from cart
    const key = canonicalKey(listing.provider);
    const pid = product.product_id || product.name;
    removeFromCart(key, pid);
    setAddedMap(prev => ({ ...prev, [key]: false }));
    // show a small "Removed" toast
    try { window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: `${product.name} removed from ${displayName(listing.provider)}`, actionText: null } })); } catch(e){}
    window.dispatchEvent(new CustomEvent('sasta:cart:changed'));
    // clear visual state
    const prev = visualState[key];
    if (prev && prev.timeoutId) clearTimeout(prev.timeoutId);
    setVisualState(s => ({ ...s, [key]: { showCheck: false, timeoutId: null } }));
  }

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(visualState).forEach(v => { if (v && v.timeoutId) clearTimeout(v.timeoutId); });
    };
  }, [visualState]);

  return (
    <article className="card" aria-label={product.name} style={{ padding:12 }}>
      <div>
        <div className="title" style={{ fontWeight:600 }}>{product.name}</div>
        <div className="meta" style={{ color:'#6b7280', fontSize:13 }}>{product.brand}{product.unit ? ` • ${product.unit}` : ''}</div>
      </div>

      <div style={{ marginTop: 10 }}>
        {effectiveListings.map(listing => {
          const key = canonicalKey(listing.provider);
          const isAdded = !!addedMap[key];
          const vs = visualState[key] || { showCheck: false };
          const isCheapest = cheapest && String(listing.provider).toLowerCase().includes(String(cheapest.provider).toLowerCase()) && Number(listing.price) === Number(cheapest.price);

          return (
            <div key={String(listing.listing_id || listing.provider)} className={`provider-row ${isCheapest ? 'cheapest' : ''}`} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
              <div style={{ display:'flex', flexDirection:'column' }}>
                <div style={{ fontWeight:600 }}>{displayName(listing.provider)}</div>
                <div style={{ fontSize:12, color:'#6b7280' }}>{listing.unit ? `${listing.unit}` : ''}{listing.fetched_at ? ` • ${new Date(listing.fetched_at).toLocaleDateString()}` : ''}</div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ textAlign:'right', minWidth:80 }}>
                  <div style={{ fontWeight:700, fontSize:16 }}>₹{listing.price}</div>
                  {listing.normalized_price ? <div style={{ fontSize:12, color:'#10b981' }}>₹{listing.normalized_price} / {listing.normalized_unit === 'per_100g' ? '100g' : listing.normalized_unit}</div> : null}
                </div>

                {/* Cart button or transient check */}
                {!vs.showCheck ? (
                  <button
                    className="cart-btn"
                    disabled={isAdded}
                    title={isAdded ? 'Already in cart' : `Add to ${displayName(listing.provider)} cart`}
                    aria-label={isAdded ? 'Already in cart' : `Add to ${displayName(listing.provider)} cart`}
                    onClick={() => handleAdd(listing)}
                    style={{
                      width:40, height:40, borderRadius:10, border:'none', cursor:isAdded?'default':'pointer',
                      background:isAdded ? '#d1fae5' : '#111827', color:isAdded ? '#065f46' : '#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center'
                    }}
                  >
                    🛒
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckClick(listing)}
                    title="Undo / remove"
                    aria-label="Undo / remove"
                    style={{
                      width:40, height:40, borderRadius:10, border:'none', cursor:'pointer',
                      background:'#16a34a', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:'0 6px 18px rgba(16,185,129,0.18)', transition:'transform 160ms ease'
                    }}
                  >
                    ✅
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
