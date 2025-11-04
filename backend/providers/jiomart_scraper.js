/**
 * providers/jiomart_scraper.js
 * - JioMart scraping stub
 */

const cheerio = require('cheerio');
const { fetchHtmlWithRetries, safeText, safeAttr } = require('./scraperUtil');

async function fetchJiomartProducts(category = 'grocery') {
  try {
    const url = `https://www.jiomart.com/search/?q=${encodeURIComponent(category)}`;
    const html = await fetchHtmlWithRetries(url, { timeout: 12000, maxRetries: 2, cacheTtl: 30 });
    const $ = cheerio.load(html);
    const out = [];

    // placeholder selectors
    $('.product-card, .product').each((i, el) => {
      const node = $(el);
      const name = safeText(node.find('.name, .product-title'));
      const priceText = (safeText(node.find('.price, .selling-price')) || '').replace(/[^0-9.]/g,'');
      const price = Number(priceText) || 0;
      const link = safeAttr(node.find('a'), 'href') || '';

      if (name) {
        out.push({
          listing_id: `jiomart-scrape-${i}-${Date.now()}`,
          product_id: null,
          name,
          brand: null,
          category,
          provider: 'JioMart',
          price,
          unit: null,
          fetched_at: new Date().toISOString(),
          url: link.startsWith('http') ? link : `https://www.jiomart.com${link}`,
          raw: {}
        });
      }
    });

    if (!out.length) {
      return [{ listing_id: 'jiomart-sample-1', product_id: 'JM-SAMPLE-1', name: 'JioMart Sample Item', provider: 'JioMart', price: 110, unit: '1 pc', fetched_at: new Date().toISOString(), url: null }];
    }
    return out;
  } catch (err) {
    console.warn('jiomart_scraper failed', err && err.message);
    return [{ listing_id: 'jiomart-sample-err', product_id: 'JM-SAMPLE-ERR', name: 'JioMart Sample (error fallback)', provider: 'JioMart', price: 0, unit: null, fetched_at: new Date().toISOString(), url: null }];
  }
}

module.exports = { fetchJiomartProducts };
