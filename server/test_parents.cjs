const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

const mainPrice = $('.a-price-whole').filter((i, el) => $(el).closest('.a-carousel').length === 0).first();
console.log('Main Price text:', mainPrice.text().trim());
console.log('Parents:', mainPrice.parents().map((i, el) => $(el).attr('id') || $(el).attr('class')).get().slice(0, 10));
