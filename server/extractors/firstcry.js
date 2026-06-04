export async function extractFirstCry(page) {
    // Wait for the main elements to load
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
    // Give the SPA time to populate prices and product data
    await new Promise(r => setTimeout(r, 4500));
    // Wait for price content to appear
    await page.waitForFunction(() => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('₹') || bodyText.includes('Rs.') || bodyText.includes('Add to Cart') || bodyText.includes('Buy Now');
    }, { timeout: 10000 }).catch(() => {});


    return await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
        
        let data = {
            title: '',
            store: 'FirstCry',
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
            data.title = getText('h1') || getText('.prod-name');
        }

        if (!data.price) {
            const priceEl = document.querySelector('span.prod-price') || document.querySelector('#prod_price') || document.querySelector('.price-div') || document.querySelector('.price');
            if (priceEl) {
                const sup = priceEl.querySelector('sup');
                if (sup) {
                    // Reconstruct decimal price
                    const clone = priceEl.cloneNode(true);
                    const cloneSup = clone.querySelector('sup');
                    const supText = cloneSup.textContent.trim();
                    cloneSup.remove();
                    const mainText = clone.textContent.trim();
                    data.price = `${mainText}.${supText}`;
                } else {
                    data.price = priceEl.getAttribute('data-price') || priceEl.textContent || '';
                }
            }
        }
        
        // Check window variables for FirstCry price if DOM failed or was incorrect
        if (window.topnonClubPrice && window.topnonClubPrice > 0) {
            data.price = String(window.topnonClubPrice);
        } else if (window.topClubPrice && window.topClubPrice > 0) {
            data.price = String(window.topClubPrice);
        }
        
        // Helper to extract clean number from string (e.g., "85,999.00" -> 85999)
        const extractNumber = (str) => {
            const match = String(str).replace(/,/g, '').match(/\d+(\.\d+)?/);
            return match ? Math.round(parseFloat(match[0])) : 0;
        };

        // Extract MRP
        let foundMrp = 0;
        const priceVal = extractNumber(data.price || '0');
        
        // First check window variables for FirstCry MRP
        if (window.MRP && window.MRP > 0) {
            foundMrp = window.MRP;
        } else if (window.mrp && window.mrp > 0) {
            foundMrp = window.mrp;
        }
        
        // 1. Look for explicit "MRP" text (even if separated in DOM)
        if (!foundMrp) {
            const allElements = Array.from(document.querySelectorAll('*'));
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                if (el.children.length === 0 && el.textContent && el.textContent.toUpperCase().includes('MRP')) {
                    // It might be in this element: "MRP ₹ 999"
                    const text = el.textContent.replace(/\s+/g, ' ');
                    let match = text.match(/MRP\s*[:]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(\.\d+)?)/i);
                    if (match) {
                        const val = extractNumber(match[1]);
                        if (val >= priceVal && val <= priceVal * 10) {
                            foundMrp = val;
                            break;
                        }
                    } else {
                        // Or it might be in the immediate next element: <span>MRP</span> <span>₹ 999</span>
                        let nextEl = allElements[i+1];
                        if (nextEl) {
                             const nextVal = extractNumber(nextEl.textContent);
                             if (nextVal >= priceVal && nextVal <= priceVal * 10) {
                                 foundMrp = nextVal;
                                 break;
                             }
                        }
                    }
                }
            }
        }
        
        // 2. Look for strike-through elements
        if (!foundMrp) {
            const possibleMrps = document.querySelectorAll('span.prod-mrp, #prod_mrp, del, .strike, span[style*="line-through"], [style*="text-decoration: line-through"], .mrp-div, .mrp, .original-price, .old-price');
            for (const el of possibleMrps) {
                if (el?.textContent) {
                    const cleaned = extractNumber(el.textContent);
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
                const txt = el.textContent || '';
                return txt.includes(String(priceVal)) || extractNumber(txt) === priceVal;
            });
            
            if (priceElements.length > 0) {
                let container = priceElements[0].parentElement;
                if (container) container = container.parentElement || container;
                if (container) {
                     const text = container.textContent || '';
                     
                     // First try with currency symbol to be safe
                     let matches = Array.from(text.matchAll(/(?:₹|Rs\.?|INR)\s*([\d,]+(\.\d+)?)/gi));
                     let maxVal = priceVal;
                     for (const match of matches) {
                         const val = extractNumber(match[1]);
                         if (val > maxVal && val <= priceVal * 10) {
                             maxVal = val;
                         }
                     }
                     
                     // If still no luck, grab ANY number in the container that makes sense as an MRP
                     if (maxVal === priceVal) {
                         matches = Array.from(text.matchAll(/([\d,]{2,}(\.\d+)?)/g));
                         for (const match of matches) {
                             const val = extractNumber(match[1]);
                             if (val > maxVal && val <= priceVal * 10) {
                                 maxVal = val;
                             }
                         }
                     }
                     
                     if (maxVal > priceVal) {
                         foundMrp = maxVal;
                     }
                }
            }
        }

        if (foundMrp) {
             data.mrp = String(foundMrp);
        }

        // Category from breadcrumbs
        if (!data.category) {
            const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumbs li, .breadcrumb-item, .div-breadcrumb li, [aria-label="breadcrumb"] li, ol li, .brd-c li, #breadcrum a, .breadcrum a, .p11 a, .crumbs a, .bc_container a, .R11_61'))
                .map(el => el.textContent.trim())
                .filter(Boolean);
            if (breadcrumbs.length > 1) {
                data.category = breadcrumbs[breadcrumbs.length - 1] === data.title ? breadcrumbs[breadcrumbs.length - 2] : breadcrumbs[breadcrumbs.length - 1];
            }
        }
        
        // Super Generic Category Fallback: Find the breadcrumb wrapper by looking for 'Home'
        if (!data.category) {
            const allLinks = Array.from(document.querySelectorAll('a'));
            const homeLinkIndex = allLinks.findIndex(a => a.textContent.trim().toUpperCase() === 'HOME');
            if (homeLinkIndex !== -1) {
                // The breadcrumb usually follows 'Home' immediately in the DOM order
                let nextLink = allLinks[homeLinkIndex + 1];
                let secondNextLink = allLinks[homeLinkIndex + 2];
                
                // FirstCry usually has Home > [Gender] Fashion > [Category]
                if (nextLink && nextLink.textContent.trim()) {
                    let cat = nextLink.textContent.trim();
                    if (cat.toLowerCase().includes('fashion') && secondNextLink && secondNextLink.textContent.trim()) {
                        cat = secondNextLink.textContent.trim();
                    }
                    if (cat.length > 2 && cat.length < 40) {
                        data.category = cat;
                    }
                }
            }
        }
        
        // If still missing, check for a global Category variable in JS
        if (!data.category && window.Category) {
             data.category = window.Category;
        }

        // Images fallback
        const domImgs = Array.from(document.querySelectorAll('img')).map(img => img.getAttribute('data-src') || img.getAttribute('data-original') || img.src || img.getAttribute('src'));
        domImgs.forEach(src => {
            if (src && src.startsWith('http') && !src.includes('placeholder') && !src.includes('lazyLoading') && !src.endsWith('.svg')) {
                const cleanSrc = src.split(' ')[0];
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
        if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
            data.mrp = data.price;
        }

        return data;
    });
}
