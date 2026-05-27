import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    const link = 'https://www.firstcry.com/mark-and-mia/mark-and-mia-full-sleeves-cotton-rich-pintuck-party-shirt-in-white-color-with-bow/2195244/product-detail';
    
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 8000));
    
    try {
        const html = await page.evaluate(() => document.documentElement.outerHTML);
        fs.writeFileSync('C:/Users/dhana/OneDrive/Desktop/project/server/fc_dump.html', html);
        console.log('HTML saved. Length:', html.length);
    } catch(err) {
        console.error(err);
    }
    await browser.close();
}
run();
