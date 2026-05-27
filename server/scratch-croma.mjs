import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.croma.com/vivo-x300-5g-16gb-ram-512gb-elite-black-/p/319749', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 5000));
    
    const info = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        return Array.from(scripts).map(s => s.innerText);
    });
    console.log(JSON.stringify(info, null, 2));
    
    const breadcrumbs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.cr-breadcrumb li')).map(el => el.innerText.trim());
    });
    console.log("Breadcrumbs DOM: ", breadcrumbs);
    
    await browser.close();
}
run();
