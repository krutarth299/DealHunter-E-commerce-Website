import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // 1. Tata CLiQ category
    const page1 = await browser.newPage();
    await page1.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    try {
        console.log('Visiting Tata CLiQ category...');
        await page1.goto('https://www.tatacliq.com/mens-clothing/c-msh11', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await new Promise(r => setTimeout(r, 10000));
        await page1.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 5000));
        const links = await page1.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('p-mp'));
        });
        console.log('Tata CLiQ product links found:', [...new Set(links)].slice(0, 5));
    } catch (e) {
        console.log('Error on Tata CLiQ:', e.message);
    }
    await page1.close();

    // 2. Reliance Digital category
    const page2 = await browser.newPage();
    await page2.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    try {
        console.log('Visiting Reliance Digital category...');
        await page2.goto('https://www.reliancedigital.in/sections/mobiles', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await new Promise(r => setTimeout(r, 10000));
        await page2.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 5000));
        const links = await page2.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('/p/'));
        });
        console.log('Reliance Digital product links found:', [...new Set(links)].slice(0, 5));
    } catch (e) {
        console.log('Error on Reliance Digital:', e.message);
    }
    await page2.close();

    await browser.close();
}

run();
