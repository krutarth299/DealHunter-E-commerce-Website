import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractAmazon } from './amazon.js';
import { extractFlipkart } from './flipkart.js';
import { extractMyntra } from './myntra.js';
import { extractCroma } from './croma.js';
import { extractRelianceDigital } from './reliancedigital.js';
import { extractNykaa } from './nykaa.js';
import { extractFirstCry } from './firstcry.js';
import { extractTataCliq } from './tatacliq.js';
import { extractSnapdeal } from './snapdeal.js';

puppeteer.use(StealthPlugin());

export async function extractProduct(url) {
    if (!url) return { success: false, message: "URL is required" };

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            defaultViewport: null,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        
        const page = await browser.newPage();
        
        // Anti-bot webdriver bypass
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        // Block heavy resources safely
        const isMyntra = url.toLowerCase().includes('myntra.com');
        const isNykaa = url.toLowerCase().includes('nykaa.com');
        const isTataCliq = url.toLowerCase().includes('tatacliq.com');
        const isFirstCry = url.toLowerCase().includes('firstcry.com');
        const isRelianceDigital = url.toLowerCase().includes('reliancedigital.in');
        
        // Many SPAs (React/Angular/Vue) crash if stylesheets/images are blocked
        const needsFullLoad = isMyntra || isNykaa || isTataCliq || isFirstCry || isRelianceDigital;
        
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.isInterceptResolutionHandled()) return;
            const resourceType = request.resourceType();
            
            // React frontends crash if stylesheets/images are blocked
            const blockedTypes = needsFullLoad 
                ? ['font', 'media'] 
                : ['image', 'stylesheet', 'font', 'media'];
                
            if (blockedTypes.includes(resourceType)) {
                request.abort().catch(() => {});
            } else {
                request.continue().catch(() => {});
            }
        });

        await page.setViewport({ width: 1400, height: 1200 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            "accept-language": "en-US,en;q=0.9"
        });
        await page.setCacheEnabled(false);
        
        let cleanUrl = url;
        if (cleanUrl.toLowerCase().includes("flipkart.com")) {
            // Remove query params
            cleanUrl = cleanUrl.split("?")[0];
            // Remove extra path after product id
            const match = cleanUrl.match(/(\/p\/itm[a-zA-Z0-9]+)/i);
            if (match) {
                cleanUrl = cleanUrl.split("/p/")[0] + match[1];
            }
        }

        await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

        let data = {};
        const lowUrl = cleanUrl.toLowerCase();
        const finalUrl = page.url().toLowerCase();

        if (lowUrl.includes("amazon") || finalUrl.includes("amazon")) {
            data = await extractAmazon(page);
        } else if (lowUrl.includes("flipkart") || finalUrl.includes("flipkart") || lowUrl.includes("fkrt.it")) {
            data = await extractFlipkart(page);
        } else if (lowUrl.includes("myntra") || finalUrl.includes("myntra")) {
            data = await extractMyntra(page);
        } else if (lowUrl.includes("croma") || finalUrl.includes("croma")) {
            data = await extractCroma(page);
        } else if (lowUrl.includes("reliancedigital") || finalUrl.includes("reliancedigital")) {
            data = await extractRelianceDigital(page);
        } else if (lowUrl.includes("nykaa") || finalUrl.includes("nykaa")) {
            data = await extractNykaa(page);
        } else if (lowUrl.includes("firstcry") || finalUrl.includes("firstcry")) {
            data = await extractFirstCry(page);
        } else if (lowUrl.includes("tatacliq") || finalUrl.includes("tatacliq")) {
            data = await extractTataCliq(page);
        } else if (lowUrl.includes("snapdeal") || finalUrl.includes("snapdeal")) {
            data = await extractSnapdeal(page);
        } else {
            return { success: false, message: "Unsupported platform" };
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
        if (browser) await browser.close();
    }
}
