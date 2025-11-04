/**
 * providers/mocks/instamart.js
 */

function sampleTS() { return new Date().toISOString(); }

async function fetchInstamartProducts(category = 'grocery') {
  return [
    { listing_id: 'insta-3001', product_id: 'A2', name: 'Tata Salt 1 kg', brand: 'Tata', category, provider: 'Instamart', price: 30, unit: '1 kg', fetched_at: sampleTS(), url: 'https://instamart.example/tata-salt-1kg' },
    { listing_id: 'insta-3002', product_id: 'A4', name: 'Daawat Jasmine Rice 5 kg', brand: 'Daawat', category, provider: 'Instamart', price: 495, unit: '5 kg', fetched_at: sampleTS(), url: 'https://instamart.example/daawat-5kg' }
  ];
}

module.exports = { fetchInstamartProducts };
