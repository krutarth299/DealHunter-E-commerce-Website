const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('nykaa_test.html', 'utf8');
const $ = cheerio.load(html);
let prices = [];
$('*').each((i, el) => {
    const text = $(el).text();
    if (text.includes('MRP') && text.includes('₹') && text.length < 100) {
        prices.push({ tag: el.tagName, class: $(el).attr('class'), text: text.trim().replace(/\s+/g, ' ') });
    }
});
console.log("Elements with MRP and ₹:", prices);

let strikePrices = [];
$('del, s, span[style*="line-through"]').each((i, el) => {
    strikePrices.push({ tag: el.tagName, class: $(el).attr('class'), text: $(el).text().trim() });
});
console.log("Elements with strike-through:", strikePrices);

let possiblePrices = [];
$('span, div').each((i, el) => {
    const text = $(el).text().trim();
    if (text.startsWith('₹') && text.length < 15) {
        possiblePrices.push({ tag: el.tagName, class: $(el).attr('class'), text: text });
    }
});
console.log("Elements with ₹:", possiblePrices);
