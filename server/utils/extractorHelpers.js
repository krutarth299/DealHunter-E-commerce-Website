/**
 * Shared helpers for extraction services
 */

/**
 * Safely extracts text from a selector
 */
export const safeText = async (page, selector) => {
    try {
        return await page.$eval(selector, el => el.innerText.trim());
    } catch {
        return '';
    }
};

/**
 * Extracts meta content
 */
export const getMetaContent = async (page, prop) => {
    return await page.evaluate((p) => {
        const el = document.querySelector(`meta[property="${p}"], meta[name="${p}"]`);
        return el?.content?.trim() || '';
    }, prop);
};

/**
 * Extracts JSON-LD product data
 */
export const getProductJsonLd = async (page) => {
    return await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
            try {
                const json = JSON.parse(script.innerText);
                const items = Array.isArray(json) ? json : [json];
                const product = items.find(i => i['@type'] === 'Product' || i['@type']?.includes('Product'));
                if (product) return product;
            } catch (e) {}
        }
        return null;
    });
};

/**
 * Normalizes a URL
 */
export const normalizeUrl = (url = '') => {
    try {
        const u = new URL(url.trim());
        u.hash = '';
        return u.toString();
    } catch {
        return url;
    }
};
