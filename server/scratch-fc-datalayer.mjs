import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const link = 'https://www.firstcry.com/mark-and-mia/mark-and-mia-full-sleeves-cotton-rich-pintuck-party-shirt-in-white-color-with-bow/2195244/product-detail';
    
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 6000));
    
    try {
        const dataLayer = await page.evaluate(() => {
            return window.dataLayer || [];
        });
        console.log('DATALAYER:', JSON.stringify(dataLayer, null, 2));
    } catch(err) {
        console.error(err);
    }
    await browser.close();
}
run();
