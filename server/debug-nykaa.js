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
        
        const url = "https://www.nykaa.com/cetaphil-cleansing-lotion/p/22032";
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        console.log("Waiting 5 seconds...");
        await new Promise(r => setTimeout(r, 5000));
        
        const ldScripts = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            return Array.from(scripts).map(s => s.textContent || s.innerText);
        });
        console.log(`Found ${ldScripts.length} JSON-LD scripts.`);
        ldScripts.forEach((s, idx) => {
            console.log(`Script ${idx + 1} content:`, s);
        });
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await browser.close();
    }
}

run();
