const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('iphone_dump.html', 'utf8');
const $ = cheerio.load(html);

const extractNumClean = (str) => {
    const match = String(str).match(/[0-9,]+(\.[0-9]+)?/);
    return match ? String(Math.round(parseFloat(match[0].replace(/,/g, '')))) : '';
};

const getPrices = () => {
    let prices = new Set();
    
    let searchArea = $('body');
    const containers = ['#corePriceDisplay_desktop_feature_div', '#corePrice_desktop', '#centerCol', '#desktop_buybox'];
    for (const c of containers) {
        if ($(c).length > 0 && $(c).text().trim().length > 0) {
            console.log("Selected container:", c);
            searchArea = $(c);
            break;
        }
    }

    const selectors = [
        '.a-price-whole', 
        '.a-offscreen', 
        '.a-text-strike', 
        '.a-text-price span[aria-hidden="true"]',
        '#priceblock_ourprice',
        '#priceblock_dealprice'
    ];

    for (const sel of selectors) {
        searchArea.find(sel).each((i, el) => {
            const $el = $(el);
            if ($el.closest('.a-carousel').length === 0 && 
                $el.closest('.a-expander-content').length === 0 &&
                $el.closest('[id*="sims-consolidated"]').length === 0 &&
                $el.closest('[data-a-carousel-options]').length === 0) {
                
                const num = extractNumClean($el.text());
                if (num) {
                    console.log("Found valid price for selector", sel, "->", num);
                    prices.add(parseInt(num));
                }
            }
        });
    }

    console.log("Prices Set:", Array.from(prices));

    const priceArr = Array.from(prices).filter(p => p > 0).sort((a, b) => a - b);
    let dealPrice = '';
    let mrp = '';

    if (priceArr.length > 0) {
        dealPrice = String(priceArr[0]);
        mrp = String(priceArr[priceArr.length - 1]);
    }

    return { price: dealPrice, mrp: mrp };
};

console.log(getPrices());
