const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

$('#centerCol *').each((i, el) => {
    if ($(el).children().length === 0 && $(el).text().includes('3,990')) {
        console.log('Parent HTML of 3,990:', $(el).parent().html());
        return false;
    }
});
