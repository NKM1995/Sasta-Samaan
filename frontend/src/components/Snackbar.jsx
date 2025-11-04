import React, { useEffect, useState } from 'react';

/**
 * Global Snackbar component.
 * Listens for window events:
 *  - 'sasta:toast' with detail { message, actionText?, action? (function name), payload? }
 *
 * Example to show toast:
 * window.dispatchEvent(new CustomEvent('sasta:toast', { detail: { message: 'Added to Zepto cart', actionText: 'Undo', payload: { provider: 'zepto', product_id: 'A123' }}}));
 *
 * For 'Undo' we expect window to have a handler registered at window.sastaUndo (set below).
 */

export default function Snackbar() {
  const [queue, setQueue] = useState([]); // array of {id, message, actionText, payload}
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    function onToast(e) {
      const detail = (e && e.detail) || {};
      const id = Date.now() + Math.random().toString(36).slice(2,8);
      setQueue(q => [...q, { id, message: detail.message || '', actionText: detail.actionText || null, payload: detail.payload || null }]);
    }
    window.addEventListener('sasta:toast', onToast);
    return () => window.removeEventListener('sasta:toast', onToast);
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(q => q.slice(1));
    }
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setCurrent(null);
    }, 3800); // visible duration
    return () => clearTimeout(timer);
  }, [current]);

  function onAction() {
    if (!current) return;
    // call global undo handler if exists
    try {
      if (typeof window.sastaUndo === 'function') {
        window.sastaUndo(current.payload);
      }
    } catch (e) {
      console.warn('sastaUndo failed', e);
    }
    // dismiss immediately
    setCurrent(null);
  }

  if (!current) return null;

  return (
    <div style={{
      position:'fixed',
      left:'50%',
      transform:'translateX(-50%)',
      bottom:24,
      zIndex:9999,
      display:'flex',
      alignItems:'center',
      gap:12,
      padding:'10px 14px',
      background:'rgba(16,24,40,0.98)',
      color:'#fff',
      borderRadius:10,
      boxShadow:'0 6px 24px rgba(2,6,23,0.4)',
      minWidth: 220,
      maxWidth: '80%',
      fontSize: 14
    }}>
      <div style={{flex:1}}>{current.message}</div>
      {current.actionText ? (
        <button onClick={onAction} style={{
          background:'transparent',
          color:'#7be495',
          border:'none',
          fontWeight:700,
          cursor:'pointer',
          padding:'6px 8px',
          borderRadius:8
        }}>{current.actionText}</button>
      ) : null}
    </div>
  );
}
