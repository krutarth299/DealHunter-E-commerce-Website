const cheerio = require('cheerio');
const fs = require('fs');
const $ = cheerio.load(fs.readFileSync('amz_dump.html'));

console.log('--- STRIKES ---');
$('.a-text-strike').each((i, el) => console.log($(el).text().trim()));

console.log('\n--- PRICES ---');
$('.a-price-whole').each((i, el) => console.log($(el).text().trim()));
