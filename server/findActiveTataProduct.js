import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    try {
        console.log('Visiting Tata CLiQ search for "shirt"...');
        await page.goto('https://www.tatacliq.com/search/?text=shirt', { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Waiting for content to load...');
        await new Promise(r => setTimeout(r, 15000));
        
        // Take a screenshot of the search page to see if it loaded or got blocked
        await page.screenshot({ path: 'tata_search.png' });
        
        // Dump the html
        const html = await page.content();
        fs.writeFileSync('tata_search.html', html);
        
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href);
        });
        
        const matches = links.filter(h => h && h.includes('p-mp'));
        console.log('Total links found:', links.length);
        console.log('Tata CLiQ product links matching p-mp:', [...new Set(matches)].slice(0, 10));
    } catch(e) {
        console.log('Error:', e.message);
    }
    await browser.close();
}

run();
