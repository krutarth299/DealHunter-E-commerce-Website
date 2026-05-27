import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const link = 'https://www.reliancedigital.in/voltas-1-5-ton-3-star-inverter-split-ac-183v-vectra-platina-100-grooved-copper-4-way-swing-/p/493838274';
    await page.goto(link, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 8000));
    
    try {
        const debug = await page.evaluate(() => {
            const getT = s => document.querySelector(s)?.innerText || 'MISSING';
            return {
                url: window.location.href,
                h1: getT('h1'),
                price_blocks: Array.from(document.querySelectorAll('span, div, p, b'))
                                   .filter(el => el.innerText && el.innerText.includes('₹') && el.children.length === 0)
                                   .map(el => ({tag: el.tagName, cls: el.className, text: el.innerText}))
                                   .slice(0, 10),
                json_ld: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.innerText).slice(0, 5),
                image_tags: Array.from(document.querySelectorAll('img')).map(i => i.outerHTML).slice(0, 5)
            };
        });
        console.log('DEBUG:', JSON.stringify(debug, null, 2));
    } catch(err) {
        console.error(err);
    }
    await browser.close();
}
run();
