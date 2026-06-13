import * as cheerio from 'cheerio';

export async function extractPurplle(page, url) {
    try {
        let html;
        try {
            html = await page.content();
        } catch (e) {
            throw new Error(`Failed to get page content: ${e.message}`);
        }

        const $ = cheerio.load(html);

        let title = '', image = '', mrp = 0, dealPrice = 0, category = '', description = '';

        // 1. Try JSON-LD
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const text = $(el).html() || '';
                const jsonData = JSON.parse(text.trim());
                const productNode = Array.isArray(jsonData) ? jsonData.find(j => j['@type'] === 'Product') : (jsonData['@type'] === 'Product' ? jsonData : null);
                
                if (productNode) {
                    if (productNode.name) title = productNode.name;
                    if (productNode.image) image = Array.isArray(productNode.image) ? productNode.image[0] : productNode.image;
                    if (productNode.category) category = productNode.category;
                    if (productNode.description) description = productNode.description;
                    
                    if (productNode.offers) {
                        if (productNode.offers.price) dealPrice = parseFloat(productNode.offers.price);
                        if (productNode.offers.highPrice) mrp = parseFloat(productNode.offers.highPrice);
                    }
                }
            } catch (e) {}
        });

        // 2. Try OG Tags
        if (!title) {
            const ogTitle = $('meta[property="og:title"]').attr('content');
            if (ogTitle) title = ogTitle.split('|')[0].trim();
            else title = $('title').text().split('|')[0].trim();
        }

        if (!image) {
            image = $('meta[property="og:image"]').attr('content') || '';
        }
        
        if (!description) {
            description = $('meta[name="description"]').attr('content') || 
                          $('meta[property="og:description"]').attr('content') || '';
        }

        if (!category) {
            // Fallback for category via breadcrumbs
            const breadcrumbs = [];
            $('.breadcrumb a, [class*="breadcrumb"] a').each((i, el) => {
                const text = $(el).text().trim();
                if (text && text.toLowerCase() !== 'home') {
                    breadcrumbs.push(text);
                }
            });
            if (breadcrumbs.length > 0) {
                category = breadcrumbs.join(' > ');
            }
        }

        // 3. Fallback DOM Selection
        if (!title || (title.includes("Purplle Product") && dealPrice === 0)) {
            throw new Error("Product not found or blocked by Purplle");
        }
        if (!dealPrice || dealPrice === 0) {
            const bodyText = $('body').text() || '';
            const priceMatch = bodyText.match(/₹\s*([0-9,]+(\.[0-9]+)?)/);
            if (priceMatch) dealPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
        }
        
        if (!mrp || mrp === 0) {
            // Check for strike-through text (typical for MRP)
            $('del, s, .strike, [style*="line-through"]').each((i, el) => {
                const text = $(el).text();
                const match = text.match(/[0-9,]+/);
                if (match) {
                    const val = parseFloat(match[0].replace(/,/g, ''));
                    if (val > dealPrice && val < dealPrice * 10) {
                        mrp = val;
                    }
                }
            });
            
            if (!mrp || mrp === 0) {
                const bodyText = $('body').text() || '';
                const mrpMatch = bodyText.match(/(?:MRP|Price):?\s*(?:₹|Rs\.?)\s*([0-9,]+(\.[0-9]+)?)/i);
                if (mrpMatch) mrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
            }
        }

        if (!mrp || mrp < dealPrice) mrp = dealPrice;

        return {
            title: title || 'Purplle Product',
            image: image || '',
            images: image ? [image] : [],
            category: category || '',
            description: description || '',
            mrp: mrp || dealPrice || 0,
            price: dealPrice || 0,
            store: 'Purplle'
        };
    } catch (error) {
        throw error;
    }
}
