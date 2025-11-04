/**
 * providers/zepto.js
 * Dummy provider fetcher. Replace with real API call or scraper.
 */
async function fetchZeptoProducts(category='grocery') {
  // simulate network delay
  await new Promise(r => setTimeout(r, 60));
  return [
    { listing_id: 301, product_id: 1, name: "Aashirvaad Atta 5 kg", brand:"Aashirvaad", provider: "Zepto", price: 397, unit:"5 kg", fetched_at: new Date().toISOString(), url: null },
    { listing_id: 303, product_id: 3, name: "Parle-G Biscuit 400 g", brand:"Parle", provider:"Zepto", price: 49, unit:"400 g", fetched_at: new Date().toISOString(), url: null }
  ];
}
module.exports = { fetchZeptoProducts };
