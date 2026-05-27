import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const link = 'https://www.tatacliq.com/us-polo-assn-cream-cotton-regular-fit-logo-printed-polo-tshirt/p-mp000000027861873';
    
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 6000));
    
    try {
        const debug = await page.evaluate(() => {
            const data = {};
            data.title = document.querySelector('h1')?.innerText || document.title;
            data.price = document.querySelector('.ProductDescription__price')?.innerText;
            data.bodyText = document.body.innerText.substring(0, 500);
            return data;
        });
        console.log('DEBUG HEADLESS:', JSON.stringify(debug, null, 2));
    } catch(err) {
        console.error(err);
    }
    await browser.close();
}
run();
