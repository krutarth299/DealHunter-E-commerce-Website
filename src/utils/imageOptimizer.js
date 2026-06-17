export const NO_PRODUCT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22800%22 viewBox=%220 0 800 800%22%3E%3Crect width=%22800%22 height=%22800%22 fill=%22%23f8fafc%22/%3E%3Crect x=%22170%22 y=%22220%22 width=%22460%22 height=%22360%22 rx=%2240%22 fill=%22%23ffffff%22 stroke=%22%23dbe3ee%22 stroke-width=%2216%22/%3E%3Ccircle cx=%22305%22 cy=%22340%22 r=%2255%22 fill=%22%23e2e8f0%22/%3E%3Cpath d=%22M220 530l135-145 95 100 65-70 95 115H220z%22 fill=%22%23cbd5e1%22/%3E%3Ctext x=%22400%22 y=%22655%22 text-anchor=%22middle%22 font-family=%22Arial, sans-serif%22 font-size=%2238%22 font-weight=%22700%22 fill=%22%2394a3b8%22%3ENo image%3C/text%3E%3C/svg%3E';

const STORE_IMAGE_CDNS = {
    amazon: ['m.media-amazon.com/images/i/', 'images-eu.ssl-images-amazon.com/images/i/', 'images-na.ssl-images-amazon.com/images/i/', 'images-na.ssl-images-amazon.com/images/p/'],
    flipkart: ['rukminim2.flixcart.com/image/', 'rukminim1.flixcart.com/image/', 'rukminim.flixcart.com/image/', 'rukmini1.flixcart.com/image/'],
    blinkit: ['cdn.grofers.com/', 'cdn.blinkit.com/'],
    croma: ['media-ik.croma.com/prod/https://media.croma.com/image/upload/', 'media.croma.com/image/upload/'],
    reliancedigital: ['www.reliancedigital.in/medias/', 'reliancedigital.in/medias/'],
    firstcry: ['cdn.fcglcdn.com/brainbees/images/products/', 'cdn.fcglcdn.com/brainbees/images/boutique/'],
    purplle: ['media6.ppl-media.com/mediafiles/', 'media6.purplle.com/'],
    lenskart: ['static1.lenskart.com/media/catalog/product/', 'static.lenskart.com/media/catalog/product/'],
    tata1mg: ['onemg.gumlet.io/', 'res.cloudinary.com/du8msdgbj/image/upload/'],
    pharmeasy: ['cdn01.pharmeasy.in/dam/products_otc/', 'cdn01.pharmeasy.in/dam/products/'],
    bigbasket: ['www.bigbasket.com/media/uploads/p/', 'bbassets.com/media/uploads/p/'],
    pepperfry: ['ii1.pepperfry.com/media/catalog/product/', 'ii2.pepperfry.com/media/catalog/product/'],
    urbanladder: ['www.ulcdn.net/images/products/', 'ulcdn.net/images/products/'],
    ikea: ['www.ikea.com/in/en/images/products/', 'www.ikea.com/images/'],
    jiomart: ['www.jiomart.com/images/product/', 'jmd-asp.jiomart.com/images/product/'],
    zepto: ['cdn.zeptonow.com/production/'],
    travel: ['promos.makemytrip.com/', 'gos3.ibcdn.com/', 'images.ixigo.com/', 'www.yatra.com/']
};

