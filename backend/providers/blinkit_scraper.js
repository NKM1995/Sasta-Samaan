/**
 * providers/blinkit_scraper.js
 * - Simple Blinkit scraper using cheerio.
 * - Update selectors after inspecting Blinkit search or category pages.
 */

const cheerio = require('cheerio');
const { fetchHtmlWithRetries, safeText, safeAttr } = require('./scraperUtil');

async function fetchBlinkitProducts(category = 'grocery') {
  try {
    const url = `https://www.blinkit.com/search?q=${encodeURIComponent(category)}`;
    const html = await fetchHtmlWithRetries(url, { timeout: 12000, maxRetries: 2, cacheTtl: 30 });
    const $ = cheerio.load(html);
    const out = [];

    // Adjust selectors to current Blinkit markup
    $('.product-card, .product, .grid-card').each((i, el) => {
      const node = $(el);
      const name = safeText(node.find('.product-title, .product-name, .name'));
      const priceText = (safeText(node.find('.price, .selling-price')) || '').replace(/[^0-9.]/g,'');
      const price = Number(priceText) || 0;
      const link = safeAttr(node.find('a'), 'href') || '';

      if (name) {
        out.push({
          listing_id: `blinkit-scrape-${i}-${Date.now()}`,
          product_id: null,
          name,
          brand: null,
          category,
          provider: 'Blinkit',
          price,
          unit: null,
          fetched_at: new Date().toISOString(),
          url: link.startsWith('http') ? link : `https://www.blinkit.com${link}`,
          raw: {}
        });
      }
    });

    if (!out.length) {
      return [{ listing_id: 'blinkit-sample-1', product_id: 'B-SAMPLE-1', name: 'Blinkit Sample Item', provider: 'Blinkit', price: 80, unit: '1 pc', fetched_at: new Date().toISOString(), url: null }];
    }
    return out;
  } catch (err) {
    console.warn('blinkit_scraper failed', err && err.message);
    return [{ listing_id: 'blinkit-sample-err', product_id: 'B-SAMPLE-ERR', name: 'Blinkit Sample (error fallback)', provider: 'Blinkit', price: 0, unit: null, fetched_at: new Date().toISOString(), url: null }];
  }
}

module.exports = { fetchBlinkitProducts };
