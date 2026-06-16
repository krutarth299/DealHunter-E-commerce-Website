const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log($('#corePrice_desktop').html());
