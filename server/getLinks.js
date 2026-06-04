import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function getLinks() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    async function fetchLink(homeUrl) {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        try {
            console.log(`\n--- Fetching from ${homeUrl}... ---`);
            await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 10000)); // wait for client-side rendering
            const links = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h && h.startsWith('http'));
            });
            const uniqueLinks = [...new Set(links)];
            console.log(uniqueLinks.slice(0, 15).join('\n'));
        } catch(e) {
            console.log(`Error on ${homeUrl}: ${e.message}`);
        } finally {
            await page.close();
        }
    }

    await fetchLink('https://www.firstcry.com/boy-fashion/1/0/0');
    await fetchLink('https://www.tatacliq.com/mens-clothing/c-msh11');
    await fetchLink('https://www.snapdeal.com/products/mens-tshirts-polos');
    await fetchLink('https://www.reliancedigital.in/smartphones/c/S101711');

    await browser.close();
}

getLinks();
