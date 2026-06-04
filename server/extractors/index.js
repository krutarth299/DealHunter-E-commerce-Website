import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractAmazon } from './amazon.js';
import { extractFlipkart } from './flipkart.js';
import { extractCroma } from './croma.js';
import { extractRelianceDigital } from './reliancedigital.js';
import { extractFirstCry } from './firstcry.js';
import { extractBigBasket } from './bigbasket.js';
import { extractPurplle } from './purplle.js';
import { extractTata1mg } from './tata1mg.js';
import { extractMyntra } from './myntra.js';
puppeteer.use(StealthPlugin());

let globalBrowser = null;

async function getBrowser() {
    if (!globalBrowser || !globalBrowser.isConnected()) {
        globalBrowser = await puppeteer.launch({
            headless: false, // Changed to false to bypass advanced Cloudflare/Akamai bot detection on residential IPs
            defaultViewport: null,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list'
            ]
        });
    }
    return globalBrowser;
}

export async function extractProduct(url) {
    if (!url) return { success: false, message: "URL is required" };

    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        // Anti-bot webdriver bypass
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        // Block heavy resources safely
        const isFirstCry = url.toLowerCase().includes('firstcry.com');
        const isRelianceDigital = url.toLowerCase().includes('reliancedigital.in');
        const isCroma = url.toLowerCase().includes('croma.com');
        
        // Many SPAs (React/Angular/Vue) crash if stylesheets/images are blocked
        const needsFullLoad = isFirstCry || isRelianceDigital || isCroma;
        
        const blockedTypes = needsFullLoad 
            ? [] 
            : ['image', 'stylesheet', 'font', 'media'];
            
        if (blockedTypes.length > 0) {
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                if (request.isInterceptResolutionHandled()) return;
                const resourceType = request.resourceType();
                if (blockedTypes.includes(resourceType)) {
                    request.abort().catch(() => {});
                } else {
                    request.continue().catch(() => {});
                }
            });
        }

        await page.setViewport({ width: 1400, height: 1200 });
        await page.setCacheEnabled(false);
        
        let cleanUrl = (url || '').trim();
        if (!cleanUrl) {
            return { success: false, message: "URL cannot be empty" };
        }
        if (!/^https?:\/\//i.test(cleanUrl)) {
            cleanUrl = 'https://' + cleanUrl;
        }
        try {
            const parsed = new URL(cleanUrl);
            if (!parsed.hostname || !parsed.hostname.includes('.')) {
                return { success: false, message: "Invalid domain in URL" };
            }
        } catch (e) {
            return { success: false, message: "Invalid URL format" };
        }
        
        if (cleanUrl.toLowerCase().includes("flipkart.com")) {
            // Remove query params
            cleanUrl = cleanUrl.split("?")[0];
            // Remove extra path after product id
            const match = cleanUrl.match(/(\/p\/itm[a-zA-Z0-9]+)/i);
            if (match) {
                cleanUrl = cleanUrl.split("/p/")[0] + match[1];
            }
        }

        // Do not use networkidle2 as many ecommerce sites have persistent connections that cause timeouts
        let targetUrl = cleanUrl;
        
        // Use ScraperAPI if key is provided in .env for highly protected sites (currently none)
        const needsProxy = false;
        if (needsProxy && process.env.SCRAPERAPI_KEY) {
            console.log(`Routing ${cleanUrl} through ScraperAPI Premium...`);
            targetUrl = `http://api.scraperapi.com/?api_key=${process.env.SCRAPERAPI_KEY}&url=${encodeURIComponent(cleanUrl)}&render=true&premium=true&country_code=in`;
            try {
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            } catch (e) {
                console.log("Navigation timeout, proceeding with available DOM...");
            }
        } else {
            try {
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.log("Navigation timeout, proceeding with available DOM...");
            }
        }

        let data = {};
        const lowUrl = cleanUrl.toLowerCase();
        const finalUrl = page.url().toLowerCase();

        if (lowUrl.includes("amazon") || finalUrl.includes("amazon")) {
            data = await extractAmazon(page);
        } else if (lowUrl.includes("flipkart") || finalUrl.includes("flipkart") || lowUrl.includes("fkrt.it")) {
            data = await extractFlipkart(page);
        } else if (lowUrl.includes("croma") || finalUrl.includes("croma")) {
            data = await extractCroma(page);
        } else if (lowUrl.includes("reliancedigital") || finalUrl.includes("reliancedigital")) {
            data = await extractRelianceDigital(page);
        } else if (lowUrl.includes("firstcry") || finalUrl.includes("firstcry")) {
            data = await extractFirstCry(page);
        } else if (lowUrl.includes("bigbasket") || finalUrl.includes("bigbasket")) {
            data = await extractBigBasket(page, targetUrl);
        } else if (lowUrl.includes("purplle") || finalUrl.includes("purplle")) {
            data = await extractPurplle(page, targetUrl);
        } else if (lowUrl.includes("1mg") || finalUrl.includes("1mg")) {
            data = await extractTata1mg(page, targetUrl);
        } else if (lowUrl.includes("myntra") || finalUrl.includes("myntra")) {
            data = await extractMyntra(page, targetUrl);
        } else {
            return { success: false, message: "Store not supported" };
        }

        // Final normalization and cleaning
        const cleanPrice = (p) => String(p || '').replace(/[^\d]/g, '');
        
        return {
            success: true,
            data: {
                title: data.title,
                store: data.store,
                category: data.category,
                description: data.description,
                mrp: cleanPrice(data.mrp),
                dealPrice: cleanPrice(data.price),
                discount: data.discount || '',
                imageUrl: data.images?.[0] || data.image,
                images: data.images || [data.image],
                productUrl: url
            }
        };

    } catch (error) {
        console.error("[EXTRACTOR_ERROR]", error);
        return { success: false, message: error.message };
    } finally {
        if (page) await page.close().catch(e => console.error("Error closing page:", e));
    }
}
