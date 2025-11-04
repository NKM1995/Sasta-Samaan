/**
 * providers/mocks/zepto.js
 * Mock provider for Zepto — returns deterministic demo listings
 */

function sampleTS() { return new Date().toISOString(); }

async function fetchZeptoProducts(category = 'grocery') {
  // mock data aligned to API contract
  return [
    { listing_id: 'zepto-1001', product_id: 'A1', name: 'Aashirvaad Atta 5 kg', brand: 'Aashirvaad', category, provider: 'Zepto', price: 399, unit: '5 kg', fetched_at: sampleTS(), url: 'https://zepto.example/ashirvaad-5kg' },
    { listing_id: 'zepto-1002', product_id: 'A2', name: 'Tata Salt 1 kg', brand: 'Tata', category, provider: 'Zepto', price: 32, unit: '1 kg', fetched_at: sampleTS(), url: 'https://zepto.example/tata-salt-1kg' }
  ];
}

module.exports = { fetchZeptoProducts };
