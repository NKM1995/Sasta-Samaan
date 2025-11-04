/**
 * providers/instamart_scraper.js
 * - Swiggy Instamart / Instamart scraping stub
 */

const cheerio = require('cheerio');
const { fetchHtmlWithRetries, safeText, safeAttr } = require('./scraperUtil');

async function fetchInstamartProducts(category = 'grocery') {
  try {
    const url = `https://www.instamart.in/search?q=${encodeURIComponent(category)}`;
    const html = await fetchHtmlWithRetries(url, { timeout: 12000, maxRetries: 2, cacheTtl: 30 });
    const $ = cheerio.load(html);
    const out = [];

    // placeholder selectors
    $('.product-card, .product-item, .product').each((i, el) => {
      const node = $(el);
      const name = safeText(node.find('.product-name, .title'));
      const priceText = (safeText(node.find('.price, .selling-price')) || '').replace(/[^0-9.]/g,'');
      const price = Number(priceText) || 0;
      const link = safeAttr(node.find('a'), 'href') || '';

      if (name) {
        out.push({
          listing_id: `instamart-scrape-${i}-${Date.now()}`,
          product_id: null,
          name,
          brand: null,
          category,
          provider: 'Instamart',
          price,
          unit: null,
          fetched_at: new Date().toISOString(),
          url: link.startsWith('http') ? link : `https://www.instamart.in${link}`,
          raw: {}
        });
      }
    });

    if (!out.length) {
      return [{ listing_id: 'instamart-sample-1', product_id: 'I-SAMPLE-1', name: 'Instamart Sample Item', provider: 'Instamart', price: 75, unit: '1 pc', fetched_at: new Date().toISOString(), url: null }];
    }
    return out;
  } catch (err) {
    console.warn('instamart_scraper failed', err && err.message);
    return [{ listing_id: 'instamart-sample-err', product_id: 'I-SAMPLE-ERR', name: 'Instamart Sample (error fallback)', provider: 'Instamart', price: 0, unit: null, fetched_at: new Date().toISOString(), url: null }];
  }
}

module.exports = { fetchInstamartProducts };
