export async function extractBigBasket(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

        const data = await page.evaluate(() => {
            // 1. Try JSON-LD
            let title = '', image = '', mrp = 0, dealPrice = 0;
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                try {
                    const jsonData = JSON.parse(script.textContent);
                    const productNode = Array.isArray(jsonData) ? jsonData.find(j => j['@type'] === 'Product') : (jsonData['@type'] === 'Product' ? jsonData : null);
                    
                    if (productNode) {
                        if (productNode.name) title = productNode.name;
                        if (productNode.image) image = Array.isArray(productNode.image) ? productNode.image[0] : productNode.image;
                        
                        if (productNode.offers) {
                            if (productNode.offers.price) dealPrice = parseFloat(productNode.offers.price);
                            if (productNode.offers.highPrice) mrp = parseFloat(productNode.offers.highPrice);
                        }
                    }
                } catch (e) {}
            }

            // 2. Try OG Tags
            if (!title) {
                const ogTitle = document.querySelector('meta[property="og:title"]');
                if (ogTitle) title = ogTitle.content;
                else title = document.title.split('|')[0].replace('Buy ', '').replace('Online at Best Price', '').split('-')[0].trim();
            }

            if (!image) {
                const ogImage = document.querySelector('meta[property="og:image"]');
                if (ogImage) image = ogImage.content;
            }

            // 3. Fallback DOM Selection
            if (!dealPrice || dealPrice === 0) {
                const priceMatch = document.body.innerText.match(/₹\s*([0-9,]+(\.[0-9]+)?)/);
                if (priceMatch) {
                    dealPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
                }
            }
            if (!mrp || mrp === 0) {
                const mrpMatch = document.body.innerText.match(/MRP:?\s*(?:₹|Rs\.?)\s*([0-9,]+(\.[0-9]+)?)/i);
                if (mrpMatch) {
                    mrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
                }
            }

            if (!mrp || mrp < dealPrice) mrp = dealPrice;

            return {
                title: title || 'BigBasket Product',
                image: image || '',
                mrp: mrp || dealPrice || 0,
                price: dealPrice || 0,
                store: 'BigBasket'
            };
        });

        if (!data.title || data.price === 0) {
            return { title: 'BigBasket Product', price: 0, mrp: 0 };
        }

        return data;
    } catch (error) {
        console.error('BigBasket extraction error:', error);
        return { title: '', price: 0, mrp: 0 };
    }
}
