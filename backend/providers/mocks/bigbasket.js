/**
 * providers/mocks/bigbasket.js
 */

function sampleTS() { return new Date().toISOString(); }

async function fetchBigBasketProducts(category = 'grocery') {
  return [
    { listing_id: 'bb-4001', product_id: 'A1', name: 'Aashirvaad Atta 5 kg', brand: 'Aashirvaad', category, provider: 'BigBasket', price: 398, unit: '5 kg', fetched_at: sampleTS(), url: 'https://bigbasket.example/aashirvaad-5kg' },
    { listing_id: 'bb-4002', product_id: 'A3', name: 'Parle-G Biscuit 400 g', brand: 'Parle', category, provider: 'BigBasket', price: 50, unit: '400 g', fetched_at: sampleTS(), url: 'https://bigbasket.example/parle-g-400g' }
  ];
}

module.exports = { fetchBigBasketProducts };
