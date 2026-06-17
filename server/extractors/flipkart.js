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

    const extractNumber = (str) => {
        const match = String(str).match(/[0-9,]+(\.[0-9]+)?/);
        return match ? Math.round(parseFloat(match[0].replace(/,/g, ''))) : 0;
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
    let mainPriceText = $('.aMaAEs .Nx9bqj.CxhGGd').first().text().trim() ||
                        $('.aMaAEs .Nx9bqj').first().text().trim() ||
                        $('.Nx9bqj.CxhGGd').first().text().trim() ||
                        $('._30jeq3._16Jk6d').first().text().trim() ||
                        $('.UOCQB1 .Nx9bqj').first().text().trim();
                        
    if (mainPriceText) {
        let pVal = extractNumber(mainPriceText);
        if (pVal > 0) data.price = String(pVal);
    } else if (!data.price || parseInt(data.price) === 0) {
        let possible = [];
        $('div, span').each((i, el) => {
            const txt = $(el).text().trim();
            if (txt.startsWith('₹') && txt.length < 15 && $(el).children().length === 0 && !txt.includes('/mo') && !txt.includes('EMI')) {
                let num = extractNumber(txt);
                if (num > 0) possible.push(num);
            }
        });
        if (possible.length > 0) {
            data.price = String(possible[0]);
        }
    }

    // 2. DOM Fallbacks
    if (!data.title) {
        data.title = $('meta[name="twitter:title"]').attr('content') || $('meta[property="og:title"]').attr('content') || $('title').text().split('|')[0].trim();
    }
    if (!data.title) {
        data.title = $('h1').first().text().trim() || $('.VU-Tz5').first().text().trim() || $('.B_NuCI').first().text().trim();
    }

    if (!data.description) {
        data.description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content') || '';
    }

    // Ensure price is cleaned up at the end
    if (data.price) {
        data.price = String(extractNumber(data.price));
    }

    if (!data.mrp) {
        let currentPrice = 0;
        if (data.price) {
            currentPrice = extractNumber(data.price);
        }

        let foundMrps = [];
        $('*').each((i, el) => {
            const style = $(el).attr('style') || '';
            const tagName = el.tagName ? el.tagName.toLowerCase() : '';
            if (style.includes('line-through') || tagName === 'strike' || tagName === 'del' || tagName === 's' || $(el).hasClass('yRaY8j') || $(el).hasClass('yRaY8j Zk7Ypt')) {
                const text = $(el).text().trim();
                const num = extractNumber(text);
                if (num > 0) {
                    foundMrps.push(num);
                }
            }
        });
        
        // NEW HEURISTIC: Find the element containing the price, go up to its parent, extract all numbers.
        if (foundMrps.length === 0 && currentPrice > 0) {
            let priceNodes = [];
            $('*').each((i, el) => {
                if ($(el).children().length === 0) {
                    let txt = $(el).text().trim().replace(/[^0-9]/g, '');
                    if (txt === String(currentPrice)) {
                        priceNodes.push(el);
                    }
                }
            });
            
            priceNodes.forEach(node => {
                let parent = $(node).parent();
                if (parent) {
                    let parent2 = parent.parent();
                    let textToScan = $(parent2).text() || $(parent).text() || '';
                    let matches = textToScan.match(/[0-9,]+/g);
                    if (matches) {
                        matches.forEach(m => {
                            let val = parseInt(m.replace(/,/g, ''), 10);
                            if (!isNaN(val) && val > currentPrice && val <= currentPrice * 10) {
                                foundMrps.push(val);
                            }
                        });
                    }
                }
            });
        }
        
        const validMrp = foundMrps.find(m => m > currentPrice);
        if (validMrp) {
            data.mrp = String(validMrp);
        } else if (foundMrps.length > 0) {
            data.mrp = String(Math.max(...foundMrps));
        }
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

    if (data.price) data.price = String(extractNumber(data.price));
    if (data.mrp) data.mrp = String(extractNumber(data.mrp));
    
    // Ensure MRP is valid relative to Price
    if (!data.mrp || parseInt(data.mrp) <= parseInt(data.price)) {
        // Fallback: check if description contains "Rs. XXX" or "₹ XXX" which is often the MRP
        if (data.description) {
            const descMatches = data.description.match(/(?:Rs\.|₹|INR)\s*([0-9,]+(\.[0-9]+)?)/gi);
            if (descMatches) {
                let maxDescVal = parseInt(data.price);
                descMatches.forEach(m => {
                    // Extract just the number part, e.g., "799.0" from "Rs.799.0"
                    const numMatch = m.match(/[0-9,]+(\.[0-9]+)?/);
                    if (numMatch) {
                        const val = Math.round(parseFloat(numMatch[0].replace(/,/g, '')));
                        if (!isNaN(val) && val > maxDescVal && val <= maxDescVal * 10) {
                            maxDescVal = val;
                        }
                    }
                });
                if (maxDescVal > parseInt(data.price)) {
                    data.mrp = String(maxDescVal);
                }
            }
        }
        
        if (!data.mrp || parseInt(data.mrp) < parseInt(data.price)) {
            data.mrp = data.price;
        }
    }

    return data;
}
