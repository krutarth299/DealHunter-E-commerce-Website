const fs = require('fs');

const extract = (file, regex) => {
    try {
        const html = fs.readFileSync(file, 'utf8');
        const matches = [...html.matchAll(regex)].map(m => m[0]);
        const unique = [...new Set(matches)];
        console.log(`\n--- ${file} ---`);
        console.log(unique.slice(0, 5).join('\n') || 'NONE');
    } catch(e) {
        console.log(`Error reading ${file}: ${e.message}`);
    }
};

extract('firstcry.html', /https:\/\/www\.firstcry\.com\/[^\/"']+\/[^\/"']+\/\d+\/product-detail/g);
extract('tatacliq.html', /https:\/\/www\.tatacliq\.com\/[^\/"']+\/p-mp\d+/g);
extract('snapdeal.html', /https:\/\/www\.snapdeal\.com\/product\/[^\/"']+\/\d+/g);
extract('reliance.html', /https:\/\/www\.reliancedigital\.in\/[^\/"']+\/p\/\d+/g);
