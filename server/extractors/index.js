import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractAmazon } from './amazon.js';
import { extractFlipkart } from './flipkart.js';
import { extractCroma } from './croma.js';
import { extractRelianceDigital } from './reliancedigital.js';
import { extractFirstCry } from './firstcry.js';
import { extractMyntra } from './myntra.js';
import { extractUniversal } from './universal.js';
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
        
        // Anti-bot webdriver bypass & Realistic User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        // Block heavy resources safely
        const isFirstCry = url.toLowerCase().includes('firstcry.com');
        const isRelianceDigital = url.toLowerCase().includes('reliancedigital.in');
        const isCroma = url.toLowerCase().includes('croma.com');
        await page.setViewport({ width: 1400, height: 1200 });
        await page.setCacheEnabled(false);

    // Resources are not blocked because many modern SPAs (React/Next.js) wait for images/fonts to finish before rendering content.
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
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await new Promise(r => setTimeout(r, 3500)); // wait for SPA to hydrate and render
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
        } else if (lowUrl.includes("myntra") || finalUrl.includes("myntra")) {
            data = await extractMyntra(page, targetUrl);
        } else {
            // Fallback to the Universal Extractor for any other store (AJIO, Mamaearth, etc.)
            data = await extractUniversal(page, targetUrl);
        }

        // Final normalization and cleaning
        const cleanPrice = (p) => String(p || '').replace(/[^\d]/g, '');
        
        const ALLOWED_CATEGORIES = [
            "Electronics", "Fashion", "Footwear", "Accessories", "Beauty & Personal Care", 
            "Home & Kitchen", "Furniture", "Groceries", "Baby Products", "Sports & Fitness", 
            "Books & Media", "Toys & Games", "Automotive", "Office & Stationery", 
            "Health & Medical", "Travel", "Pet Supplies", "Industrial & Tools", "Digital Products"
        ];

        function mapCategory(rawCategory) {
            if (!rawCategory) return "Electronics";
            const lowerRaw = String(rawCategory).toLowerCase();
            
            // Exact match
            for (const cat of ALLOWED_CATEGORIES) {
                if (cat.toLowerCase() === lowerRaw) return cat;
            }
            
            // Keyword match
            if (lowerRaw.match(/phone|mobile|laptop|computer|tv|television|audio|headphone|earphone|camera|electronic/i)) return "Electronics";
            if (lowerRaw.match(/clothing|shirt|pant|dress|apparel|saree|kurta|jeans|t-shirt|top|bottom/i)) return "Fashion";
            if (lowerRaw.match(/shoe|sneaker|boot|sandal|slipper|footwear/i)) return "Footwear";
            if (lowerRaw.match(/watch|jewelry|bag|wallet|belt|sunglasses|eyewear|accessory/i)) return "Accessories";
            if (lowerRaw.match(/makeup|skincare|haircare|perfume|fragrance|trimmer|shaver|grooming|beauty|personal/i)) return "Beauty & Personal Care";
            if (lowerRaw.match(/kitchen|appliance|cookware|mixer|blender|fridge|refrigerator|washing machine|home/i)) return "Home & Kitchen";
            if (lowerRaw.match(/furniture|bed|sofa|chair|table|wardrobe|mattress/i)) return "Furniture";
            if (lowerRaw.match(/grocery|food|snack|beverage|drink|chocolate|pantry|staple/i)) return "Groceries";
            if (lowerRaw.match(/baby|diaper|toy|kids|infant|stroller/i)) return "Baby Products";
            if (lowerRaw.match(/sport|fitness|gym|yoga|bicycle|cycle|protein|dumbell/i)) return "Sports & Fitness";
            if (lowerRaw.match(/book|media|music|movie|game|gaming/i)) return "Books & Media";
            if (lowerRaw.match(/toy|game|puzzle|board game/i)) return "Toys & Games";
            if (lowerRaw.match(/car|bike|auto|tyre|helmet|motor/i)) return "Automotive";
            if (lowerRaw.match(/office|stationery|pen|paper|notebook/i)) return "Office & Stationery";
            if (lowerRaw.match(/health|medical|medicine|supplement|vitamin|mask/i)) return "Health & Medical";
            if (lowerRaw.match(/travel|luggage|suitcase|backpack/i)) return "Travel";
            if (lowerRaw.match(/pet|dog|cat|food|aquarium/i)) return "Pet Supplies";
            if (lowerRaw.match(/industrial|tool|drill|hardware|plumbing|electrical/i)) return "Industrial & Tools";
            if (lowerRaw.match(/digital|software|subscription|gift card/i)) return "Digital Products";

            // Substring fallback
            for (const cat of ALLOWED_CATEGORIES) {
                if (lowerRaw.includes(cat.toLowerCase()) || cat.toLowerCase().includes(lowerRaw)) {
                    return cat;
                }
            }

            return "Electronics"; // Default fallback
        }

        return {
            success: true,
            data: {
                title: data.title,
                store: data.store,
                category: mapCategory(data.category),
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
        let msg = error.message;
        if (msg && msg.includes("blocked")) {
             msg = "Anti-bot protection triggered. These stores require a proxy like ScraperAPI. Please enter details manually.";
        }
        return { success: false, message: msg };
    } finally {
        if (page) await page.close().catch(e => console.error("Error closing page:", e));
    }
}
