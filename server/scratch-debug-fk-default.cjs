const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function run() {
    const url = "https://www.flipkart.com/adivasi-bhringraj-herbal-hair-oil-for-long-shiny-hair-loss/p/itmf384d1e024f86?pid=HOLGSZE3Z4CQJA4J";
    
    console.log("Launching default Chromium (headless: false)...");
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
            const ldData = [];
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            scripts.forEach(script => {
                try {
                    ldData.push(JSON.parse(script.innerText || '{}'));
                } catch(e) {
                    ldData.push({ error: e.message });
                }
            });
            
            // Log some price candidate elements
            const priceCandidates = [];
            document.querySelectorAll('*').forEach(el => {
                if (el.children.length === 0 && el.innerText && (el.innerText.includes('₹') || el.innerText.includes('Rs'))) {
                    priceCandidates.push({
                        tag: el.tagName,
                        text: el.innerText.trim(),
                        fontSize: window.getComputedStyle(el).fontSize
                    });
                }
            });

            return {
                documentTitle: document.title,
                h1Title: getTitle(),
                ldData,
                priceCandidates: priceCandidates.slice(0, 20)
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
