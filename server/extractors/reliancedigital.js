export async function extractRelianceDigital(page) {
    // Wait for the main elements to load
    await page.waitForSelector('h1, h2, .pdp__title, .product-title', { timeout: 15000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));

    return await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || '';
        
        let data = {
            title: '',
            store: 'Reliance Digital',
            category: '',
            description: '',
            mrp: '',
            price: '',
            images: []
        };

        // 1. JSON-LD Extraction
        const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of ldScripts) {
            try {
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
                    const leaf = elements[elements.length - 1];
                    const parent = elements.length > 1 ? elements[elements.length - 2] : leaf;
                    
                    const leafName = leaf.name || leaf.item?.name || '';
                    const parentName = parent.name || parent.item?.name || '';
                    
                    if (!data.category) {
                        data.category = (leafName.length > 30 || (data.title && leafName.includes(data.title.substring(0, 10)))) ? parentName : leafName;
                    }
                }
            } catch (e) {
                // Ignore parse errors for individual scripts
            }
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
            data.title = getText('h1.pdp__title') || getText('h1') || getText('.pdp__title') || getText('.product-title');
        }

        if (!data.price) {
            data.price = getText('.pdp__priceSection__price') || getText('.pdp__price') || getText('span.pdp__priceSection__price') || getText('.cp-price') || getText('.price');
        }
        
        // Helper to extract clean number from string (e.g., "85,999.00" -> 85999)
        const extractNumber = (str) => {
            const match = String(str).replace(/,/g, '').match(/\d+(\.\d+)?/);
            return match ? Math.round(parseFloat(match[0])) : 0;
        };
        
        // Generic Price Fallback if classes failed and JSON-LD failed
        if (!data.price || extractNumber(data.price) === 0) {
            // Find the most prominent price-like element
            const priceEls = Array.from(document.querySelectorAll('span, div, p, b, h1, h2, h3, h4'))
                .filter(el => {
                    if (el.children.length > 0) return false;
                    const txt = el.innerText || '';
                    return (txt.includes('₹') || txt.toLowerCase().includes('rs')) && extractNumber(txt) > 0;
                });
            
            // Assume the lowest prominent number is the deal price (filtering out tiny values)
            let prices = priceEls.map(el => extractNumber(el.innerText)).filter(p => p > 100);
            if (prices.length > 0) {
                // Often there's a deal price and an MRP. Deal price is usually the lower of the top prominent numbers.
                data.price = String(Math.min(...prices));
            }
        }

        // Extract MRP (strike-through or original price)
        let foundMrp = 0;
        const priceVal = extractNumber(data.price || '0');
        
        // 1. Look for explicit "MRP" text
        const mrpNodes = Array.from(document.querySelectorAll('span, p, div, li')).filter(el => {
            if (el.children.length > 0) return false;
            return el.innerText && el.innerText.toUpperCase().includes('MRP');
        });
        for (const node of mrpNodes) {
             const text = node.innerText.replace(/\s+/g, ' ');
             const match = text.match(/MRP\s*[:]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(\.\d+)?)/i);
             if (match) {
                 foundMrp = extractNumber(match[1]);
                 if (foundMrp >= priceVal && foundMrp <= priceVal * 10) break;
                 foundMrp = 0; // Invalid MRP, keep looking
             }
        }
        
        // 2. Look for strike-through elements
        if (!foundMrp) {
            const possibleMrps = document.querySelectorAll('.pdp__mrp, .pdp__originalPrice, span.pdp__mrp, del, .strike, span[style*="line-through"], [style*="text-decoration: line-through"]');
            for (const el of possibleMrps) {
                if (el?.innerText) {
                    const cleaned = extractNumber(el.innerText);
                    if (cleaned && cleaned > priceVal && cleaned <= priceVal * 10) {
                        foundMrp = cleaned;
                        break;
                    }
                }
            }
        }

        // 3. Heuristic: Find price element's container and extract the highest number
        if (!foundMrp && priceVal > 0) {
            const priceElements = Array.from(document.querySelectorAll('*')).filter(el => {
                if (el.children.length > 0) return false;
                const txt = el.innerText || '';
                return txt.includes(String(priceVal)) || extractNumber(txt) === priceVal;
            });
            
            if (priceElements.length > 0) {
                let container = priceElements[0].parentElement;
                if (container) container = container.parentElement || container;
                if (container) {
                     const text = container.innerText || '';
                     // Require currency symbol to prevent extracting pincodes or review counts
                     const matches = Array.from(text.matchAll(/(?:₹|Rs\.?|INR)\s*([\d,]+(\.\d+)?)/gi));
                     let maxVal = priceVal;
                     for (const match of matches) {
                         const val = extractNumber(match[1]);
                         if (val > maxVal && val <= priceVal * 10) {
                             maxVal = val;
                         }
                     }
                     if (maxVal > priceVal) {
                         foundMrp = maxVal;
                     }
                }
            }
        }

        // 4. Generic fallback: Just look for a number higher than price with a currency symbol
        if (!foundMrp && priceVal > 0) {
            const anyCurrencyNodes = Array.from(document.querySelectorAll('span, div, p, b'))
                .filter(el => el.children.length === 0 && (el.innerText.includes('₹') || el.innerText.toLowerCase().includes('rs')));
            for (const node of anyCurrencyNodes) {
                const val = extractNumber(node.innerText);
                if (val > priceVal && val <= priceVal * 10) {
                    foundMrp = val;
                    // Keep searching in case there's an even higher legitimate MRP? 
                    // Usually we just want one that is > priceVal.
                }
            }
        }

        if (foundMrp) {
             data.mrp = String(foundMrp);
        }

        // Category from breadcrumbs
        if (!data.category) {
            const breadcrumbs = Array.from(document.querySelectorAll('.pdp__breadcrumb li, ul.breadcrumbs li, .breadcrumbs li, [aria-label="breadcrumb"] li, ol li'))
                .map(el => el.innerText.trim())
                .filter(Boolean);
            if (breadcrumbs.length > 1) {
                data.category = breadcrumbs[breadcrumbs.length - 1] === data.title ? breadcrumbs[breadcrumbs.length - 2] : breadcrumbs[breadcrumbs.length - 1];
            }
        }

        // Images fallback
        const domImgs = Array.from(document.querySelectorAll('img')).map(img => img.getAttribute('data-src') || img.getAttribute('data-srcset') || img.src || img.getAttribute('src'));
        domImgs.forEach(src => {
            if (src && src.startsWith('http') && (src.includes('/medias/') || src.includes('product') || src.includes('jmd-asp')) && !src.includes('placeholder')) {
                const cleanSrc = src.split(' ')[0]; // handle srcset format just in case
                if (!data.images.includes(cleanSrc)) {
                    data.images.push(cleanSrc);
                }
            }
        });
        
        // Deduplicate images
        data.images = [...new Set(data.images)];

        // Normalization
        if (data.price) data.price = String(extractNumber(data.price) || data.price);
        if (data.mrp) data.mrp = String(extractNumber(data.mrp) || data.mrp);
        
        // If MRP is missing or somehow less than price, assume price is MRP (no discount)
        if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
            data.mrp = data.price;
        }

        return data;
    });
}
