import * as cheerio from 'cheerio';

export async function extractMyntra(page, url) {
    try {
        let html;
        try {
            html = await page.content();
        } catch (e) {
            return { success: false, message: e.message };
        }

        const $ = cheerio.load(html);

        let data = {
            title: '',
            store: 'Myntra',
            category: '',
            description: '',
            mrp: 0,
            price: 0,
            images: []
        };

        // 1. Try to extract from window.__myx
        let myxData = null;
        $('script').each((i, el) => {
            const content = $(el).html() || '';
            if (content.includes('window.__myx =')) {
                try {
                    const jsonString = content.split('window.__myx =')[1].split(';</script>')[0].trim();
                    myxData = JSON.parse(jsonString);
                } catch (e) {}
            }
        });

        if (myxData && myxData.pdpData) {
            const pdp = myxData.pdpData;
            data.title = pdp.name || pdp.title || '';
            data.category = pdp.analytics?.articleType || '';
            data.price = pdp.price?.discounted || pdp.price?.mrp || 0;
            data.mrp = pdp.price?.mrp || data.price;
            
            if (pdp.media && pdp.media.albums) {
                pdp.media.albums.forEach(album => {
                    if (album.images) {
                        album.images.forEach(img => {
                            if (img.imageURL && !data.images.includes(img.imageURL)) {
                                data.images.push(img.imageURL);
                            }
                        });
                    }
                });
            }
        }

        // 2. Try JSON-LD if myxData failed
        if (!data.title) {
            $('script[type="application/ld+json"]').each((i, el) => {
                try {
                    const text = $(el).html() || '';
                    const parsed = JSON.parse(text.trim());
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    
                    for (const item of items) {
                        if (item['@type'] === 'Product') {
                            if (item.name && !data.title) data.title = item.name;
                            if (item.description && !data.description) data.description = item.description;
                            if (item.image) {
                                if (Array.isArray(item.image)) data.images.push(...item.image);
                                else data.images.push(item.image);
                            }
                            if (item.offers) {
                                const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                                if (offer && offer.price && !data.price) {
                                    data.price = parseFloat(offer.price);
                                }
                            }
                        }
                    }
                } catch (e) {}
            });
        }

        // 3. Try OG Tags
        if (!data.title) {
            const ogTitle = $('meta[property="og:title"]').attr('content');
            if (ogTitle) data.title = ogTitle.split('|')[0].trim();
            else data.title = $('title').text().split('|')[0].trim();
        }

        if (data.images.length === 0) {
            const ogImage = $('meta[property="og:image"]').attr('content');
            if (ogImage) data.images.push(ogImage);
        }

        // 4. Fallback DOM Selection
        if (!data.price || data.price === 0) {
            const priceText = $('.pdp-price strong').text() || $('.pdp-price').text() || '';
            const priceMatch = priceText.match(/[0-9,]+/);
            if (priceMatch) data.price = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
        
        if (!data.mrp || data.mrp === 0) {
            const mrpText = $('.pdp-mrp s').text() || $('.pdp-mrp').text() || '';
            const mrpMatch = mrpText.match(/[0-9,]+/);
            if (mrpMatch) {
                data.mrp = parseFloat(mrpMatch[0].replace(/,/g, ''));
            } else {
                data.mrp = data.price;
            }
        }

        if (!data.mrp || data.mrp < data.price) data.mrp = data.price;

        return {
            title: data.title || 'Myntra Product',
            image: data.images.length > 0 ? data.images[0] : '',
            category: data.category || '',
            mrp: data.mrp || data.price || 0,
            price: data.price || 0,
            store: 'Myntra',
            images: data.images
        };
    } catch (error) {
        console.error('Myntra extraction error:', error);
        return { title: '', price: 0, mrp: 0 };
    }
}
