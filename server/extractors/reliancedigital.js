export async function extractRelianceDigital(page) {
    // Wait for product page to render (SPA needs JS)
    // First wait for any content indicator
    await page.waitForSelector('h1, .pdp__title, .pdp-title, [class*="pdp"], [data-qa="productTitle"]', { timeout: 20000 }).catch(() => {});
    // Then give extra time for price/product data to load via API calls
    await new Promise(r => setTimeout(r, 4500));
    // Wait specifically for price or product content to appear
    await page.waitForFunction(() => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('₹') || bodyText.includes('Add to Cart') || bodyText.includes('Buy Now');
    }, { timeout: 10000 }).catch(() => {});


    return await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
        
        let data = {
            title: '',
            store: 'Reliance Digital',
            category: '',
            description: '',
            mrp: '',
            price: '',
            images: []
        };

        // Helper to extract clean number
        const extractNumber = (str) => {
            const match = String(str || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
            return match ? Math.round(parseFloat(match[0])) : 0;
        };

        // 1. JSON-LD Extraction (most reliable)
        const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of ldScripts) {
            try {
                let text = (script.textContent || '').trim();
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
                    const crumbs = elements.map(e => e.name || e.item?.name).filter(c => c && c.toLowerCase() !== 'home' && c.toLowerCase() !== 'reliance digital');
                    if (!data.category && crumbs.length > 0) {
                        // Use second-to-last (the category, not the product name)
                        const leaf = crumbs[crumbs.length - 1];
                        const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : crumbs[0];
                        // If leaf looks like a product name (too long or contains the title), use parent
                        data.category = (leaf.length > 30 || (data.title && leaf.includes(data.title.substring(0, 10)))) ? parent : leaf;
                    }
                }
            } catch (e) {}
        }

        // 2. Meta Tags - but skip og:title as Reliance Digital uses the site name there
        const getMeta = (prop) => {
            const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
            return el?.content?.trim() || '';
        };
        
        // Only use og:title if it doesn't look like the generic site title
        if (!data.title) {
            const ogTitle = getMeta('og:title');
            if (ogTitle && !ogTitle.toLowerCase().includes('online electronic') && !ogTitle.toLowerCase().includes('reliance digital') && ogTitle.length < 100) {
                data.title = ogTitle;
            }
        }
        if (!data.description) data.description = getMeta('og:description') || getMeta('description');
        if (data.images.length === 0) {
            const ogImg = getMeta('og:image');
            if (ogImg && ogImg.startsWith('http')) data.images.push(ogImg);
        }

        // 3. DOM Fallbacks - use multiple selectors for Reliance Digital's dynamic CSS class names
        if (!data.title) {
            data.title = getText('h1.pdp__title') || 
                         getText('h1[class*="pdp"]') || 
                         getText('.pdp__title') || 
                         getText('.product-title') ||
                         getText('[data-qa="productTitle"]') ||
                         getText('h1');
        }

        // Clean title: remove site name suffix if present
        if (data.title && data.title.toLowerCase().includes('reliance digital')) {
            data.title = data.title.split('|')[0].split('-').slice(0, -1).join('-').trim() || data.title;
        }

        if (!data.price) {
            const priceSelectors = [
                '.pdp__priceSection__price',
                '[class*="pdp"][class*="price"]',
                '[class*="Price"][class*="final"]',
                '[class*="FinalPrice"]',
                '.cp-price',
                '.price',
                '[data-qa="productPrice"]',
                '[class*="selling-price"]',
            ];
            for (const sel of priceSelectors) {
                const txt = getText(sel);
                if (txt && extractNumber(txt) > 0) {
                    data.price = txt;
                    break;
                }
            }
        }
        
        // Generic Price Fallback: find prominent price-looking elements
        if (!data.price || extractNumber(data.price) === 0) {
            const priceEls = Array.from(document.querySelectorAll('span, div, p, b, h1, h2, h3, h4'))
                .filter(el => {
                    if (el.children.length > 0) return false;
                    const txt = el.textContent || '';
                    return (txt.includes('₹') || txt.toLowerCase().includes('rs.')) && extractNumber(txt) > 100;
                });
            
            let prices = priceEls.map(el => extractNumber(el.textContent)).filter(p => p > 100);
            if (prices.length > 0) {
                data.price = String(Math.min(...prices));
            }
        }

        // Extract MRP
        let foundMrp = 0;
        const priceVal = extractNumber(data.price || '0');
        
        // Look for explicit "MRP" text nodes
        const mrpNodes = Array.from(document.querySelectorAll('span, p, div, li')).filter(el => {
            if (el.children.length > 0) return false;
            return el.textContent && el.textContent.toUpperCase().includes('MRP');
        });
        for (const node of mrpNodes) {
            const text = node.textContent.replace(/\s+/g, ' ');
            const match = text.match(/MRP\s*[:]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(\.\d+)?)/i);
            if (match) {
                const val = extractNumber(match[1]);
                if (val >= priceVal && val <= priceVal * 10) {
                    foundMrp = val;
                    break;
                }
            } else {
                // MRP label and value might be in separate elements
                const parent = node.parentElement;
                if (parent) {
                    const sibling = node.nextElementSibling;
                    if (sibling) {
                        const sibVal = extractNumber(sibling.textContent);
                        if (sibVal >= priceVal && sibVal <= priceVal * 10) {
                            foundMrp = sibVal;
                            break;
                        }
                    }
                }
            }
        }
        
        // Look for strike-through elements
        if (!foundMrp) {
            const possibleMrps = document.querySelectorAll('.pdp__mrp, .pdp__originalPrice, span.pdp__mrp, del, .strike, span[style*="line-through"], [style*="text-decoration: line-through"], [class*="original-price"], [class*="OriginalPrice"]');
            for (const el of possibleMrps) {
                if (el?.textContent) {
                    const cleaned = extractNumber(el.textContent);
                    if (cleaned && cleaned >= priceVal && cleaned <= priceVal * 10) {
                        foundMrp = cleaned;
                        break;
                    }
                }
            }
        }

        // Heuristic: find the highest price-looking number near the deal price
        if (!foundMrp && priceVal > 0) {
            const anyCurrencyNodes = Array.from(document.querySelectorAll('span, div, p, b'))
                .filter(el => el.children.length === 0 && (el.textContent.includes('₹') || el.textContent.toLowerCase().includes('rs')));
            for (const node of anyCurrencyNodes) {
                const val = extractNumber(node.textContent);
                if (val > priceVal && val <= priceVal * 5) {
                    foundMrp = val;
                }
            }
        }

        if (foundMrp) {
            data.mrp = String(foundMrp);
        }

        // Category from breadcrumbs DOM
        if (!data.category) {
            const crumbSelectors = [
                '.pdp__breadcrumb li', 'ul.breadcrumbs li', '.breadcrumbs li',
                '[aria-label="breadcrumb"] li', 'ol li', '[class*="breadcrumb"] a',
            ];
            for (const sel of crumbSelectors) {
                const breadcrumbs = Array.from(document.querySelectorAll(sel))
                    .map(el => el.textContent.trim())
                    .filter(c => c && c.toLowerCase() !== 'home' && c.toLowerCase() !== 'reliance digital');
                if (breadcrumbs.length > 0) {
                    const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
                    const isTitle = lastBreadcrumb === data.title || lastBreadcrumb.length > 30;
                    data.category = isTitle && breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : lastBreadcrumb;
                    break;
                }
            }
        }

        // Images - filter to only product images from Reliance Digital CDN
        const domImgs = Array.from(document.querySelectorAll('img')).map(img => 
            img.getAttribute('data-src') || img.src || img.getAttribute('src'));
        domImgs.forEach(src => {
            if (src && src.startsWith('http') && 
                (src.includes('/medias/') || src.includes('jiostore') || src.includes('jmd-asp') || src.includes('product')) &&
                !src.includes('placeholder') && !src.includes('logo') && !src.includes('icon') &&
                !src.includes('.svg') && !src.includes('banner')) {
                const cleanSrc = src.split(' ')[0];
                if (!data.images.includes(cleanSrc)) {
                    data.images.push(cleanSrc);
                }
            }
        });
        
        data.images = [...new Set(data.images)];

        // Final normalization
        if (data.price) data.price = String(extractNumber(data.price) || data.price);
        if (data.mrp) data.mrp = String(extractNumber(data.mrp) || data.mrp);
        if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
            data.mrp = data.price;
        }

        if (!data.title || data.price === '0' || data.price === '' || data.title.includes('Oops! The page was not found') || data.title.includes('404')) {
            throw new Error("Product not found or blocked by Reliance Digital");
        }

        return data;
    });
}
