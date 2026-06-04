import * as cheerio from 'cheerio';

export async function extractCroma(page) {
    // Wait for the main elements to load to avoid empty pages
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 4500));

    let html;
    try {
        html = await page.content();
    } catch (e) {
        return { success: false, message: e.message };
    }

    const $ = cheerio.load(html);

    let data = {
        title: '',
        store: 'Croma',
        category: '',
        description: '',
        mrp: '',
        price: '',
        images: []
    };

    // 1. JSON-LD Extraction
    $('script[type="application/ld+json"]').each((i, el) => {
        try {
            let text = $(el).html() || '';
            let parsed = {};
            try {
                parsed = JSON.parse(text);
            } catch(e) {
                try {
                    text = text.replace(/}[\s\n]*}$/, '}');
                    parsed = JSON.parse(text);
                } catch(e2) {}
            }
            const items = Array.isArray(parsed) ? parsed : [parsed];
            
            const product = items.find(item => item['@type'] === 'Product' || item['@type']?.includes('Product'));
            if (product) {
                if (product.name && !data.title) data.title = product.name;
                if (product.description && !data.description) data.description = product.description;
                if (product.image) {
                    const imgs = Array.isArray(product.image) ? product.image : [product.image];
                    data.images.push(...imgs);
                }
                if (product.offers) {
                    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                    if (offer && offer.price && !data.price) {
                        data.price = String(offer.price);
                    }
                }
            }
            
            const breadcrumbsItem = items.find(item => item['@type'] === 'BreadcrumbList');
            if (breadcrumbsItem && breadcrumbsItem.itemListElement && breadcrumbsItem.itemListElement.length > 0) {
                const elements = breadcrumbsItem.itemListElement;
                const leaf = elements[elements.length - 1];
                const parent = elements.length > 1 ? elements[elements.length - 2] : leaf;
                
                const leafName = leaf.name || leaf.item?.name || '';
                const parentName = parent.name || parent.item?.name || '';
                
                if (!data.category) {
                    data.category = (leafName.length > 30 || (data.title && leafName.includes(data.title.substring(0, 10)))) ? parentName : leafName;
                }
            }
        } catch (e) {}
    });

    // 2. Meta Tags Extraction
    if (!data.title) data.title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || '';
    if (!data.description) data.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    if (data.images.length === 0) {
        const ogImg = $('meta[property="og:image"]').attr('content');
        if (ogImg) data.images.push(ogImg);
    }

    // 3. DOM Fallbacks
    if (!data.title) {
        data.title = $('.pd-title').text().trim() || $('h1.pd-title').text().trim() || $('h1').text().trim() || $('.product-title').text().trim();
    }

    if (!data.price) {
        // DO NOT select #pdp-mrp-price here, it's the MRP!
        data.price = $('.pdp-cp').text().trim() || $('.amount').text().trim() || $('.cp-price').text().trim() || $('.new-price').text().trim() || $('[data-testid="price"]').text().trim() || $('.price').text().trim();
    }
    
    // Helper to extract clean number from string (e.g., "85,999.00" -> 85999)
    const extractNumber = (str) => {
        if (!str) return 0;
        const match = String(str).replace(/,/g, '').match(/\d+(\.\d+)?/);
        return match ? Math.round(parseFloat(match[0])) : 0;
    };

    // Extract MRP
    let foundMrp = 0;
    
    // Check explicit MRP element
    const mrpEl = $('#pdp-mrp-price').text().trim() || $('.pdp-mrp').text().trim() || $('.old-price').text().trim() || $('del').text().trim();
    if (mrpEl) {
        foundMrp = extractNumber(mrpEl);
    }

    // Look for strike-through elements if MRP not found
    const priceVal = extractNumber(data.price || '0');
    
    if (!foundMrp) {
        $('.mrp, del, .original-price, s, span[style*="line-through"], [class*="strike"]').each((i, el) => {
            const cleaned = extractNumber($(el).text());
            if (cleaned && cleaned > priceVal && cleaned <= priceVal * 10) {
                foundMrp = cleaned;
            }
        });
    }

    if (foundMrp && foundMrp > priceVal) {
        data.mrp = String(foundMrp);
    }

    // Category from breadcrumbs
    if (!data.category) {
        const breadcrumbs = [];
        $('.breadcrumb-item, .breadcrumbs li, .cr-breadcrumb li').each((i, el) => {
            const text = $(el).text().trim();
            if (text) breadcrumbs.push(text);
        });
        if (breadcrumbs.length > 1) {
            data.category = breadcrumbs[breadcrumbs.length - 1] === data.title ? breadcrumbs[breadcrumbs.length - 2] : breadcrumbs[breadcrumbs.length - 1];
        }
    }

    // Images fallback
    $('img').each((i, img) => {
        const src = $(img).attr('data-src') || $(img).attr('src');
        if (src && src.startsWith('http') && (src.includes('croma.com') || src.includes('product')) && !src.includes('lazyLoading')) {
            if (!src.includes('placeholder') && !src.endsWith('.svg') && !src.includes('video_thumbnail')) {
                const cleanSrc = src.replace(/\?tr=w-\d+/, '');
                if (!data.images.includes(cleanSrc)) {
                    data.images.push(cleanSrc);
                }
            }
        }
    });
    
    // Deduplicate images
    data.images = [...new Set(data.images)];

    // Normalization
    if (data.price) data.price = String(extractNumber(data.price) || data.price);
    if (data.mrp) data.mrp = String(extractNumber(data.mrp) || data.mrp);
    
    if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
        data.mrp = data.price;
    }

    return data;
}
