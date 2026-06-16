const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

const centerColText = $('#centerCol').text();
console.log('Contains 3,990:', centerColText.includes('3,990'));
console.log('Contains 3990:', centerColText.includes('3990'));
