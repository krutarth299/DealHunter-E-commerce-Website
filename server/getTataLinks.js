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
        console.log('Loading Tata CLiQ ethnic wear sitemap...');
        await page.goto('https://www.tatacliq.com/sitemaps/Prod-women-s-clothing-ethnic-wear-sitemap-1.xml', { waitUntil: 'domcontentloaded', timeout: 60000 });
        const text = await page.evaluate(() => document.body.innerText || '');
        const urls = [...text.matchAll(/https:\/\/www\.tatacliq\.com\/[^\s<>'"]+\/p-mp\d+/gi)].map(m => m[0]);
        console.log('Total product links in sitemap:', urls.length);
        console.log('Tata CLiQ live URLs:', [...new Set(urls)].slice(0, 10));
    } catch(e) {
        console.log('Error:', e.message);
    }
    await browser.close();
}

run();
