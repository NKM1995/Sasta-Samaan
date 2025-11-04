/**
 * add_admin_audit.js
 * Adds admin_audit table for recording admin operations.
 */
const db = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_audit (
    id INTEGER PRIMARY KEY,
    listing_id INTEGER,
    action TEXT NOT NULL,
    payload TEXT, -- JSON string of the changes
    admin_id TEXT, -- masked token or identifier
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log('admin_audit table ensured.');
