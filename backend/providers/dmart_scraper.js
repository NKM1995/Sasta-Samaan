/**
 * providers/dmart_scraper.js
 * - Dmart scraping stub
 */

const cheerio = require('cheerio');
const { fetchHtmlWithRetries, safeText, safeAttr } = require('./scraperUtil');

async function fetchDmartProducts(category = 'grocery') {
  try {
    const url = `https://www.dmart.in/search?query=${encodeURIComponent(category)}`;
    const html = await fetchHtmlWithRetries(url, { timeout: 12000, maxRetries: 2, cacheTtl: 30 });
    const $ = cheerio.load(html);
    const out = [];

    // placeholder selectors
    $('.product, .product-card, .grid-item').each((i, el) => {
      const node = $(el);
      const name = safeText(node.find('.product-name, .name'));
      const priceText = (safeText(node.find('.price, .offer-price')) || '').replace(/[^0-9.]/g,'');
      const price = Number(priceText) || 0;
      const link = safeAttr(node.find('a'), 'href') || '';

      if (name) {
        out.push({
          listing_id: `dmart-scrape-${i}-${Date.now()}`,
          product_id: null,
          name,
          brand: null,
          category,
          provider: 'Dmart',
          price,
          unit: null,
          fetched_at: new Date().toISOString(),
          url: link.startsWith('http') ? link : `https://www.dmart.in${link}`,
          raw: {}
        });
      }
    });

    if (!out.length) {
      return [{ listing_id: 'dmart-sample-1', product_id: 'DM-SAMPLE-1', name: 'Dmart Sample Item', provider: 'Dmart', price: 95, unit: '1 pc', fetched_at: new Date().toISOString(), url: null }];
    }
    return out;
  } catch (err) {
    console.warn('dmart_scraper failed', err && err.message);
    return [{ listing_id: 'dmart-sample-err', product_id: 'DM-SAMPLE-ERR', name: 'Dmart Sample (error fallback)', provider: 'Dmart', price: 0, unit: null, fetched_at: new Date().toISOString(), url: null }];
  }
}

module.exports = { fetchDmartProducts };
