const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('iphone_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log('corePriceDisplay:', $('#corePriceDisplay_desktop_feature_div').length);
console.log('corePrice:', $('#corePrice_desktop').length);
console.log('price:', $('#price').length);
console.log('apexPrice:', $('#apexPriceToPay').length);
console.log('rightCol:', $('#rightCol').length);
console.log('centerCol:', $('#centerCol').length);
console.log('buybox:', $('#desktop_buybox').length);
