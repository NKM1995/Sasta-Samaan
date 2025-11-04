import React, { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Admin panel: Unmapped listings + Audit viewer
 *
 * - Enter admin token (x-admin-token or Bearer token)
 * - Two tabs: "Unmapped" (fix listings) and "Audit" (view recent admin actions)
 *
 * WHY:
 * - Allows safe admin operations from the browser by providing token at runtime.
 * - Audit tab helps review and validate manual edits.
 */

export default function Admin({ onClose, onSaved }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [editing, setEditing] = useState({}); // edits per listing
  const [adminTokenInput, setAdminTokenInput] = useState(''); // token typed by user
  const [adminToken, setAdminToken] = useState(''); // token in use for API calls
  const [activeTab, setActiveTab] = useState('unmapped'); // 'unmapped' | 'audit'
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // helper to get headers with token
  const getAuthHeaders = () => {
    const token = (adminToken || '').trim();
    if (!token) return {};
    return { 'x-admin-token': token };
  };

  // load unmapped listings + count
  const loadUnmapped = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axios.get('http://localhost:3000/admin/unmapped', { headers: getAuthHeaders() }),
        axios.get('http://localhost:3000/admin/unmapped/count', { headers: getAuthHeaders() })
      ]);
      setRows(r1.data || []);
      setCount((r2.data && r2.data.count) || 0);
    } catch (err) {
      console.error('Error loading admin unmapped data', err);
      setRows([]);
      setCount(0);
      // if unauthorized, surface message
      if (err && err.response && err.response.status === 401) {
        alert('Unauthorized: admin token required or invalid. Enter token and click "Use token".');
      }
    } finally {
      setLoading(false);
    }
  };

  // load audit rows
  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/admin/audit', { headers: getAuthHeaders() });
      setAuditRows(res.data || []);
    } catch (err) {
      console.error('Error loading audit data', err);
      setAuditRows([]);
      if (err && err.response && err.response.status === 401) {
        alert('Unauthorized: admin token required or invalid. Enter token and click "Use token".');
      }
    } finally {
      setAuditLoading(false);
    }
  };

  // wrapper load based on activeTab
  useEffect(() => {
    if (!adminToken) {
      // don't try to load admin endpoints without token
      setRows([]);
      setCount(0);
      setAuditRows([]);
      return;
    }
    if (activeTab === 'unmapped') {
      loadUnmapped();
    } else {
      loadAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, activeTab]);

  // on component mount, we don't auto-load until token is provided
  useEffect(() => {
    // optional: if you want to prefill token from sessionStorage uncomment below
    // const s = sessionStorage.getItem('adminToken');
    // if (s) { setAdminToken(s); setAdminTokenInput(s); }
  }, []);

  const onChange = (id, field, value) => {
    setEditing(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const save = async (listing_id) => {
    const payload = editing[listing_id] || {};
    try {
      await axios.post('http://localhost:3000/admin/map', { listing_id, ...payload }, { headers: getAuthHeaders() });
      // reload after save
      await loadUnmapped();
      // clear edit state for that id
      setEditing(prev => { const c = { ...prev }; delete c[listing_id]; return c; });

      // notify parent (App) to refresh product list
      if (typeof onSaved === 'function') {
        try { onSaved(); } catch (e) { console.warn('onSaved callback failed', e); }
      }
    } catch (err) {
      console.error('Error saving mapping', err);
      if (err && err.response && err.response.status === 401) {
        alert('Save failed: unauthorized. Check admin token.');
      } else {
        alert('Failed to save. See console for details.');
      }
    }
  };

  // UI: apply token (activate it)
  const applyToken = () => {
    setAdminToken(adminTokenInput.trim());
    // optionally store in sessionStorage for convenience:
    // sessionStorage.setItem('adminToken', adminTokenInput.trim());
  };

  // render
  return (
    <div style={{ padding: 12, background: '#fff', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Admin</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder="Enter admin token"
              value={adminTokenInput}
              onChange={e => setAdminTokenInput(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', width: 320 }}
            />
            <button onClick={applyToken} style={{ padding: '6px 10px', borderRadius: 6 }}>Use token</button>
          </div>
        </div>

        <div>
          <button onClick={() => setActiveTab('unmapped')} style={{ marginRight: 6, padding: '6px 8px', background: activeTab === 'unmapped' ? '#eef' : '#fff' }}>Unmapped</button>
          <button onClick={() => setActiveTab('audit')} style={{ marginRight: 8, padding: '6px 8px', background: activeTab === 'audit' ? '#eef' : '#fff' }}>Audit</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Unmapped tab */}
      {activeTab === 'unmapped' && (
        <>
          <div style={{ marginBottom: 8, color: '#555' }}>
            Unmapped listings (need normalized_price). Count: {count}
          </div>

          <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
            {adminToken === '' && <div style={{ color: '#aa0000' }}>Enter admin token and click "Use token" to load unmapped listings.</div>}
            {loading && adminToken !== '' && <div>Loading unmapped rows…</div>}

            {!loading && rows.length === 0 && <div>No unmapped listings found.</div>}

            {rows.map(r => {
              const e = editing[r.listing_id] || {};
              return (
                <div key={r.listing_id} style={{ padding: 10, borderBottom: '1px solid #eee', display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight:700 }}>{r.raw_name}</div>
                    <div style={{ color:'#666', fontSize:13 }}>{r.provider} • unit: {r.unit} • price: ₹{r.price}</div>
                    <div style={{ color:'#999', fontSize:12 }}>Fetched: {r.fetched_at ? new Date(r.fetched_at).toLocaleString() : '-'}</div>
                  </div>

                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input
                      type="number"
                      placeholder="normalized price"
                      value={e.normalized_price === undefined || e.normalized_price === null ? '' : e.normalized_price}
                      onChange={(ev) => onChange(r.listing_id,'normalized_price', ev.target.value ? parseFloat(ev.target.value) : null)}
                      style={{ width:120, padding:6 }}
                    />
                    <select
                      value={e.normalized_unit || ''}
                      onChange={(ev) => onChange(r.listing_id,'normalized_unit', ev.target.value)}
                      style={{ padding:6 }}
                    >
                      <option value="">unit</option>
                      <option value="per_100g">per_100g</option>
                      <option value="per_100ml">per_100ml</option>
                    </select>
                    <input
                      type="number"
                      placeholder="product_id"
                      value={e.product_id === undefined || e.product_id === null ? '' : e.product_id}
                      onChange={(ev) => onChange(r.listing_id,'product_id', ev.target.value ? parseInt(ev.target.value,10) : null)}
                      style={{ width:100, padding:6 }}
                    />
                    <button onClick={() => save(r.listing_id)} style={{ padding:'6px 8px' }}>Save</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Audit tab */}
      {activeTab === 'audit' && (
        <>
          <div style={{ marginBottom: 8, color: '#555' }}>
            Recent admin actions (most recent first)
          </div>

          {!adminToken && <div style={{ color: '#aa0000' }}>Enter admin token and click "Use token" to load audit entries.</div>}
          {auditLoading && <div>Loading audit rows…</div>}

          <div style={{ maxHeight: '60vh', overflow: 'auto', borderTop: '1px solid #eee' }}>
            {auditRows.length === 0 && !auditLoading && <div style={{ padding: 12 }}>No audit rows to show.</div>}
            {auditRows.map(a => {
              let parsed = null;
              try { parsed = JSON.parse(a.payload); } catch (e) { parsed = null; }
              return (
                <div key={a.id} style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{a.action} — listing {a.listing_id}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>by {a.admin_id || 'unknown'} • {a.created_at}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 160 }}>
                      <div style={{ fontSize: 12, color: '#333' }}>{a.payload}</div>
                    </div>
                  </div>
                  {parsed && (
                    <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{JSON.stringify(parsed, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