export const optimizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    let optimized = url;

    try {
        // Amazon: Remove resolution modifiers for original high-res quality
        // e.g. ._AC_SY200_, ._SL160_, ._SR160,160_, etc.
        if (url.includes('amazon.in') || url.includes('amazon.com') || url.includes('media-amazon.com')) {
            optimized = url.replace(/\._[A-Z0-9,_%]+_\./, '.');
            // If the regex didn't change anything, try another common pattern
            if (optimized === url) {
                optimized = url.replace(/\._\w+_\.jpg/i, '.jpg');
            }
            // Ensure we don't accidentally remove the extension if it wasn't a modifier
            if (!optimized.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
                optimized = url; // fallback
            }
        }
        
        // Flipkart: Replace dynamic dimensions with HD values
        if (url.includes('flipkart.com') || url.includes('flixcart.com')) {
            optimized = optimized
                .replace('/image/{@width}/{@height}/', '/image/1200/1200/')
                .replace(/\/image\/\d+\/\d+\//, '/image/1200/1200/')
                .replace('{@width}', '1200')
                .replace('{@height}', '1200')
                .replace(/q=\d+/, 'q=100');
        }

        if (url.includes('croma.com/image/upload')) {
            optimized = optimized
                .replace(/\/w_\d+,h_\d+/, '/w_1200,h_1200')
                .replace(/\/w_\d+/i, '/w_1200')
                .replace(/\/h_\d+/i, '/h_1200');
        }

        if (url.includes('bigbasket.com/media/uploads/p/')) {
            optimized = optimized.replace(/\/s\/|\/m\//i, '/l/');
        }
    } catch (e) {
        return url;
    }

    return optimized;
};

// Standard junk image filter to exclude icons, logos, etc.
export const JUNK_IMAGE_REGEX = /logo|\bicon\b|sprite|\bpixel\b|loading|placeholder|banner|\bnav\b|\bmenu\b|\bbutton\b|spacer|gif|svg|avatar|profile|captcha|bot|delivery|shipping|portal|pingportal|favicon|blank|default/i;

const AMAZON_NON_PRODUCT_IMAGE_REGEX = /\/images\/s\/|aplus-media|aplus|amazon-adsystem|\/images\/g\/|\/widgets\/q|\/x-locale\/|transparent-pixel|grey-pixel|nav-sprite|al-eu-/i;
const FLIPKART_NON_PRODUCT_IMAGE_REGEX = /static-assets|fk-cp-zion|navigation|header|footer|login|seller|plus/i;

const getStoreKey = (deal) => {
    if (!deal) return '';
    const haystack = `${deal?.storeName || ''} ${deal?.store || ''} ${deal?.productUrl || ''} ${deal?.link || ''}`.toLowerCase();
    if (haystack.includes('amazon.')) return 'amazon';
    if (haystack.includes('flipkart.')) return 'flipkart';
    if (haystack.includes('blinkit.') || haystack.includes('grofers.')) return 'blinkit';
    if (haystack.includes('croma.')) return 'croma';
    if (haystack.includes('reliancedigital.')) return 'reliancedigital';
    if (haystack.includes('firstcry.')) return 'firstcry';
    if (haystack.includes('purplle.')) return 'purplle';
    if (haystack.includes('lenskart.')) return 'lenskart';
    if (haystack.includes('1mg.') || haystack.includes('tata 1mg') || haystack.includes('tata1mg')) return 'tata1mg';
    if (haystack.includes('pharmeasy.')) return 'pharmeasy';
    if (haystack.includes('bigbasket.')) return 'bigbasket';
    if (haystack.includes('pepperfry.')) return 'pepperfry';
    if (haystack.includes('urbanladder.')) return 'urbanladder';
    if (haystack.includes('ikea.')) return 'ikea';
    if (haystack.includes('jiomart.')) return 'jiomart';
    if (haystack.includes('zepto')) return 'zepto';
    if (haystack.includes('makemytrip.') || haystack.includes('ixigo.') || haystack.includes('yatra.')) return 'travel';
    return '';
};

const getAmazonAsin = (deal) => {
    if (!deal) return '';
    const productUrl = String(deal?.productUrl || deal?.link || '');
    const match = productUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return match?.[1]?.toUpperCase() || '';
};

export const isLikelyProductImage = (url, deal) => {
    if (!url || typeof url !== 'string') return false;
    const optimized = optimizeImageUrl(url);
    const lower = optimized.toLowerCase();

    if (!/^https?:\/\//i.test(optimized) && !optimized.startsWith('data:image/') && !optimized.startsWith('/uploads/')) return false;
    if (JUNK_IMAGE_REGEX.test(lower)) return false;

    const storeKey = deal ? getStoreKey(deal) : '';
    const allowedCdns = storeKey ? STORE_IMAGE_CDNS[storeKey] : null;

    if (storeKey === 'amazon') {
        if (AMAZON_NON_PRODUCT_IMAGE_REGEX.test(lower)) return false;
        if (allowedCdns && allowedCdns.some((cdn) => lower.includes(cdn))) return true;
    } else if (storeKey === 'flipkart') {
        if (FLIPKART_NON_PRODUCT_IMAGE_REGEX.test(lower)) return false;
        if (allowedCdns && allowedCdns.some((cdn) => lower.includes(cdn))) return true;
    } else {
        if (allowedCdns && allowedCdns.some((cdn) => lower.includes(cdn))) return true;
    }

    return /\.(jpg|jpeg|png|webp|avif)(?:[?#].*)?$/i.test(lower);
};

const getImageScore = (url, deal) => {
    if (!url) return 0;
    const optimized = optimizeImageUrl(url);
    const lower = optimized.toLowerCase();
    const storeKey = deal ? getStoreKey(deal) : '';
    const amazonAsin = storeKey === 'amazon' ? getAmazonAsin(deal) : '';
    let score = 0;

    const cdnList = storeKey ? STORE_IMAGE_CDNS[storeKey] : null;
    if (cdnList?.some((cdn) => lower.includes(cdn))) score += 60;
    if (lower.includes('/images/i/')) score += 30;
    if (lower.includes('/image/1200/1200/') || lower.includes('/image/1500/1500/')) score += 25;
    if (lower.includes('w_1080') || lower.includes('h_1440')) score += 20;
    if (/\.(jpg|jpeg|png|webp|avif)(?:[?#].*)?$/i.test(lower)) score += 10;
    if (lower.includes('_sx') || lower.includes('_sy') || lower.includes('_ul') || lower.includes('_sr')) score -= 12;
    if (AMAZON_NON_PRODUCT_IMAGE_REGEX.test(lower)) score -= 200;

    return score;
};

export const getProductImageGallery = (deal, maxImages = 8) => {
    if (!deal) return [NO_PRODUCT_IMAGE];

    // Safe fallback: Ensure we have at least the main image in the gallery array
    const gallerySource = Array.isArray(deal?.images) && deal.images.length > 0 
        ? deal.images 
        : (deal?.image ? [deal.image] : []);

    const candidates = [
        ...gallerySource
    ]
        .map(optimizeImageUrl)
        .filter(Boolean)
        .filter((url, index, list) => list.indexOf(url) === index)
        .filter((url) => isLikelyProductImage(url, deal))
        .map((url, sourceIndex) => ({ url, sourceIndex, score: getImageScore(url, deal) }))
        .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex)
        .map(({ url }) => url);

    const gallery = candidates.slice(0, maxImages);
    return gallery.length > 0 ? gallery : [deal?.image ? optimizeImageUrl(deal.image) : NO_PRODUCT_IMAGE];
};

/**
 * Robustly selects the main product image from a deal object.
 * Follows the rule: Favor the first element of images[] that is NOT junk, 
 * falling back to the image property if it's NOT junk.
 */
export const getMainProductImage = (deal) => {
    const gallery = getProductImageGallery(deal);
    return gallery[0] || NO_PRODUCT_IMAGE;
};
