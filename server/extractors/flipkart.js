import * as cheerio from 'cheerio';

export async function extractFlipkart(page) {
    // Wait for the main container to ensure the page has loaded
    await page.waitForFunction(() => document.querySelector('h1') || document.querySelector('.VU-Tz5'), { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000)); // wait for client side renders
    
    let html;
    try {
        html = await page.content();
    } catch (e) {
        return { success: false, message: e.message };
    }

    const $ = cheerio.load(html);
    
    let data = {
        title: '',
        store: 'Flipkart',
        category: '',
        description: '',
        mrp: '',
        price: '',
        images: []
    };

    // 1. JSON-LD Extraction (Most reliable)
    $('script[type="application/ld+json"]').each((i, el) => {
        let text = $(el).html() || '';
        try {
            let parsed = JSON.parse(text.trim());
            const items = Array.isArray(parsed) ? parsed : [parsed];
            
            for (const item of items) {
                if (item['@type'] === 'Product') {
                    if (item.name && !data.title) data.title = item.name;
                    if (item.description && !data.description) data.description = item.description;
                    if (item.category && !data.category) data.category = item.category;
                    
                    if (item.image) {
                        if (Array.isArray(item.image)) {
                            data.images.push(...item.image);
                        } else {
                            data.images.push(item.image);
                        }
                    }
                    
                    if (item.offers) {
                        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                        if (offer && offer.price && !data.price) {
                            data.price = String(offer.price);
                        }
                    }
                }
            }
        } catch (e) {}
    });

    // 2. DOM Fallbacks
    if (!data.title) {
        data.title = $('h1').first().text().trim() || $('.VU-Tz5').first().text().trim() || $('.B_NuCI').first().text().trim();
    }

    if (!data.price) {
        const p1 = $('.Nx9bqj.CxhGGd').first().text().trim();
        const p2 = $('._30jeq3._16Jk6d').first().text().trim();
        const p3 = $('div[class*="Nx9bqj"]').first().text().trim();
        data.price = p1 || p2 || p3;
    }

    if (!data.mrp) {
        const m1 = $('.yRaY8j.A6z5tZ').first().text().trim();
        const m2 = $('._3I9_wc._2p6lqe').first().text().trim();
        const m3 = $('div[class*="yRaY8j"]').first().text().trim();
        data.mrp = m1 || m2 || m3;
    }

    if (data.images.length === 0) {
        $('img').each((i, img) => {
            let src = $(img).attr('src');
            if (src && src.includes('rukminim')) {
                src = src.replace(/\/image\/\d+\/\d+\//, '/image/1200/1200/');
                src = src.replace(/q=\d+/, 'q=100');
                if (!data.images.includes(src)) data.images.push(src);
            }
        });
    }

    // Clean up
    if (data.price) data.price = data.price.replace(/[^0-9]/g, '');
    if (data.mrp) data.mrp = data.mrp.replace(/[^0-9]/g, '');
    
    // Ensure MRP is valid relative to Price
    if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
        data.mrp = data.price;
    }

    return data;
}
