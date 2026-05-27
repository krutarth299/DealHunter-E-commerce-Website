const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4');
    
    // wait for dom
    await new Promise(r => setTimeout(r, 2000));
    
    const scripts = await page.evaluate(() => {
        const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
        return Array.from(ldScripts).map(s => s.innerText);
    });
    console.log(scripts);
    
    const cats = await page.evaluate(() => {
        const els = document.querySelectorAll('._2whKao, ._2I9KP_, a[href*="/search?facets.category"]');
        return Array.from(els).map(e => e.innerText);
    });
    console.log('Categories:', cats);
    
    // new breadcrumbs selector
    const cat3 = await page.evaluate(() => {
        const els = document.querySelectorAll('a.R0cyWM');
        return Array.from(els).map(e => e.innerText);
    });
    console.log('Cat3:', cat3);
    
    await browser.close();
})();
