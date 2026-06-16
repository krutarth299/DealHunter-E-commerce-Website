const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

const selectors = [
    ".a-text-strike",
    ".aok-nowrap.a-text-strike",
    "#corePriceDisplay_desktop_feature_div .a-text-price span[aria-hidden='true']",
    "#corePriceDisplay_desktop_feature_div .a-price.a-text-price .a-offscreen",
    "#corePrice_desktop .a-text-price span[aria-hidden='true']",
    "span.a-price.a-text-price span.a-offscreen"
];

for (const sel of selectors) {
    const txt = $(sel).first().text().trim();
    if (txt) {
        console.log(sel, '->', txt);
    }
}
