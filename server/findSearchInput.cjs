const fs = require('fs');
const cheerio = require('cheerio');

function inspect(file) {
    console.log(`\n=== ${file} ===`);
    try {
        const html = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(html);
        $('input').each((i, el) => {
            console.log(`Input ${i}: id="${$(el).attr('id')}" class="${$(el).attr('class')}" placeholder="${$(el).attr('placeholder')}" type="${$(el).attr('type')}"`);
        });
    } catch(e) {
        console.log('Error:', e.message);
    }
}

inspect('reliance_digital_debug.html');
inspect('tata_category.html');
inspect('tatacliq.html');
inspect('reliance.html');
