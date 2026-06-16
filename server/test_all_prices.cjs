const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

const extractNumClean = (str) => {
    const match = String(str).match(/[0-9,]+(\.[0-9]+)?/);
    return match ? Math.round(parseFloat(match[0].replace(/,/g, ''))) : null;
};

const prices = new Set();
$('#centerCol .a-price .a-offscreen').each((i, el) => {
    const $el = $(el);
    if ($el.closest('.a-carousel').length === 0 && 
        $el.closest('.a-expander-content').length === 0 &&
        $el.closest('[id*="sims-consolidated"]').length === 0) {
        
        const num = extractNumClean($el.text());
        if (num) prices.add(num);
    }
});

console.log(Array.from(prices));
