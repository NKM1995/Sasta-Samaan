/**
 * clean_fetched_at.js
 * - Trims trailing commas from listings.fetched_at and validates timestamps.
 * - If fetched_at is invalid after trimming, sets to current time (ISO).
 */

const db = require('./db');

function clean() {
  const rows = db.prepare(`SELECT id, fetched_at FROM listings`).all();
  const update = db.prepare(`UPDATE listings SET fetched_at = @fetched_at WHERE id = @id`);
  const now = new Date().toISOString();
  let changed = 0;

  const tx = db.transaction((rows) => {
    for (const r of rows) {
      if (!r.fetched_at) {
        update.run({ id: r.id, fetched_at: now });
        changed++;
        continue;
      }
      // remove surrounding whitespace and trailing commas
      let s = String(r.fetched_at).trim();
      if (s.endsWith(',')) s = s.slice(0, -1).trim();
      // try to parse
      const d = new Date(s);
      if (isNaN(d.getTime())) {
        // replace with now
        update.run({ id: r.id, fetched_at: now });
        changed++;
      } else {
        // store normalized ISO string (to keep consistency)
        const iso = d.toISOString();
        if (iso !== r.fetched_at) {
          update.run({ id: r.id, fetched_at: iso });
          changed++;
        }
      }
    }
  });

  tx(rows);
  console.log('Clean complete. Rows changed:', changed);
}

clean();
