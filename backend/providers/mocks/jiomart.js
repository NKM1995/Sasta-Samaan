/**
 * providers/mocks/jiomart.js
 */

function sampleTS() { return new Date().toISOString(); }

async function fetchJiomartProducts(category = 'grocery') {
  return [
    { listing_id: 'jm-5001', product_id: 'A4', name: 'Daawat Jasmine Rice 5 kg', brand: 'Daawat', category, provider: 'JioMart', price: 500, unit: '5 kg', fetched_at: sampleTS(), url: 'https://jiomart.example/daawat-5kg' },
    { listing_id: 'jm-5002', product_id: 'A5', name: 'Maggi Noodles 2 min 70 g', brand: 'Maggi', category, provider: 'JioMart', price: 12, unit: '70 g', fetched_at: sampleTS(), url: 'https://jiomart.example/maggi-70g' }
  ];
}

module.exports = { fetchJiomartProducts };
