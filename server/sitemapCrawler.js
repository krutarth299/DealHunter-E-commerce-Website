import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function getLiveUrlFromSitemap(url, productPattern) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    try {
        console.log(`Loading sitemap index: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const text = await page.evaluate(() => document.body.innerText || '');
        
        // Find sub-sitemaps (xml urls)
        const sitemaps = [...text.matchAll(/https?:\/\/[^\s<>'"]+\.xml/gi)].map(m => m[0]);
        console.log(`Found ${sitemaps.length} sub-sitemaps.`);
        
        // Go to a product sitemap (usually contains 'product' or last ones)
        const productMap = sitemaps.find(s => s.toLowerCase().includes('product') || s.toLowerCase().includes('pdp')) || sitemaps[sitemaps.length - 1];
        if (productMap) {
            console.log(`Loading product sitemap: ${productMap}`);
            await page.goto(productMap, { waitUntil: 'domcontentloaded', timeout: 60000 });
            const sitemapText = await page.evaluate(() => document.body.innerText || '');
            
            // Extract product URLs matching pattern
            const matches = [...sitemapText.matchAll(productPattern)].map(m => m[0]);
            const unique = [...new Set(matches)];
            if (unique.length > 0) {
                console.log(`Found live URLs:`, unique.slice(0, 5));
                await browser.close();
                return unique[0];
            } else {
                console.log(`No matches for pattern on product sitemap. Text length: ${sitemapText.length}`);
            }
        } else {
            // Try matching directly in index sitemap
            const directMatches = [...text.matchAll(productPattern)].map(m => m[0]);
            const uniqueDirect = [...new Set(directMatches)];
            if (uniqueDirect.length > 0) {
                console.log(`Found live URLs in index:`, uniqueDirect.slice(0, 5));
                await browser.close();
                return uniqueDirect[0];
            }
        }
    } catch (e) {
        console.log(`Error on ${url}:`, e.message);
    }
    await browser.close();
    return null;
}

async function run() {
    // 1. Reliance Digital sitemap
    const rdUrl = await getLiveUrlFromSitemap(
        'https://www.reliancedigital.in/sitemap.xml',
        /https:\/\/www\.reliancedigital\.in\/[^\s<>'"]+\/p\/\d+/gi
    );
    console.log('RD live URL:', rdUrl);

    // 2. Tata CLiQ sitemap
    const tcUrl = await getLiveUrlFromSitemap(
        'https://www.tatacliq.com/sitemap.xml',
        /https:\/\/www\.tatacliq\.com\/[^\s<>'"]+\/p-mp\d+/gi
    );
    console.log('Tata CLiQ live URL:', tcUrl);
}

run();
