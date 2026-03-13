
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let browserInstance = null;
const cache = new Map();
const cacheTimestamps = new Map();
const CACHE_TTL = 30000; // 30 seconds

async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
    }
    return browserInstance;
}

function clearCache() {
    cache.clear();
    cacheTimestamps.clear();
    console.log('[SSR] Cache cleared via admin update');
}

async function renderReactSSR(urlStr, targetPort = 5173) {
    // Basic cache logic
    const now = Date.now();
    if (cache.has(urlStr) && cacheTimestamps.has(urlStr)) {
        if (now - cacheTimestamps.get(urlStr) < CACHE_TTL) {
            console.log('[SSR] Serving from cache:', urlStr);
            return cache.get(urlStr);
        }
    }

    console.log('[SSR] Rendering URL dynamically via Headless Chrome:', urlStr);
    
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        // Prevent recursive SSR calls
        await page.setExtraHTTPHeaders({ 'x-ssr-bot': '1' });
        
        // Block heavy resources so SSR is very fast
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rt = req.resourceType();
            if (['image', 'media', 'font', 'stylesheet'].includes(rt)) {
                req.continue(); // Let them load otherwise styling may be off / but wait, we don't care about rendering layout, we just need the HTML DOM!
                // Actually React relies on some assets. We will just load everything to be safe
                // Wait, blocking CSS might break Tailwind if it's external, but Vite injects it. Let's allow everything.
            } else {
                req.continue();
            }
        });

        const targetUrl = 'http://127.0.0.1:' + targetPort + urlStr;
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
        
        // Extract HTML
        let html = await page.content();
        
        // Replace empty id='root' with the fully rendered application content
        // Puppeteer content() returns the full HTML including DOCTYPE and scripts.
        // It's a perfect 1:1 match of the UI state!
        
        cache.set(urlStr, html);
        cacheTimestamps.set(urlStr, now);
        
        return html;
    } catch (e) {
        console.error('[SSR Error rendering]', e);
        return null;
    } finally {
        if (page) await page.close();
    }
}

module.exports = { renderReactSSR, clearCache };

