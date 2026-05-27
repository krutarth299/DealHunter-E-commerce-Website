import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import fs from 'fs';

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // Using Maybelline foundation which is typically discounted
    await page.goto('https://www.nykaa.com/maybelline-new-york-fit-me-matte-poreless-liquid-foundation-tube/p/354522', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 8000));
    
    const html = await page.evaluate(() => {
        // Let's find the price element
        const elements = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.includes('MRP'));
        return elements.map(el => ({
            tag: el.tagName,
            class: el.className,
            text: el.innerText,
            html: el.innerHTML
        })).slice(-10); // get the deepest elements
    });
    
    fs.writeFileSync('mrp_dump.json', JSON.stringify(html, null, 2));
    
    const strike = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('s, del, [style*="line-through"]')).map(el => ({
            tag: el.tagName,
            class: el.className,
            text: el.innerText
        }));
    });
    fs.writeFileSync('strike_dump.json', JSON.stringify(strike, null, 2));

    await browser.close();
}
run();
