export async function extractSnapdeal(page) {
    // Wait for the main elements to load
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));

    return await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || '';
        
        let data = {
            title: '',
            store: 'Snapdeal',
            category: '',
            description: '',
            mrp: '',
            price: '',
            images: []
        };

        // 1. JSON-LD Extraction
        try {
            const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of ldScripts) {
                const parsed = JSON.parse(script.innerText || '{}');
                const items = Array.isArray(parsed) ? parsed : [parsed];
                const product = items.find(i => i['@type'] === 'Product' || i['@type']?.includes('Product'));
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
            }
        } catch (e) {
            // Silently ignore JSON-LD parse errors inside page.evaluate()
        }

        // 2. Meta Tags Extraction
        const getMeta = (prop) => {
            const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
            return el?.content?.trim() || '';
        };

        if (!data.title) data.title = getMeta('og:title') || getMeta('twitter:title');
        if (!data.description) data.description = getMeta('og:description') || getMeta('description');
        if (data.images.length === 0) {
            const ogImg = getMeta('og:image');
            if (ogImg) data.images.push(ogImg);
        }

        // 3. DOM Fallbacks
        if (!data.title) {
            data.title = getText('h1') || getText('.pdp-e-i-head');
        }

        if (!data.price) {
            data.price = getText('.payToGetPrice') || getText('span.pdp-final-price');
        }

        // Extract MRP (strike-through or original price)
        const possibleMrps = [
            document.querySelector('.pdp-strike-price'),
            document.querySelector('span.pdp-mrp'),
            document.querySelector('del'),
            document.querySelector('.strike')
        ];
        for (const el of possibleMrps) {
            if (el?.innerText) {
                const cleaned = el.innerText.replace(/[^0-9]/g, '');
                if (cleaned) {
                    data.mrp = cleaned;
                    break;
                }
            }
        }

        // Category from breadcrumbs
        const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumbs li, .breadcrumb-item, .pdpBreadcrumb li'))
            .map(el => el.innerText.trim())
            .filter(Boolean);
        if (breadcrumbs.length > 1) {
            data.category = breadcrumbs[breadcrumbs.length - 1] === data.title ? breadcrumbs[breadcrumbs.length - 2] : breadcrumbs[breadcrumbs.length - 1];
        }

        // Images fallback
        if (data.images.length === 0) {
            const imgs = document.querySelectorAll('img.cloudzoom, #pdp-slider-id img, img[src*="/imgs/"]');
            imgs.forEach(img => {
                const src = img.src || img.getAttribute('src');
                if (src && src.startsWith('http') && !data.images.includes(src)) {
                    data.images.push(src);
                }
            });
        }

        // Normalization
        if (data.price) data.price = String(data.price).replace(/[^0-9]/g, '');
        if (data.mrp) data.mrp = String(data.mrp).replace(/[^0-9]/g, '');
        if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
            data.mrp = data.price;
        }

        return data;
    });
}
