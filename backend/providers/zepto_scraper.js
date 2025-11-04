/**
 * providers/zepto_scraper.js
 * - Simple scraper stub for Zepto-like listing pages
 * - You must inspect Zepto public listing pages for accurate selectors
 */

const cheerio = require('cheerio');
const { fetchHtmlWithRetries, safeText, safeAttr } = require('./scraperUtil');

async function fetchZeptoProducts(category = 'grocery') {
  try {
    // Example category URL - replace with the correct city/zone path if needed
    const url = `https://www.zepto.com/search?query=${encodeURIComponent(category)}`;
    const html = await fetchHtmlWithRetries(url, { timeout: 12000, maxRetries: 2, cacheTtl: 30 });
    const $ = cheerio.load(html);

    const out = [];
    // NOTE: selectors below are placeholders — inspect the real page and update selectors
    $('.product-card, .item-card, .product-listing').each((i, el) => {
      const node = $(el);
      const name = safeText(node.find('.product-title, .name, .product-name'));
      const priceText = (safeText(node.find('.price, .product-price')) || '').replace(/[^0-9.]/g,'');
      const price = Number(priceText) || 0;
      const urlRel = safeAttr(node.find('a'), 'href') || '';
      const link = urlRel ? (urlRel.startsWith('http') ? urlRel : `https://www.zepto.com${urlRel}`) : null;

      if (name) {
        out.push({
          listing_id: `zepto-scrape-${i}-${Date.now()}`,
          product_id: null,
          name,
          brand: null,
          category,
          provider: 'Zepto',
          price,
          unit: null,
          fetched_at: new Date().toISOString(),
          url: link,
          raw: {}
        });
      }
    });

    // fallback sample if out empty
    if (!out.length) {
      return [{ listing_id: 'zepto-sample-1', product_id: 'Z-SAMPLE-1', name: 'Zepto Sample Item', provider: 'Zepto', price: 99, unit: '1 pc', fetched_at: new Date().toISOString(), url: null }];
    }
    return out;
  } catch (err) {
    console.warn('zepto_scraper failed', err && err.message);
    return [{ listing_id: 'zepto-sample-err', product_id: 'Z-SAMPLE-ERR', name: 'Zepto Sample (error fallback)', provider: 'Zepto', price: 0, unit: null, fetched_at: new Date().toISOString(), url: null }];
  }
}

module.exports = { fetchZeptoProducts };
