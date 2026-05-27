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
        const debug = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText);
            let price = null;
            let mrp = null;
            scripts.forEach(s => {
                 let m = s.match(/"price"\s*:\s*([\d\.]+)/);
                 if (m) price = m[1];
                 m = s.match(/"mrp"\s*:\s*([\d\.]+)/);
                 if (m) mrp = m[1];
            });
            return {
                price: price,
                mrp: mrp,
                window_keys: Object.keys(window).filter(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('mrp'))
            };
        });
        console.log('DEBUG:', JSON.stringify(debug, null, 2));
    } catch(err) {
        console.error(err);
    }
    await browser.close();
}
run();
