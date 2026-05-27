import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });
    
    try {
        const page = await browser.newPage();
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        const url = "https://www.myntra.com/tshirts/roadster/roadster-men-black-solid-round-neck-t-shirt/19904944/buy";
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        console.log("Waiting 5 seconds...");
        await new Promise(r => setTimeout(r, 5000));
        
        const pdpData = await page.evaluate(() => {
            return window.__myx ? window.__myx.pdpData : null;
        });
        
        console.log("window.__myx.pdpData keys:", Object.keys(pdpData || {}));
        console.log("Name:", pdpData?.name);
        console.log("Price / MRP info:", pdpData?.price);
        console.log("Media / Images info:", pdpData?.media?.albums?.[0]?.images?.map(img => img.src));
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await browser.close();
    }
}

run();
