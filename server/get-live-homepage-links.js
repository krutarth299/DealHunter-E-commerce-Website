import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function discover() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const results = {};

    async function extractLiveLinks(name, url, linkPattern) {
        console.log(`\n======================================`);
        console.log(`Extracting live links for ${name} from ${url}...`);
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 1200 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            console.log('Page loaded. Waiting for content...');
            await new Promise(r => setTimeout(r, 15000)); // wait for AJAX and lazy load
            
            // Scroll down a bit to trigger lazy loading of product lists
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 5000));
            
            const hrefs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h && h.startsWith('http'));
            });
            
            const matched = hrefs.filter(h => linkPattern.test(h));
            console.log(`Total raw hrefs: ${hrefs.length}`);
            console.log(`Total matched: ${matched.length}`);
            
            if (matched.length > 0) {
                results[name] = [...new Set(matched)].slice(0, 5);
                console.log(`Found live links:`, results[name]);
            } else {
                console.log(`No matched links found. Sample raw hrefs:`, [...new Set(hrefs)].slice(0, 20));
            }
        } catch(e) {
            console.log(`Error on ${name}:`, e.message);
        } finally {
            await page.close();
        }
    }

    // Tata CLiQ Home or Deals page
    await extractLiveLinks(
        'Tata CLiQ', 
        'https://www.tatacliq.com', 
        /\/p-mp\d+/
    );

    // Reliance Digital Home or Deals page
    await extractLiveLinks(
        'Reliance Digital', 
        'https://www.reliancedigital.in', 
        /\/p\/\d+/
    );

    console.log('\nFinal Discovered Live URLs:', JSON.stringify(results, null, 2));
    fs.writeFileSync('discovered-live-urls.json', JSON.stringify(results, null, 2));
    await browser.close();
}

discover();
