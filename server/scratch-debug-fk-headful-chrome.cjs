const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function run() {
    const url = "https://www.flipkart.com/adivasi-bhringraj-herbal-hair-oil-for-long-shiny-hair-loss/p/itmf384d1e024f86?pid=HOLGSZE3Z4CQJA4J";
    
    let chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (!fs.existsSync(chromePath)) {
        chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
    }
    
    console.log(`Launching Google Chrome (headless: false) from: ${chromePath}`);
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        console.log("Navigating to:", url);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("Waiting for content to hydrate...");
        await new Promise(r => setTimeout(r, 8000));

        console.log("Evaluating page details...");
        const details = await page.evaluate(() => {
            const getTitle = () => {
                const el = document.querySelector('h1') || document.querySelector('.VU-Tz5') || document.querySelector('.B_NuCI');
                return el ? el.innerText.trim() : '';
            };
            const getLd = () => {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                return Array.from(scripts).map(s => {
                    try {
                        return JSON.parse(s.innerText);
                    } catch (e) {
                        return { error: e.message, text: s.innerText.slice(0, 100) };
                    }
                });
            };
            return {
                documentTitle: document.title,
                bodyText: document.body.innerText.slice(0, 1000),
                h1Title: getTitle(),
                ldScripts: getLd()
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
