import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const link = 'https://www.firstcry.com/mark-and-mia/mark-and-mia-full-sleeves-cotton-rich-pintuck-party-shirt-in-white-color-with-bow/2195244/product-detail';
    
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 5000));
    
    try {
        const debug = await page.evaluate(() => {
            const getT = s => document.querySelector(s)?.innerText || 'MISSING';
            return {
                h1: getT('h1'),
                breadcrumbs: Array.from(document.querySelectorAll('.breadcrumbs li, .breadcrumb-item, .div-breadcrumb li, [aria-label="breadcrumb"] li, ol li, .brd-c li, #breadcrum div, .breadcrum div, .p11 a, .bread-crumb a, .crumbs a, .crumbs span, .bc_container a, .brd-crmb a')).map(el => el.innerText.trim()).filter(Boolean),
                json_ld: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.innerText).slice(0, 5),
                category_dom: document.querySelector('.bread-crumb, .breadcrumb, #brd-crmb, .crumbs, .bc_container')?.innerText || 'MISSING'
            };
        });
        console.log('DEBUG:', JSON.stringify(debug, null, 2));
    } catch(err) {
        console.error(err);
    }
    await browser.close();
}
run();
