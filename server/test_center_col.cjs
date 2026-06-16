const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('amz_dump.html', 'utf8');
const $ = cheerio.load(html);

$('#centerCol').find('.a-price-whole').each((i, el) => {
    console.log("Price:", $(el).text().trim());
});
$('#centerCol').find('.a-text-strike').each((i, el) => {
    console.log("Strike:", $(el).text().trim());
});
