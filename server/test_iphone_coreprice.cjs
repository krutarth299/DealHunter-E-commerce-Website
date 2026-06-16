const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('iphone_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log('corePrice text:', $('#corePrice_desktop').text().trim());
console.log('corePrice html:', $('#corePrice_desktop').html());
