/**
 * providers/bigbasket_scraper.js
 * - BigBasket scraping stub
 */

const cheerio = require('cheerio');
const { fetchHtmlWithRetries, safeText, safeAttr } = require('./scraperUtil');

async function fetchBigBasketProducts(category = 'grocery') {
  try {
    const url = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(category)}`;
    const html = await fetchHtmlWithRetries(url, { timeout: 12000, maxRetries: 2, cacheTtl: 30 });
    const $ = cheerio.load(html);
    const out = [];

    // placeholder selectors
    $('.product, .item, .product-item').each((i, el) => {
      const node = $(el);
      const name = safeText(node.find('.ng-binding, .productname'));
      const priceText = (safeText(node.find('.discnt-price, .price')) || '').replace(/[^0-9.]/g,'');
      const price = Number(priceText) || 0;
      const link = safeAttr(node.find('a'), 'href') || '';

      if (name) {
        out.push({
          listing_id: `bigbasket-scrape-${i}-${Date.now()}`,
          product_id: null,
          name,
          brand: null,
          category,
          provider: 'BigBasket',
          price,
          unit: null,
          fetched_at: new Date().toISOString(),
          url: link.startsWith('http') ? link : `https://www.bigbasket.com${link}`,
          raw: {}
        });
      }
    });

    if (!out.length) {
      return [{ listing_id: 'bigbasket-sample-1', product_id: 'BB-SAMPLE-1', name: 'BigBasket Sample Item', provider: 'BigBasket', price: 120, unit: '1 pc', fetched_at: new Date().toISOString(), url: null }];
    }
    return out;
  } catch (err) {
    console.warn('bigbasket_scraper failed', err && err.message);
    return [{ listing_id: 'bigbasket-sample-err', product_id: 'BB-SAMPLE-ERR', name: 'BigBasket Sample (error fallback)', provider: 'BigBasket', price: 0, unit: null, fetched_at: new Date().toISOString(), url: null }];
  }
}

module.exports = { fetchBigBasketProducts };
