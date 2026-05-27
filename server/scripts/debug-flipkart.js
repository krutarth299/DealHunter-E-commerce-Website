import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const url = "https://www.flipkart.com/realme-p1-5g-peacock-green-128-gb/p/itmdbcb1bc16a2ef";
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        console.log("Navigating...");
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("Evaluating page details...");
        const details = await page.evaluate(() => {
            return {
                documentTitle: document.title,
                bodyText: document.body.innerText.slice(0, 1000),
                htmlSnippet: document.body.innerHTML.slice(0, 1000)
            };
        });

        console.log(JSON.stringify(details, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

run();
