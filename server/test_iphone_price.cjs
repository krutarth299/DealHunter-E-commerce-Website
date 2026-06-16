const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('iphone_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log("centerCol exists?", $('#centerCol').length > 0);
console.log("centerCol text includes 79:", $('#centerCol').text().includes('79'));
console.log("buybox exists?", $('#desktop_buybox').length > 0);
console.log("buybox text includes 79:", $('#desktop_buybox').text().includes('79'));

$('#desktop_buybox *').each((i, el) => {
    if ($(el).children().length === 0 && ($(el).text().includes('79,') || $(el).text().includes('79 '))) {
        console.log('Found 79k in buybox:', el.tagName, $(el).attr('class'));
    }
});

$('#centerCol *').each((i, el) => {
    if ($(el).children().length === 0 && ($(el).text().includes('79,') || $(el).text().includes('79 '))) {
        console.log('Found 79k in centerCol:', el.tagName, $(el).attr('class'));
    }
});
