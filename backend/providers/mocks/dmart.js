/**
 * providers/mocks/dmart.js
 */

function sampleTS() { return new Date().toISOString(); }

async function fetchDmartProducts(category = 'grocery') {
  return [
    { listing_id: 'dm-6001', product_id: 'A3', name: 'Parle-G Biscuit 400 g', brand: 'Parle', category, provider: 'Dmart', price: 49, unit: '400 g', fetched_at: sampleTS(), url: 'https://dmart.example/parle-g-400g' },
    { listing_id: 'dm-6002', product_id: 'A5', name: 'Maggi Noodles 2 min 70 g', brand: 'Maggi', category, provider: 'Dmart', price: 13, unit: '70 g', fetched_at: sampleTS(), url: 'https://dmart.example/maggi-70g' }
  ];
}

module.exports = { fetchDmartProducts };
