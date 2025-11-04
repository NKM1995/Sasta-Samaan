/**
 * fetch_all_providers.js - run to fetch provider data and write products.json
 * Usage: node fetch_all_providers.js
 */
const fs = require('fs');
const path = require('path');
const { fetchZeptoProducts } = require('./providers/zepto');
const { fetchBlinkitProducts } = require('./providers/blinkit');
const { fetchSwiggyProducts } = require('./providers/swiggy');

async function run() {
  try {
    const [z, b, s] = await Promise.all([
      fetchZeptoProducts().catch(()=>[]),
      fetchBlinkitProducts().catch(()=>[]),
      fetchSwiggyProducts().catch(()=>[])
    ]);
    const all = [...z, ...b, ...s];
    const outPath = path.join(__dirname, 'products.json');
    fs.writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf8');
    console.log('Wrote', outPath, 'count=', all.length);
  } catch (err) {
    console.error('fetch_all_providers err', err);
    process.exit(1);
  }
}

run();
