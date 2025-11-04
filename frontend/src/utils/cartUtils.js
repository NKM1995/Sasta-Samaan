/**
 * src/utils/cartUtils.js
 * Persistent per-provider carts using localStorage.
 * Now:
 * - Uses canonical provider keys via providerUtils
 * - Emits a global window event 'sasta:cart:changed' after every mutation
 */

import { canonicalKey } from './providerUtils';

const CART_KEY = 'sasta_provider_carts';

function defaultCarts() {
  return { zepto: [], blinkit: [], instamart: [], bigbasket: [], jiomart: [], dmart: [], swiggy: [] };
}

export function loadCarts() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return defaultCarts();
    const parsed = JSON.parse(raw);
    return { ...defaultCarts(), ...parsed };
  } catch (e) {
    console.warn('loadCarts error', e);
    return defaultCarts();
  }
}

function saveToStorage(carts) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(carts));
    // notify listeners
    try { window.dispatchEvent(new CustomEvent('sasta:cart:changed')); } catch(e) {}
  } catch (e) {
    console.warn('saveCarts error', e);
  }
}

export function saveCarts(carts) {
  saveToStorage(carts);
}

export function addToCart(providerName, product) {
  const key = canonicalKey(providerName);
  const carts = loadCarts();
  const cart = carts[key] || [];
  const existing = cart.find(p => String(p.product_id) === String(product.product_id));
  if (!existing) {
    cart.push({ ...product, qty: 1 });
  } else {
    existing.qty = (existing.qty || 1) + 1;
  }
  carts[key] = cart;
  saveToStorage(carts);
  return carts;
}

export function removeFromCart(providerName, product_id) {
  const key = canonicalKey(providerName);
  const carts = loadCarts();
  carts[key] = (carts[key] || []).filter(p => String(p.product_id) !== String(product_id));
  saveToStorage(carts);
  return carts;
}

export function clearCart(providerName) {
  const key = canonicalKey(providerName);
  const carts = loadCarts();
  carts[key] = [];
  saveToStorage(carts);
  return carts;
}
