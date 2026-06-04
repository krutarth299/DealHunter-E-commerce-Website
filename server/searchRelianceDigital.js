import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    try {
        console.log('Visiting Reliance Digital homepage...');
        await page.goto('https://www.reliancedigital.in', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));
        
        console.log('Waiting for search input...');
        await page.waitForSelector('input.search-input', { timeout: 15000 });
        
        console.log('Typing query...');
        await page.type('input.search-input', 'iphone 15');
        await page.keyboard.press('Enter');
        
        console.log('Waiting for search results...');
        await new Promise(r => setTimeout(r, 10000));
        
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h && h.includes('/p/'));
        });
        
        console.log('Found product links:', [...new Set(links)].slice(0, 10));
    } catch (e) {
        console.log('Error:', e.message);
    }
    await browser.close();
}

run();
