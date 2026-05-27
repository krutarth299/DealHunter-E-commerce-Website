export async function extractFlipkart(page) {
    // Wait a bit to let client-side React hydration happen
    await new Promise(resolve => setTimeout(resolve, 3000));

    return await page.evaluate(() => {
        let data = {
            title: '',
            store: 'Flipkart',
            category: '',
            description: '',
            mrp: '',
            price: '',
            images: []
        };

        // 1. STRATEGY A: JSON-LD Extraction (Most reliable, immune to CSS class changes)
        try {
            const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of ldScripts) {
                const parsed = JSON.parse(script.innerText || '{}');
                // Check if this script block contains Product data
                // Sometimes Flipkart wraps it in an array
                const items = Array.isArray(parsed) ? parsed : [parsed];
                
                for (const item of items) {
                    if (item['@type'] === 'Product') {
                        if (item.name && !data.title) data.title = item.name;
                        if (item.description && !data.description) data.description = item.description;
                        
                        if (item.category && !data.category) {
                            data.category = item.category;
                        }
                        
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
                    } else if (item['@type'] === 'BreadcrumbList') {
                        // Extract category from breadcrumbs
                        if (item.itemListElement && item.itemListElement.length > 0) {
                            // Usually the first few are Home > Category > Subcategory
                            // Let's pick the second or third
                            const cats = item.itemListElement.map(el => el.item ? el.item.name : '').filter(Boolean);
                            if (cats.length > 1 && !data.category) {
                                data.category = cats[1]; 
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("JSON-LD parse error", e);
        }

        // 2. STRATEGY B: DOM Fallbacks (for any fields JSON-LD missed, especially MRP)
        const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.innerText.trim() : '';
        };

        // Title fallback
        if (!data.title) {
            data.title = getText('.VU-Tz5') || getText('.B_NuCI') || getText('h1');
        }
        
        // Collect all leaf elements containing price-like patterns (Rs/₹ followed by digits, or containing ₹/Rs)
        const priceElements = [];
        document.querySelectorAll('*').forEach(el => {
            const text = el.innerText || '';
            if (text && (text.includes('₹') || text.includes('Rs') || (text.includes('MRP') && /\d+/.test(text)))) {
                // If it has children, check if any child has price text. We want leaf elements representing the price text.
                const hasChildWithPrice = Array.from(el.children).some(child => {
                    const childText = child.innerText || '';
                    return childText.includes('₹') || childText.includes('Rs');
                });
                if (!hasChildWithPrice && el.innerText.trim()) {
                    priceElements.push(el);
                }
            }
        });

        // Robust Deal Price fallback
        if (!data.price) {
            // Find the price element with the largest font size (typically the main selling price)
            let maxFontSize = 0;
            let bestPrice = '';
            for (let el of priceElements) {
                const style = window.getComputedStyle(el);
                const fontSize = parseFloat(style.fontSize || '0');
                if (fontSize > maxFontSize) {
                    maxFontSize = fontSize;
                    bestPrice = el.innerText;
                }
            }
            if (bestPrice) {
                data.price = bestPrice.replace(/[^0-9]/g, '');
            }
        }

        // Robust MRP extraction using DOM tree distance / proximity to selling price
        if (!data.mrp) {
            const currentPriceNum = parseInt(data.price || '0', 10);
            let foundMrp = 0;
            
            // Helper to compute DOM tree distance
            const getTreeDistance = (el1, el2) => {
                const path1 = [];
                let curr = el1;
                while (curr) {
                    path1.push(curr);
                    curr = curr.parentElement;
                }
                const path2 = [];
                curr = el2;
                while (curr) {
                    path2.push(curr);
                    curr = curr.parentElement;
                }
                let lca = null;
                let idx1 = -1;
                let idx2 = -1;
                for (let i = 0; i < path1.length; i++) {
                    const idx = path2.indexOf(path1[i]);
                    if (idx !== -1) {
                        lca = path1[i];
                        idx1 = i;
                        idx2 = idx;
                        break;
                    }
                }
                if (!lca) return Infinity;
                return idx1 + idx2;
            };

            // Identify the main selling price element (sellingPriceEl) in the DOM
            let sellingPriceEl = null;
            if (currentPriceNum > 0) {
                let maxFontSize = 0;
                document.querySelectorAll('*').forEach(el => {
                    if (el.children.length === 0 && el.innerText) {
                        const num = parseInt(el.innerText.replace(/[^0-9]/g, ''), 10);
                        if (num === currentPriceNum) {
                            const style = window.getComputedStyle(el);
                            const fontSize = parseFloat(style.fontSize || '0');
                            if (fontSize > maxFontSize) {
                                maxFontSize = fontSize;
                                sellingPriceEl = el;
                            }
                        }
                    }
                });
            }

            // Fallback for sellingPriceEl if not found by exact numeric match
            if (!sellingPriceEl && priceElements.length > 0) {
                let maxFontSize = 0;
                for (let el of priceElements) {
                    const style = window.getComputedStyle(el);
                    const fontSize = parseFloat(style.fontSize || '0');
                    if (fontSize > maxFontSize) {
                        maxFontSize = fontSize;
                        sellingPriceEl = el;
                    }
                }
            }

            // Find all candidate strike-through elements on the page and rank them by DOM distance
            if (sellingPriceEl) {
                const candidates = [];
                document.querySelectorAll('*').forEach(el => {
                    const tag = el.tagName;
                    const text = el.innerText || '';
                    if (!text.trim()) return;

                    const style = window.getComputedStyle(el);
                    const textDec = style.textDecoration || '';
                    const textDecLine = style.textDecorationLine || '';
                    
                    const isStrike = textDec.includes('line-through') || 
                                     textDecLine.includes('line-through') || 
                                     tag === 'DEL' || 
                                     tag === 'STRIKE' ||
                                     el.classList.contains('strike') ||
                                     el.classList.contains('yRaY8j') ||
                                     el.classList.contains('_3I9_wc');

                    if (isStrike) {
                        const val = parseInt(text.replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(val) && val > currentPriceNum) {
                            // We only want leaf-like elements for MRP text (to avoid matching big wrapper elements)
                            const hasChildWithStrike = Array.from(el.children).some(child => {
                                const childStyle = window.getComputedStyle(child);
                                const childDec = childStyle.textDecoration || '';
                                const childDecLine = childStyle.textDecorationLine || '';
                                return childDec.includes('line-through') || childDecLine.includes('line-through');
                            });
                            if (!hasChildWithStrike) {
                                candidates.push({
                                    element: el,
                                    val: val,
                                    distance: getTreeDistance(sellingPriceEl, el)
                                });
                            }
                        }
                    }
                });

                // Sort candidates by DOM tree distance
                candidates.sort((a, b) => a.distance - b.distance);

                // Pick the closest strike-through candidate within tree distance threshold (20)
                if (candidates.length > 0 && candidates[0].distance < 20) {
                    foundMrp = candidates[0].val;
                }
            }

            // Fallback 1: Legacy direct selector extraction
            if (!foundMrp) {
                const directMrpText = getText('.yRaY8j.A6z5tZ') || 
                                      getText('._3I9_wc._2p6lqe') || 
                                      getText('.yRaY8j') || 
                                      getText('._3I9_wc') ||
                                      getText('.A6z5tZ') ||
                                      getText('.A8z5tZ') ||
                                      getText('._2p6lqe');
                if (directMrpText) {
                    const val = parseInt(directMrpText.replace(/[^0-9]/g, ''), 10);
                    if (val > currentPriceNum) {
                        foundMrp = val;
                    }
                }
            }

            // Fallback 2: Sibling of discount badge (MRP is always adjacent to the "% off" badge)
            if (!foundMrp) {
                const discountEl = Array.from(document.querySelectorAll('*')).find(el => {
                    const text = el.innerText || '';
                    return el.children.length === 0 && /\d+%\s*off/i.test(text);
                });
                if (discountEl && discountEl.parentElement) {
                    const parent = discountEl.parentElement;
                    const siblingPrices = Array.from(parent.querySelectorAll('*'))
                        .filter(el => el !== discountEl && el.innerText && (el.innerText.includes('₹') || el.innerText.includes('Rs')));
                    for (const sib of siblingPrices) {
                        const priceVal = parseInt(sib.innerText.replace(/[^0-9]/g, ''), 10);
                        if (priceVal > currentPriceNum) {
                            foundMrp = priceVal;
                            break;
                        }
                    }
                }
            }

            if (foundMrp) {
                data.mrp = String(foundMrp);
            }
        }

        // Images fallback
        if (data.images.length === 0) {
            const images = document.querySelectorAll('img.DByuf4, img.v2s646, img._396cs4, img._2r_T1I');
            images.forEach(img => {
                let src = img.src || img.getAttribute('src');
                if (src && src.includes('rukminim')) {
                    // Get high-res version by modifying the URL params
                    src = src.replace(/\/image\/\d+\/\d+\//, '/image/1200/1200/');
                    src = src.replace(/q=\d+/, 'q=100');
                    if (!data.images.includes(src)) data.images.push(src);
                }
            });
        }
        
        // Category fallback
        if (!data.category) {
            const links = Array.from(document.querySelectorAll('a'));
            const homeLink = links.find(a => a.innerText.trim() === 'Home');
            if (homeLink) {
                let curr = homeLink.parentElement;
                for (let i = 0; i < 5; i++) {
                    if (curr && curr.querySelectorAll('a').length > 2) {
                        const cats = Array.from(curr.querySelectorAll('a')).map(a => a.innerText.trim());
                        if (cats.length > 1) {
                            data.category = cats[1];
                        }
                        break;
                    }
                    curr = curr ? curr.parentElement : null;
                }
            }
        }

        // Clean prices
        if (data.price) data.price = String(data.price).replace(/[^0-9]/g, '');
        if (data.mrp) data.mrp = String(data.mrp).replace(/[^0-9]/g, '');
        
        // If MRP is empty or less than price, usually MRP = Price
        if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
            data.mrp = data.price;
        }

        return data;
    });
}
