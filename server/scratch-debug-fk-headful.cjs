const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function run() {
    const url = "https://www.flipkart.com/realme-p1-5g-peacock-green-128-gb/p/itmdbcb1bc16a2ef";
    console.log("Launching browser in headless: false...");
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        
        console.log("Navigating to:", url);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));

        console.log("Evaluating page details...");
        const details = await page.evaluate(() => {
            const getTitle = () => {
                const el = document.querySelector('h1');
                return el ? el.innerText.trim() : '';
            };
            const getLd = () => {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                return scripts.length;
            };
            return {
                documentTitle: document.title,
                bodyText: document.body.innerText.slice(0, 1000),
                h1Title: getTitle(),
                ldScriptsCount: getLd()
            };
        });

        console.log(JSON.stringify(details, null, 2));

    } catch (e) {
        console.error("Error during scraping:", e);
    } finally {
        await browser.close();
    }
}

run();
