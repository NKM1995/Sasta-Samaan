/**
 * providers/swiggy.js
 * Dummy provider fetcher.
 */
async function fetchSwiggyProducts(category='grocery') {
  await new Promise(r => setTimeout(r, 90));
  return [
    { listing_id: 201, product_id: 2, name: "Tata Salt 1 kg", brand:"Tata", provider:"Swiggy Instamart", price:31, unit:"1 kg", fetched_at: new Date().toISOString(), url: null },
    { listing_id: 204, product_id: 4, name: "Daawat Jasmine Rice 5 kg", brand:"Daawat", provider:"Swiggy Instamart", price:501, unit:"5 kg", fetched_at: new Date().toISOString(), url: null }
  ];
}
module.exports = { fetchSwiggyProducts };
