import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: false, // matches index.js
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list'
        ]
    });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });
    await page.setViewport({ width: 1400, height: 1200 });
    
    console.log("Navigating to Reliance Digital...");
    const url = 'https://www.reliancedigital.in/apple-iphone-15-128-gb-black-/p/493832004';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    const html = await page.content();
    fs.writeFileSync('rd_dump.html', html);
    
    console.log("HTML length:", html.length);
    console.log("Check rd_dump.html for results.");
    
    await browser.close();
}
run();
