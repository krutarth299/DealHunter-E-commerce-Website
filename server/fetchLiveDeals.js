/**
 * ============================================================
 * DealHunter - Live Deal Fetcher
 * ============================================================
 * Pulls real deals from public RSS feeds (no API key needed):
 *  - Slickdeals Frontpage Deals
 *  - DealNews
 *  - Reddit r/deals
 *
 * Usage:
 *   node server/fetchLiveDeals.js
 *
 * It will POST each deal to the DealHunter backend at:
 *   http://localhost:5000/api/deals
 * ============================================================
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const API_URL = 'http://localhost:5000/api/deals';

// ─── RSS Sources ──────────────────────────────────────────────────────────────
const RSS_SOURCES = [
    {
        name: 'Slickdeals',
        url: 'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1',
        store: 'Slickdeals',
    },
    {
        name: 'DealNews Electronics',
        url: 'https://www.dealnews.com/c/Electronics/d/latest-deals.rss',
        store: 'DealNews',
    },
    {
        name: 'DealNews Fashion',
        url: 'https://www.dealnews.com/c/Clothing/d/latest-deals.rss',
        store: 'DealNews',
    },
    {
        name: 'Reddit r/deals',
        url: 'https://www.reddit.com/r/deals/.rss?limit=25',
        store: 'Reddit Deals',
    },
    {
        name: 'Reddit r/buildapcsales',
        url: 'https://www.reddit.com/r/buildapcsales/hot/.rss?limit=25',
        store: 'Reddit Tech Deals',
    },
    {
        name: 'Reddit r/frugalmalefashion',
        url: 'https://www.reddit.com/r/frugalmalefashion/hot/.rss?limit=25',
        store: 'Reddit Fashion Deals',
    },
];

// ─── Category Detection ───────────────────────────────────────────────────────
const CATEGORY_KEYWORDS = [
    { cat: 'Electronics', keys: ['tv', 'laptop', 'phone', 'smartphone', 'tablet', 'monitor', 'camera', 'headphone', 'earphone', 'speaker', 'keyboard', 'mouse', 'hard drive', 'ssd', 'gpu', 'cpu', 'processor', 'ram', 'router', 'charger', 'cable', 'adapter', 'iphone', 'samsung', 'apple', 'intel', 'amd', 'nvidia', 'lg', 'sony', 'logitech', 'anker'] },
    { cat: 'Fashion', keys: ['shirt', 'shoes', 'sneaker', 'boot', 'jacket', 'coat', 'jeans', 'pants', 'dress', 'sweater', 'hoodie', 'tshirt', 't-shirt', 'clothing', 'apparel', 'fashion', 'watch', 'bag', 'backpack', 'wallet', 'adidas', 'nike', 'levi', 'under armour', 'puma', 'new balance', 'vans', 'converse'] },
    { cat: 'Travel', keys: ['luggage', 'suitcase', 'travel', 'hotel', 'flight', 'airline', 'airfare', 'ticket', 'cruise'] },
    { cat: 'Home', keys: ['furniture', 'bedding', 'pillow', 'mattress', 'lamp', 'rug', 'curtain', 'towel', 'sheet', 'vacuum', 'air purifier', 'dyson', 'ikea'] },
    { cat: 'Kitchen', keys: ['coffee', 'kitchen', 'cookware', 'pot', 'pan', 'knife', 'blender', 'toaster', 'instant pot', 'air fryer', 'espresso'] },
    { cat: 'Gaming', keys: ['gaming', 'game', 'playstation', 'xbox', 'nintendo', 'switch', 'ps5', 'ps4', 'steam', 'graphic card', 'gpu', 'console', 'controller', 'headset'] },
    { cat: 'Beauty', keys: ['beauty', 'makeup', 'skincare', 'skin care', 'perfume', 'cologne', 'shampoo', 'conditioner', 'lotion', 'cream', 'moisturizer'] },
    { cat: 'Sports', keys: ['fitness', 'gym', 'yoga', 'running', 'cycling', 'hiking', 'outdoor', 'camping', 'sport', 'exercise', 'workout'] },
    { cat: 'Grocery', keys: ['food', 'snack', 'coffee beans', 'tea', 'grocery', 'organic', 'nutrition', 'protein', 'supplement', 'vitamin'] },
    { cat: 'Toys', keys: ['toy', 'lego', 'kids', 'children', 'baby', 'board game', 'action figure', 'doll', 'puzzle'] },
];

function detectCategory(title) {
    const t = (title || '').toLowerCase();
    for (const { cat, keys } of CATEGORY_KEYWORDS) {
        if (keys.some(k => t.includes(k))) return cat;
    }
    return 'Others';
}

// ─── Price Extraction ─────────────────────────────────────────────────────────
function extractPrice(text) {
    if (!text) return null;
    const patterns = [
        /\$\s*([\d,]+(?:\.\d{2})?)/,
        /([\d,]+(?:\.\d{2})?)\s*(?:USD|dollars?)/i,
        /MSRP:?\s*\$\s*([\d,]+(?:\.\d{2})?)/i,
    ];
    for (const pat of patterns) {
        const m = text.match(pat);
        if (m) {
            const val = parseFloat(m[1].replace(/,/g, ''));
            if (!isNaN(val) && val > 0 && val < 100000) return val;
        }
    }
    return null;
}

function extractDiscount(title, description) {
    const text = `${title} ${description}`;
    const patterns = [
        /(\d+)\s*%\s*off/i,
        /save\s*(\d+)\s*%/i,
        /(\d+)\s*percent\s*off/i,
    ];
    for (const pat of patterns) {
        const m = text.match(pat);
        if (m) return `${m[1]}% OFF`;
    }
    return null;
}

function extractImageFromHtml(html) {
    if (!html) return null;
    const $ = cheerio.load(html);
    const img = $('img').first();
    const src = img.attr('src') || img.attr('data-src');
    if (src && src.startsWith('http')) return src;
    return null;
}

// ─── Default category images (fallback) ──────────────────────────────────────
const CATEGORY_IMAGES = {
    Electronics: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    Fashion: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    Travel: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=800&auto=format&fit=crop&q=80',
    Home: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop&q=80',
    Kitchen: 'https://images.unsplash.com/photo-1556909172-8c2f041fca1e?w=800&auto=format&fit=crop&q=80',
    Gaming: 'https://images.unsplash.com/photo-1542549237890-d8f872958ac8?w=800&auto=format&fit=crop&q=80',
    Beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80',
    Sports: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80',
    Grocery: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800&auto=format&fit=crop&q=80',
    Toys: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&auto=format&fit=crop&q=80',
    Others: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&auto=format&fit=crop&q=80',
};

// ─── RSS Parser ───────────────────────────────────────────────────────────────
async function fetchRSS(source) {
    console.log(`\n[RSS] Fetching: ${source.name} ...`);
    try {
        const res = await fetch(source.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DealHunterBot/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
            timeout: 15000,
        });

        if (!res.ok) {
            console.error(`  ✗ HTTP ${res.status} for ${source.name}`);
            return [];
        }

        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const items = [];
        $('item').each((_, el) => {
            const item = $(el);
            const title = item.find('title').first().text().trim();
            const link = item.find('link').first().text().trim() || item.find('link').attr('href');
            const description = item.find('description').first().text().trim();
            const pubDate = item.find('pubDate').first().text().trim();
            const enclosureUrl = item.find('enclosure').attr('url');
            const mediaThumbnail = item.find('media\\:thumbnail, thumbnail').attr('url');

            if (!title || !link) return;
            // Skip stickied/pinned Reddit posts
            if (title.toLowerCase().includes('[meta]') || title.toLowerCase().includes('weekly')) return;

            items.push({
                title,
                link,
                description: description.replace(/<[^>]+>/g, '').substring(0, 500),
                pubDate,
                enclosureUrl: enclosureUrl || mediaThumbnail,
                rawDescHtml: description,
            });
        });

        console.log(`  ✓ Found ${items.length} items from ${source.name}`);
        return items.slice(0, 15); // Cap at 15 per source
    } catch (err) {
        console.error(`  ✗ Error fetching ${source.name}: ${err.message}`);
        return [];
    }
}

// ─── Get currently existing deal titles to avoid duplicates ──────────────────
async function getExistingTitles() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) return new Set();
        const deals = await res.json();
        return new Set(deals.map(d => d.title.toLowerCase().trim()));
    } catch {
        return new Set();
    }
}

// ─── Post a deal to the backend ───────────────────────────────────────────────
async function postDeal(deal) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deal),
        });
        if (res.ok) {
            const created = await res.json();
            return created;
        } else {
            const err = await res.text();
            console.error(`  ✗ POST failed: ${err}`);
        }
    } catch (err) {
        console.error(`  ✗ Network error: ${err.message}`);
    }
    return null;
}

// ─── Detect store from link ───────────────────────────────────────────────────
function detectStore(link, defaultStore) {
    try {
        const host = new URL(link).hostname.toLowerCase();
        const storeMap = {
            'amazon': 'Amazon',
            'bestbuy': 'Best Buy',
            'walmart': 'Walmart',
            'target': 'Target',
            'newegg': 'Newegg',
            'ebay': 'eBay',
            'adorama': 'Adorama',
            'bhphotovideo': 'B&H Photo',
            'costco': 'Costco',
            'nike': 'Nike',
            'adidas': 'Adidas',
            'nordstrom': 'Nordstrom',
            'macys': "Macy's",
            'gap': 'Gap',
            'homedepot': 'Home Depot',
            'lowes': "Lowe's",
            'gamestop': 'GameStop',
            'staples': 'Staples',
            'apple': 'Apple',
            'microsoft': 'Microsoft',
            'steam': 'Steam',
            'dell': 'Dell',
            'lenovo': 'Lenovo',
        };
        for (const [key, name] of Object.entries(storeMap)) {
            if (host.includes(key)) return name;
        }
    } catch {
        // fallback to defaultStore
    }
    return defaultStore;
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────
async function main() {
    console.log('=================================================');
    console.log(' DealHunter - Live Deal Fetcher');
    console.log(' Fetching real deals from around the world...');
    console.log('=================================================');

    const existingTitles = await getExistingTitles();
    console.log(`\n[INFO] Found ${existingTitles.size} existing deals in the database.`);

    let totalAdded = 0;
    let totalSkipped = 0;

    for (const source of RSS_SOURCES) {
        const items = await fetchRSS(source);

        for (const item of items) {
            // Skip duplicates
            if (existingTitles.has(item.title.toLowerCase().trim())) {
                totalSkipped++;
                continue;
            }

            const category = detectCategory(item.title + ' ' + item.description);
            const store = detectStore(item.link, source.store);

            // Try to extract prices
            const salePriceVal = extractPrice(item.title) || extractPrice(item.description);
            const discountStr = extractDiscount(item.title, item.description);

            // Compute simulated original price if we have a sale price and discount%
            let originalPriceVal = null;
            if (salePriceVal && discountStr) {
                const pct = parseFloat(discountStr);
                if (!isNaN(pct) && pct > 0 && pct < 100) {
                    originalPriceVal = Math.round(salePriceVal / (1 - pct / 100));
                }
            } else if (salePriceVal) {
                originalPriceVal = Math.round(salePriceVal * 1.25); // Estimate 25% off
            }

            // Build final price strings
            const priceStr = salePriceVal ? `$${salePriceVal.toFixed(2)}` : 'Check Site';
            const originalPriceStr = originalPriceVal ? `$${originalPriceVal.toFixed(2)}` : '';
            const finalDiscountStr = discountStr || (salePriceVal && originalPriceVal
                ? `${Math.round((1 - salePriceVal / originalPriceVal) * 100)}% OFF`
                : 'Limited Deal');

            // Find image
            const image = item.enclosureUrl
                || extractImageFromHtml(item.rawDescHtml)
                || CATEGORY_IMAGES[category]
                || CATEGORY_IMAGES['Others'];

            const deal = {
                title: item.title.substring(0, 200),
                image,
                price: priceStr,
                originalPrice: originalPriceStr,
                discount: finalDiscountStr,
                store,
                category,
                link: item.link,
                description: item.description || `Deal from ${store}. Click "Get Deal" to see the full offer.`,
                rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)), // 3.5–5.0
                featured: false,
            };

            const created = await postDeal(deal);
            if (created) {
                console.log(`  ✓ Added: [${category}] ${deal.title.substring(0, 70)}...`);
                console.log(`    💰 ${priceStr}  (${finalDiscountStr})  🔗 ${deal.link.substring(0, 60)}`);
                existingTitles.add(item.title.toLowerCase().trim());
                totalAdded++;
            }

            // Polite delay
            await new Promise(r => setTimeout(r, 200));
        }
    }

    console.log('\n=================================================');
    console.log(` ✅ Done! Added ${totalAdded} new deals.`);
    console.log(` ⏭  Skipped ${totalSkipped} duplicates.`);
    console.log(` 🌐 View them at: http://localhost:5173`);
    console.log('=================================================\n');
}

main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
