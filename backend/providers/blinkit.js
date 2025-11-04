/**
 * providers/blinkit.js
 * Dummy provider fetcher.
 */
async function fetchBlinkitProducts(category='grocery') {
  await new Promise(r => setTimeout(r, 80));
  return [
    { listing_id: 101, product_id: 1, name: "Aashirvaad Atta 5 kg", brand:"Aashirvaad", provider:"Blinkit", price:395, unit:"5 kg", fetched_at: new Date().toISOString(), url: null },
    { listing_id: 103, product_id: 3, name: "Parle-G Biscuit 400 g", brand:"Parle", provider:"Blinkit", price:51, unit:"400 g", fetched_at: new Date().toISOString(), url: null }
  ];
}
module.exports = { fetchBlinkitProducts };
