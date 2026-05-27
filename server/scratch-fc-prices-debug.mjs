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
            const data = {};
            data.title = document.querySelector('h1')?.innerText;
            data.price1 = document.querySelector('span.prod-price')?.innerText;
            data.price2 = document.querySelector('#prod_price')?.innerText;
            data.price3 = document.querySelector('.price-div')?.innerText;
            data.price4 = document.querySelector('.p_buy_now_section')?.innerText;
            data.mrp1 = document.querySelector('span.prod-mrp')?.innerText;
            data.mrp2 = document.querySelector('#prod_mrp')?.innerText;
            data.mrp3 = document.querySelector('.mrp-div')?.innerText;
            data.win_topClubPrice = window.topClubPrice;
            data.win_topnonClubPrice = window.topnonClubPrice;
            data.win_MRP = window.MRP;
            data.win_mrp = window.mrp;
            
            data.scripts_containing_price = Array.from(document.querySelectorAll('script'))
                .filter(s => s.innerText.includes('"price"') || s.innerText.includes('"mrp"') || s.innerText.includes('MRP'))
                .map(s => s.innerText.substring(0, 300));
            return data;
        });
        console.log('DEBUG:', JSON.stringify(debug, null, 2));
    } catch(err) {
        console.error(err);
    }
    await browser.close();
}
run();
