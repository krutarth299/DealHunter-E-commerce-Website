export async function extractNykaa(page) {
    // Wait for the main elements to load (Nykaa React SPA uses css-1gc4a74)
    await page.waitForSelector('h1, h2, h3, .css-1gc4a74', { timeout: 15000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));

    return await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || '';
        
        let data = {
            title: '',
            store: 'Nykaa',
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
                
                const breadcrumbsItem = items.find(i => i['@type'] === 'BreadcrumbList');
                if (breadcrumbsItem && breadcrumbsItem.itemListElement && breadcrumbsItem.itemListElement.length > 0) {
                    const elements = breadcrumbsItem.itemListElement;
                    data.category = elements[elements.length - 1].name;
                }
            }
        } catch (e) {
            console.error("Nykaa JSON-LD parse error", e);
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
            data.title = getText('h1') || getText('.pdp-title') || getText('.css-1gc4a74');
        }

        if (!data.price) {
            data.price = getText('.css-1jcz4rn') || getText('.css-11111') || getText('.css-17g6nbg');
        }

        // Extract MRP (strike-through or original price)
        let foundMrp = '';
        
        // 1. Look for explicit "MRP" text
        const mrpNodes = Array.from(document.querySelectorAll('span, p, div')).filter(el => el.innerText && el.innerText.includes('MRP'));
        for (const node of mrpNodes) {
             const text = node.innerText.replace(/\s+/g, ' ');
             const match = text.match(/MRP\s*[:]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+)/i);
             if (match) {
                 foundMrp = match[1];
                 break;
             }
        }
        
        // 2. Look for strike-through elements
        if (!foundMrp) {
            const possibleMrps = document.querySelectorAll('del, s, span[style*="line-through"], [class*="strike"], .css-1h29b8c, .css-17x46n5');
            for (const el of possibleMrps) {
                if (el?.innerText) {
                    const cleaned = el.innerText.replace(/[^0-9]/g, '');
                    if (cleaned && parseInt(cleaned) > parseInt(data.price || 0)) {
                        foundMrp = cleaned;
                        break;
                    }
                }
            }
        }

        // 3. Heuristic: Find price element's container and extract the highest number
        if (!foundMrp && data.price) {
            const priceVal = parseInt(String(data.price).replace(/[^0-9]/g, ''));
            const priceElements = Array.from(document.querySelectorAll('*')).filter(el => {
                if (el.children.length > 0) return false;
                const txt = el.innerText || '';
                return txt.includes(String(priceVal)) || txt.replace(/[^0-9]/g, '') === String(priceVal);
            });
            
            if (priceElements.length > 0) {
                let container = priceElements[0].parentElement;
                if (container) container = container.parentElement || container;
                if (container) {
                     const text = container.innerText || '';
                     // Require currency symbol to prevent extracting pincodes or review counts
                     const matches = Array.from(text.matchAll(/(?:₹|Rs\.?|INR)\s*([\d,]+)/gi));
                     let maxVal = priceVal;
                     for (const match of matches) {
                         const val = parseInt(match[1].replace(/,/g, ''));
                         if (val > maxVal && val <= priceVal * 10) {
                             maxVal = val;
                         }
                     }
                     if (maxVal > priceVal) {
                         foundMrp = String(maxVal);
                     }
                }
            }
        }

        if (foundMrp) {
             data.mrp = foundMrp;
        }

        // Category from breadcrumbs (fallback)
        if (!data.category) {
            const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumbs li, .css-11111 li, .breadcrumb-item, .css-10ncmti'))
                .map(el => el.innerText.trim())
                .filter(Boolean);
            if (breadcrumbs.length > 1) {
                data.category = breadcrumbs[breadcrumbs.length - 1] === data.title ? breadcrumbs[breadcrumbs.length - 2] : breadcrumbs[breadcrumbs.length - 1];
            }
        }

        // Images from DOM
        const domImgs = Array.from(document.querySelectorAll('img')).map(img => img.src || img.getAttribute('src'));
        domImgs.forEach(src => {
            if (src && src.startsWith('http') && src.includes('catalog/product') && !data.images.includes(src)) {
                // Ensure we get high-res images if possible
                const cleanSrc = src.replace(/tr:w-\d+,h-\d+,cm-pad_resize/, 'tr:w-800,h-800,cm-pad_resize');
                if (!data.images.includes(cleanSrc)) {
                    data.images.push(cleanSrc);
                }
            }
        });
        
        // Deduplicate images just in case
        data.images = [...new Set(data.images)];

        // Normalization
        if (data.price) data.price = String(data.price).replace(/[^0-9]/g, '');
        if (data.mrp) data.mrp = String(data.mrp).replace(/[^0-9]/g, '');
        
        // If MRP is missing or somehow less than price, assume price is MRP (no discount)
        if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
            data.mrp = data.price;
        }

        return data;
    });
}
