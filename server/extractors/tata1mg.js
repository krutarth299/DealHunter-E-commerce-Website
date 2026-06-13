import * as cheerio from 'cheerio';

export async function extractTata1mg(page, url) {
    try {
        let html;
        try {
            html = await page.content();
        } catch (e) {
            throw new Error(`Failed to get page content: ${e.message}`);
        }

        const $ = cheerio.load(html);

        let title = '', image = '', mrp = 0, dealPrice = 0, category = '';

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

        // 3. Fallback DOM Selection
        if (!dealPrice || dealPrice === 0) {
            const bodyText = $('body').text() || '';
            const priceMatch = bodyText.match(/₹\s*([0-9,]+(\.[0-9]+)?)/);
            if (priceMatch) dealPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
        }
        if (!mrp || mrp === 0) {
            const bodyText = $('body').text() || '';
            const mrpMatch = bodyText.match(/(?:MRP|Price):?\s*(?:₹|Rs\.?)\s*([0-9,]+(\.[0-9]+)?)/i);
            if (mrpMatch) mrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
        }

        if (!mrp || mrp < dealPrice) mrp = dealPrice;

        if (!title || title.includes('Error 404') || title.includes('Tata 1mg Product') && dealPrice === 0) {
            throw new Error("Product not found or blocked by Tata 1mg");
        }

        return {
            title: title || 'Tata 1mg Product',
            image: image || '',
            category: category || '',
            mrp: mrp || dealPrice || 0,
            price: dealPrice || 0,
            store: 'Tata 1mg'
        };
    } catch (error) {
        throw error;
    }
}
