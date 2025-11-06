import React, { useEffect, useState } from 'react';
import { loadCarts, removeFromCart, clearCart } from '../utils/cartUtils';
import { displayName } from '../utils/providerUtils';

/**
 * CartsPage with Checkout flows:
 * - Checkout per provider: open links for that provider (first product by default)
 * - Checkout all: confirm and open one tab per provider (first product), and provide "Copy order summary"
 */

function buildOrderSummary(carts) {
  const lines = [];
  Object.keys(carts).forEach(pk => {
    const items = carts[pk] || [];
    if (!items.length) return;
    lines.push(`${displayName(pk)} (${items.length} item${items.length>1?'s':''}):`);
    items.forEach(it => lines.push(`  - ${it.name} × ${it.qty || 1} — ₹${it.price}`));
    lines.push('');
  });
  return lines.join('\n');
}

export default function CartsPage() {
  const [carts, setCarts] = useState(() => loadCarts());
  const providerKeys = Object.keys(carts);
  const [active, setActive] = useState(providerKeys[0] || 'instamart');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    function onChange() { setCarts(loadCarts()); }
    window.addEventListener('sasta:cart:changed', onChange);
    window.addEventListener('storage', onChange);
    return () => { window.removeEventListener('sasta:cart:changed', onChange); window.removeEventListener('storage', onChange); };
  }, []);

  useEffect(() => {
    if (!providerKeys.includes(active)) {
      setActive(providerKeys[0] || 'instamart');
    }
  }, [carts]); // recalc when carts change

  function remove(providerKey, product_id, name) {
    const next = removeFromCart(providerKey, product_id);
    setCarts(next);
    window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: `${name} removed from ${displayName(providerKey)}`, actionText: null } }));
  }

  function empty(providerKey) {
    const next = clearCart(providerKey);
    setCarts(next);
    window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: `${displayName(providerKey)} cart cleared` } }));
  }

  function checkoutProvider(providerKey, openAllProducts = false) {
    const items = carts[providerKey] || [];
    if (!items.length) {
      window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: `No items in ${displayName(providerKey)} cart` } }));
      return;
    }

    if (openAllProducts) {
      // Attempt to open each product link in new tab — warn user first if many
      items.forEach(it => {
        if (it.link) window.open(it.link, '_blank');
      });
    } else {
      // Open first product page as an entry point to provider
      const first = items[0];
      if (first && first.link) window.open(first.link, '_blank');
      else window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: `No product link available for ${displayName(providerKey)}` } }));
    }
  }

  function checkoutAll() {
    // open one tab per provider with at least one product (first product link)
    const providersToOpen = Object.keys(carts).filter(pk => (carts[pk] || []).length > 0);
    if (providersToOpen.length === 0) {
      window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: 'No items across carts to checkout' } }));
      return;
    }
    // Show confirmation modal / dialog
    setConfirmOpen(true);
  }

  function confirmAndOpen(providersToOpen, openAllProducts = false) {
    // Open in new tabs
    providersToOpen.forEach(pk => {
      const arr = carts[pk] || [];
      if (!arr.length) return;
      if (openAllProducts) {
        arr.forEach(it => { if (it.link) window.open(it.link, '_blank'); });
      } else {
        const first = arr[0];
        if (first && first.link) window.open(first.link, '_blank');
      }
    });
    setConfirmOpen(false);
  }

  function copyOrderSummary() {
    const summary = buildOrderSummary(carts);
    try {
      navigator.clipboard.writeText(summary);
      window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: 'Order summary copied to clipboard' } }));
    } catch (e) {
      // fallback: prompt
      window.prompt('Copy the order summary:', summary);
    }
  }

  const totalOverall = Object.keys(carts).reduce((s, pk) => s + ((carts[pk] || []).reduce((ss, i) => ss + (i.price * (i.qty || 1)), 0)), 0);

  return (
    <div style={{ padding: 20 }}>
      <h2>My Carts</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {providerKeys.map(pk => (
          <button key={pk} onClick={() => setActive(pk)} style={{
            padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: active === pk ? '#007bff' : '#eee', color: active === pk ? '#fff' : '#000'
          }}>{displayName(pk)} ({(carts[pk] || []).length})</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => checkoutAll()} style={{ padding:'8px 12px', background:'#0ea5e9', color:'#fff', border:'none', borderRadius:6 }}>Checkout all</button>
          <button onClick={() => copyOrderSummary()} style={{ padding:'8px 12px', borderRadius:6 }}>Copy order summary</button>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        {(!carts[active] || carts[active].length === 0) ? (
          <div>No items in {displayName(active)} cart.</div>
        ) : (
          <>
            {carts[active].map(item => (
              <div key={String(item.product_id)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>₹{item.price} × {item.qty}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <button onClick={() => remove(active, item.product_id, item.name)} style={{ background: '#eee', border: 'none', padding: '6px 8px', borderRadius: 6 }}>Remove</button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 12, fontWeight: 700 }}>Total for {displayName(active)}: ₹{(carts[active] || []).reduce((s, i) => s + (i.price * (i.qty || 1)), 0)}</div>

            <div style={{ marginTop: 8, display:'flex', gap:8 }}>
              <button onClick={() => checkoutProvider(active, false)} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6 }}>Open {displayName(active)} (first product)</button>

              <button onClick={() => {
                if (!confirm(`This will attempt to open ${ (carts[active]||[]).length } product tabs for ${displayName(active)}. Continue?`)) return;
                checkoutProvider(active, true);
              }} style={{ padding: '8px 12px' }}>Open all product pages</button>

              <button onClick={() => empty(active)} style={{ marginLeft: 8, padding: '8px 12px' }}>Clear</button>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 18, color:'#374151' }}>
        <strong>Overall total:</strong> ₹{totalOverall}
      </div>

      {/* confirm modal - simple inline */}
      {confirmOpen && (
        <div style={{
          position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.35)', zIndex:1200
        }}>
          <div style={{ background:'#fff', padding:20, borderRadius:8, width:520, maxWidth:'90%' }}>
            <h3>Confirm checkout for all providers</h3>
            <p>This will open one tab per provider (first product link) for providers with items. You can also open all product pages per provider from each cart.</p>
            <div style={{ marginTop:10 }}>
              <button onClick={() => {
                const providersToOpen = Object.keys(carts).filter(pk => (carts[pk] || []).length > 0);
                confirmAndOpen(providersToOpen, false);
              }} style={{ background:'#0284c7', color:'#fff', padding:'8px 12px', border:'none', borderRadius:6 }}>Open one tab per provider</button>

              <button onClick={() => {
                const providersToOpen = Object.keys(carts).filter(pk => (carts[pk] || []).length > 0);
                if (!confirm('Open EVERY product page for all providers? This may open many tabs. Continue?')) return;
                confirmAndOpen(providersToOpen, true);
              }} style={{ marginLeft:8, padding:'8px 12px' }}>Open all product pages</button>

              <button onClick={() => setConfirmOpen(false)} style={{ marginLeft:8, padding:'8px 12px' }}>Cancel</button>
            </div>
            <div style={{ marginTop:12 }}>
              <button onClick={() => copyOrderSummary()} style={{ padding:'8px 12px' }}>Copy order summary</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
