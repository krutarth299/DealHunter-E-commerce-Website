import * as cheerio from 'cheerio';

export async function extractUniversal(page, url) {
    let html;
    try {
        html = await page.content();
    } catch (e) {
        return { success: false, message: e.message };
    }

    const $ = cheerio.load(html);
    
    let storeName = 'Unknown Store';
    try {
        let hostname = new URL(url).hostname.replace('www.', '').split('.')[0];
        storeName = hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch(e) {}

    let data = {
        title: '',
        store: storeName,
        category: '',
        description: '',
        mrp: '',
        price: '',
        images: []
    };

    const extractNumber = (str) => {
        const match = String(str).match(/[0-9,]+(\.[0-9]+)?/);
        return match ? Math.round(parseFloat(match[0].replace(/,/g, ''))) : 0;
    };

    // 1. JSON-LD Extraction
    $('script[type="application/ld+json"]').each((i, el) => {
        try {
            let parsed = JSON.parse($(el).html().trim());
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
                let productItem = item;
                if (item['@type'] === 'Product') {
                    productItem = item;
                } else if (item['@graph']) {
                    productItem = item['@graph'].find(g => g['@type'] === 'Product') || item;
                } else if (item.mainEntity && item.mainEntity['@type'] === 'Product') {
                    productItem = item.mainEntity;
                }
                
                if (productItem && productItem['@type'] === 'Product') {
                    if (productItem.name && !data.title) data.title = productItem.name;
                    if (productItem.description && !data.description) data.description = productItem.description;
                    if (productItem.category && !data.category) data.category = productItem.category;
                    
                    if (productItem.image) {
                        if (Array.isArray(productItem.image)) {
                            data.images.push(...productItem.image.map(img => typeof img === 'string' ? img : img.url));
                        } else if (typeof productItem.image === 'string') {
                            data.images.push(productItem.image);
                        } else if (productItem.image.url) {
                            data.images.push(productItem.image.url);
                        }
                    }
                    
                    if (productItem.offers) {
                        const offer = Array.isArray(productItem.offers) ? productItem.offers[0] : productItem.offers;
                        if (offer.price && !data.price) data.price = String(offer.price);
                        if (offer.lowPrice && !data.price) data.price = String(offer.lowPrice);
                        if (offer.highPrice && !data.mrp) data.mrp = String(offer.highPrice);
                    }
                }
            }
        } catch (e) {}
    });

    // 2. OpenGraph / Meta Tags
    if (!data.title) data.title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || $('title').text().split('|')[0].trim();
    if (!data.description) data.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
    if (data.images.length === 0) {
        let img = $('meta[property="og:image"]').attr('content') || $('meta[property="og:image:secure_url"]').attr('content');
        if (img) data.images.push(img);
    }
    
    // Shopify Specific
    if (!data.price) data.price = $('meta[property="product:price:amount"]').attr('content');
    
    // 3. Heuristic DOM Extraction for Price
    if (!data.price || parseInt(data.price) === 0) {
        let priceClasses = ['.price', '.product-price', '.discounted-price', '.sale-price', '.current-price', '.deal-price', '[data-price]', '.prod-sp'];
        for (let cls of priceClasses) {
            let el = $(cls).first();
            if (el.length > 0) {
                let num = extractNumber(el.text());
                if (num > 0) {
                    data.price = String(num);
                    break;
                }
            }
        }
    }
    
    // Fallback heuristic for price if specific classes fail
    if (!data.price || parseInt(data.price) === 0) {
        let possible = [];
        $('div, span, p, h1, h2, h3').each((i, el) => {
            const txt = $(el).text().trim();
            if ((txt.startsWith('₹') || txt.startsWith('Rs')) && txt.length < 15 && $(el).children().length === 0) {
                let num = extractNumber(txt);
                if (num > 0) possible.push(num);
            }
        });
        if (possible.length > 0) {
            data.price = String(Math.min(...possible)); // Deal price is usually the minimum prominent price
        }
    }

    // 4. Heuristic DOM Extraction for MRP
    if (!data.mrp || parseInt(data.mrp) <= parseInt(data.price)) {
        let mrpClasses = ['.mrp', '.compare-at-price', '.original-price', '.old-price', 'del', 'strike', 's', '.prod-cp'];
        for (let cls of mrpClasses) {
            let el = $(cls).first();
            if (el.length > 0) {
                let num = extractNumber(el.text());
                if (num > 0 && (!data.price || num > extractNumber(data.price))) {
                    data.mrp = String(num);
                    break;
                }
            }
        }
    }

    if (!data.mrp || parseInt(data.mrp) <= parseInt(data.price)) {
        let currentPrice = extractNumber(data.price);
        let possible = [];
        $('div, span, p, strike, del').each((i, el) => {
            const style = $(el).attr('style') || '';
            const tagName = el.tagName ? el.tagName.toLowerCase() : '';
            if (style.includes('line-through') || tagName === 'strike' || tagName === 'del' || tagName === 's' || $(el).text().toLowerCase().includes('mrp')) {
                let num = extractNumber($(el).text());
                if (num > currentPrice && num <= currentPrice * 10) {
                    possible.push(num);
                }
            }
        });
        if (possible.length > 0) {
            data.mrp = String(Math.max(...possible));
        } else {
            // Default mrp to price if completely missing
            data.mrp = data.price;
        }
    }

    // Default Images fallback
    if (data.images.length === 0) {
        $('img').each((i, el) => {
            let src = $(el).attr('src') || $(el).attr('data-src');
            if (src && !src.toLowerCase().includes('logo') && !src.toLowerCase().includes('icon') && !src.toLowerCase().includes('svg')) {
                data.images.push(src);
            }
        });
    }
    
    // Ensure absolute URLs
    data.images = data.images.slice(0, 4).map(img => {
        if (!img) return null;
        if (img.startsWith('//')) return 'https:' + img;
        if (img.startsWith('/')) {
            try { return new URL(img, url).href; } catch(e) { return img; }
        }
        return img;
    }).filter(Boolean);

    return data;
}
