const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('nykaa_test.html', 'utf8');
const $ = cheerio.load(html);

console.log('H1:', $('h1').text());
console.log('Price CSS:', $('.css-1jcz4rn').text());
console.log('MRP CSS 1:', $('.css-1h29b8c').text());
console.log('MRP Style:', $('span[style*="line-through"]').text());
console.log('Del:', $('del').text());
console.log('Strike:', $('.strike').text());
console.log('All CSS:', $('[class^="css-"]').slice(0, 20).map((i, el) => $(el).attr('class')).get().join('\n'));
