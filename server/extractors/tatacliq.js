export async function extractTataCliq(page) {
    // Wait for the main elements to load
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));

    return await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || '';
        
        let data = {
            title: '',
            store: 'Tata CLiQ',
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
            data.title = getText('h1') || getText('.ProductDescription__name') || getText('.ProductDetailsMain__name');
        }

        if (!data.price) {
            data.price = getText('.ProductDescription__price') || getText('.ProductDescription__sellingPrice') || getText('.ProductDetailsMain__price') || getText('h3.price');
        }
        
        // Helper to extract clean number from string (e.g., "85,999.00" -> 85999)
        const extractNumber = (str) => {
            const match = String(str).replace(/,/g, '').match(/\d+(\.\d+)?/);
            return match ? Math.round(parseFloat(match[0])) : 0;
        };
        
        // Extract MRP
        let foundMrp = 0;
        const priceVal = extractNumber(data.price || '0');
        
        // 1. Look for explicit "MRP" text (even if separated in DOM)
        if (!foundMrp) {
            const allElements = Array.from(document.querySelectorAll('*'));
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                if (el.children.length === 0 && el.innerText && el.innerText.toUpperCase().includes('MRP')) {
                    const text = el.innerText.replace(/\s+/g, ' ');
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
                             const nextVal = extractNumber(nextEl.innerText);
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
            const possibleMrps = document.querySelectorAll('.ProductDescription__mrp, .ProductDetailsMain__mrp, del, .strike, span[style*="line-through"], [style*="text-decoration: line-through"]');
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
            const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumbs li, .breadcrumb-item, .ProductDescription__breadcrumb li, .breadcrumb li, [aria-label="breadcrumb"] li'))
                .map(el => el.innerText.trim())
                .filter(Boolean);
            if (breadcrumbs.length > 1) {
                data.category = breadcrumbs[breadcrumbs.length - 1] === data.title ? breadcrumbs[breadcrumbs.length - 2] : breadcrumbs[breadcrumbs.length - 1];
            }
        }
        
        // Super Generic Category Fallback: Find the breadcrumb wrapper by looking for 'Home'
        if (!data.category) {
            const allLinks = Array.from(document.querySelectorAll('a'));
            const homeLinkIndex = allLinks.findIndex(a => a.innerText.trim().toUpperCase() === 'HOME');
            if (homeLinkIndex !== -1) {
                let nextLink = allLinks[homeLinkIndex + 1];
                let secondNextLink = allLinks[homeLinkIndex + 2];
                if (nextLink && nextLink.innerText.trim()) {
                    let cat = nextLink.innerText.trim();
                    if (secondNextLink && secondNextLink.innerText.trim() && cat.length < 10) {
                        cat = secondNextLink.innerText.trim(); // sometimes "Home > Men > T-Shirts", we want T-Shirts
                    }
                    if (cat.length > 2 && cat.length < 40) {
                        data.category = cat;
                    }
                }
            }
        }

        // Images fallback
        const domImgs = Array.from(document.querySelectorAll('img')).map(img => img.getAttribute('data-src') || img.getAttribute('data-original') || img.src || img.getAttribute('src'));
        domImgs.forEach(src => {
            if (src && src.startsWith('http') && !src.includes('placeholder') && !src.includes('lazyLoading') && !src.endsWith('.svg') && !src.includes('logo')
                && !src.includes('quora.com') && !src.includes('twitter.com') && !src.includes('t.co') 
                && !src.includes('moengage.com') && !src.includes('sys_master')) {
                const cleanSrc = src.split(' ')[0];
                if (!data.images.includes(cleanSrc)) {
                    data.images.push(cleanSrc);
                }
            }
        });
        
        // Deduplicate and normalize images (fix protocol-relative URLs)
        data.images = [...new Set(data.images)]
            .map(url => url.startsWith('//') ? `https:${url}` : url)
            .filter(url => url.startsWith('http'));

        // Normalization
        if (data.price) data.price = String(extractNumber(data.price) || data.price);
        if (data.mrp) data.mrp = String(extractNumber(data.mrp) || data.mrp);
        if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
            data.mrp = data.price;
        }

        return data;
    });
}
