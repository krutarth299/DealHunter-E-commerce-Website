const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log($('.a-text-strike').first().parents().map((i, el) => $(el).attr('id') || $(el).attr('class')).get().slice(0, 10));
