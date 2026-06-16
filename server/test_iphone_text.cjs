const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('iphone_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log("centerCol text:", $('#centerCol').text().slice(0, 500));
