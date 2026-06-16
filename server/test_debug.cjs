const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

const searchArea = $('#centerCol').length > 0 ? $('#centerCol') : $('body');

console.log("SearchArea id:", searchArea.attr('id'));

const findValidElement = (selectors) => {
    let foundEl = null;
    for (const sel of selectors) {
        searchArea.find(sel).each((i, el) => {
            const $el = $(el);
            if ($el.closest('.a-carousel').length === 0 && 
                $el.closest('.a-expander-content').length === 0 &&
                $el.closest('[id*="sims-consolidated"]').length === 0) {
                
                if ($el.text().trim().length > 0) {
                    foundEl = $el;
                    console.log("Found match for", sel, "->", $el.text().trim());
                    return false; 
                }
            }
        });
        if (foundEl) break;
    }
    return foundEl ? foundEl.text().trim() : '';
};

console.log("PRICE:", findValidElement(['.a-price-whole', '.a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice']));
console.log("MRP:", findValidElement(['.a-text-strike', '.a-text-price span[aria-hidden="true"]', '.a-price.a-text-price .a-offscreen']));
