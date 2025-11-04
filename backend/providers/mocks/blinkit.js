/**
 * providers/mocks/blinkit.js
 */

function sampleTS() { return new Date().toISOString(); }

async function fetchBlinkitProducts(category = 'grocery') {
  return [
    { listing_id: 'blinkit-2001', product_id: 'A1', name: 'Aashirvaad Atta 5 kg', brand: 'Aashirvaad', category, provider: 'Blinkit', price: 405, unit: '5 kg', fetched_at: sampleTS(), url: 'https://blinkit.example/aashirvaad-5kg' },
    { listing_id: 'blinkit-2002', product_id: 'A3', name: 'Parle-G Biscuit 400 g', brand: 'Parle', category, provider: 'Blinkit', price: 48, unit: '400 g', fetched_at: sampleTS(), url: 'https://blinkit.example/parle-g-400g' }
  ];
}

module.exports = { fetchBlinkitProducts };
