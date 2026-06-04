import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function discover() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const results = {};

    async function findProductLink(storeName, searchUrl, filterFn) {
        console.log(`Searching for ${storeName} products...`);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        try {
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
            await new Promise(r => setTimeout(r, 6000)); // wait for SPA content
            
            const hrefs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h && h.startsWith('http'));
            });
            
            const matched = hrefs.filter(filterFn);
            if (matched.length > 0) {
                results[storeName] = [...new Set(matched)].slice(0, 3);
                console.log(`Found ${storeName} links:`, results[storeName]);
            } else {
                console.log(`No matching product links found for ${storeName}. Hrefs count: ${hrefs.length}`);
                // Print a few sample hrefs for debugging
                console.log('Sample hrefs:', [...new Set(hrefs)].slice(0, 10));
            }
        } catch(e) {
            console.log(`Error on ${storeName}:`, e.message);
        } finally {
            await page.close();
        }
    }

    // 1. Snapdeal (contains /product/)
    await findProductLink(
        'Snapdeal', 
        'https://www.snapdeal.com/search?keyword=saree', 
        h => h.includes('/product/') && !h.includes('/search?')
    );

    // 2. FirstCry (contains /product-detail)
    await findProductLink(
        'FirstCry', 
        'https://www.firstcry.com/search?q=babyhug%20t-shirt', 
        h => h.includes('/product-detail') && !h.includes('javascript')
    );

    // 3. Tata CLiQ (contains /p-mp)
    await findProductLink(
        'Tata CLiQ', 
        'https://www.tatacliq.com/search/?text=boat', 
        h => h.includes('/p-mp')
    );

    // 4. Reliance Digital (contains /p/)
    await findProductLink(
        'Reliance Digital', 
        'https://www.reliancedigital.in/search?q=boat', 
        h => h.includes('/p/') && !h.includes('/search?')
    );

    console.log('\nFinal Discovered URLs:', JSON.stringify(results, null, 2));
    fs.writeFileSync('discovered-urls.json', JSON.stringify(results, null, 2));

    await browser.close();
}

discover();
