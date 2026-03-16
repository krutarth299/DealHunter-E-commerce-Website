
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let browserInstance = null;
const cache = new Map();
const cacheTimestamps = new Map();
const CACHE_TTL = 3600000; // 1 hour (much longer now because we invalidate on update)

async function getBrowser() {
    if (!browserInstance) {
        try {
            browserInstance = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-blink-features=AutomationControlled'
                ]
            });
        } catch (err) {
            console.error('[SSR Engine] Failed to launch browser:', err);
            return null;
        }
    }
    return browserInstance;
}

function clearCache(urlPattern = null) {
    if (!urlPattern) {
        cache.clear();
        cacheTimestamps.clear();
        console.log('[SSR] Global cache cleared');
    } else {
        // Specific invalidation
        for (let key of cache.keys()) {
            if (key.includes(urlPattern)) {
                cache.delete(key);
                cacheTimestamps.delete(key);
            }
        }
        console.log('[SSR] Selective cache cleared for:', urlPattern);
    }
}

async function renderReactSSR(urlStr, targetPort = 5173) {
    const now = Date.now();
    
    // 1. Check Cache
    if (cache.has(urlStr)) {
        const timestamp = cacheTimestamps.get(urlStr);
        if (now - timestamp < CACHE_TTL) {
            console.log('[SSR] Serving fresh cache:', urlStr);
            return cache.get(urlStr);
        }
    }

    console.log('[SSR] Universal Render Initiated:', urlStr);
    
    let page = null;
    try {
        const browser = await getBrowser();
        if (!browser) return null;

        page = await browser.newPage();
        
        // Optimize for speed
        await page.setViewport({ width: 1280, height: 800 });
        await page.setExtraHTTPHeaders({ 'x-ssr-bot': '1' });
        
        // Intercept and block non-essential resources to speed up HTML generation
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rt = req.resourceType();
            // We need scripts to render, and CSS for some layout-based JS
            if (['image', 'media', 'font'].includes(rt)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const targetUrl = `http://127.0.0.1:${targetPort}${urlStr}`;
        
        // Navigation with reasonable timeout
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle0', 
            timeout: 20000 
        });
        
        // Wait specifically for our React app to mount and some data to load
        // This is a "small detail" fix: ensure the data is actually in the DOM before capturing
        await page.waitForSelector('#root > *', { timeout: 10000 }).catch(() => null);

        // Get content
        const html = await page.content();
        
        // 2. Update Cache
        cache.set(urlStr, html);
        cacheTimestamps.set(urlStr, now);
        
        return html;
    } catch (e) {
        console.error('[SSR Error]', e.message);
        return null;
    } finally {
        if (page) {
            try { await page.close(); } catch(e) {}
        }
    }
}

module.exports = { renderReactSSR, clearCache };

