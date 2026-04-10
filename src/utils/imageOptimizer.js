export const NO_PRODUCT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22800%22 viewBox=%220 0 800 800%22%3E%3Crect width=%22800%22 height=%22800%22 fill=%22%23f8fafc%22/%3E%3Crect x=%22170%22 y=%22220%22 width=%22460%22 height=%22360%22 rx=%2240%22 fill=%22%23ffffff%22 stroke=%22%23dbe3ee%22 stroke-width=%2216%22/%3E%3Ccircle cx=%22305%22 cy=%22340%22 r=%2255%22 fill=%22%23e2e8f0%22/%3E%3Cpath d=%22M220 530l135-145 95 100 65-70 95 115H220z%22 fill=%22%23cbd5e1%22/%3E%3Ctext x=%22400%22 y=%22655%22 text-anchor=%22middle%22 font-family=%22Arial, sans-serif%22 font-size=%2238%22 font-weight=%22700%22 fill=%22%2394a3b8%22%3ENo image%3C/text%3E%3C/svg%3E';

const STORE_IMAGE_CDNS = {
    amazon: ['m.media-amazon.com/images/i/', 'images-eu.ssl-images-amazon.com/images/i/', 'images-na.ssl-images-amazon.com/images/i/', 'images-na.ssl-images-amazon.com/images/p/'],
    flipkart: ['rukminim2.flixcart.com/image/', 'rukminim1.flixcart.com/image/', 'rukminim.flixcart.com/image/', 'rukmini1.flixcart.com/image/'],
    myntra: ['assets.myntassets.com/', 'myntra.myntassets.com/'],
    ajio: ['assets.ajio.com/'],
    meesho: ['images.meesho.com/images/products/'],
    blinkit: ['cdn.grofers.com/', 'cdn.blinkit.com/']
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

        // Myntra: Ensure high resolution
        if (url.includes('myntassets.com')) {
            // Myntra uses w_ and h_ or fixed dimensions like h_480,w_360
            optimized = url
                .replace(/w_\d+/, 'w_1080')
                .replace(/h_\d+/, 'h_1440')
                .replace(/q_\d+/, 'q_100')
                .replace('h_480', 'h_1440')
                .replace('w_360', 'w_1080');
        }

        // Ajio: Ensure high resolution
        if (url.includes('ajio.com')) {
            optimized = url.replace(/w_\d+/, 'w_800').replace(/h_\d+/, 'h_800');
        }
    } catch (e) {
        return url;
    }

    return optimized;
};

// Standard junk image filter to exclude icons, logos, etc.
export const JUNK_IMAGE_REGEX = /logo|icon|sprite|pixel|loading|placeholder|banner|nav|menu|button|spacer|gif|svg|avatar|profile|captcha|bot|delivery|shipping|portal|pingportal|favicon|blank|default/i;

const AMAZON_NON_PRODUCT_IMAGE_REGEX = /\/images\/s\/|aplus-media|aplus|amazon-adsystem|\/images\/g\/|\/widgets\/q|\/x-locale\/|transparent-pixel|grey-pixel|nav-sprite|al-eu-/i;
const FLIPKART_NON_PRODUCT_IMAGE_REGEX = /static-assets|fk-cp-zion|navigation|header|footer|login|seller|plus/i;
const MYNTRA_NON_PRODUCT_IMAGE_REGEX = /sprite|logo|desktop-banner|app-download|studio|giftcard/i;

const getStoreKey = (deal = {}) => {
    const haystack = `${deal.storeName || ''} ${deal.store || ''} ${deal.productUrl || ''} ${deal.link || ''}`.toLowerCase();
    if (haystack.includes('amazon.')) return 'amazon';
    if (haystack.includes('flipkart.')) return 'flipkart';
    if (haystack.includes('myntra.')) return 'myntra';
    if (haystack.includes('ajio.')) return 'ajio';
    if (haystack.includes('meesho.')) return 'meesho';
    if (haystack.includes('blinkit.') || haystack.includes('grofers.')) return 'blinkit';
    return '';
};

const getAmazonAsin = (deal = {}) => {
    const productUrl = String(deal.productUrl || deal.link || '');
    const match = productUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return match?.[1]?.toUpperCase() || '';
};

const getProductOwnedImageCandidates = (deal = {}) => {
    const storeKey = getStoreKey(deal);
    if (storeKey !== 'amazon') return [];

    const asin = getAmazonAsin(deal);
    return asin
        ? [`https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`]
        : [];
};

export const isLikelyProductImage = (url, deal = {}) => {
    if (!url || typeof url !== 'string') return false;
    const optimized = optimizeImageUrl(url);
    const lower = optimized.toLowerCase();

    if (!/^https?:\/\//i.test(optimized) && !optimized.startsWith('data:image/')) return false;
    if (JUNK_IMAGE_REGEX.test(lower)) return false;

    const storeKey = getStoreKey(deal);
    const allowedCdns = STORE_IMAGE_CDNS[storeKey];

    if (storeKey === 'amazon') {
        if (AMAZON_NON_PRODUCT_IMAGE_REGEX.test(lower)) return false;
        return allowedCdns.some((cdn) => lower.includes(cdn));
    }

    if (storeKey === 'flipkart') {
        if (FLIPKART_NON_PRODUCT_IMAGE_REGEX.test(lower)) return false;
        return allowedCdns.some((cdn) => lower.includes(cdn));
    }

    if (storeKey === 'myntra') {
        if (MYNTRA_NON_PRODUCT_IMAGE_REGEX.test(lower)) return false;
        return allowedCdns.some((cdn) => lower.includes(cdn));
    }

    if (allowedCdns) return allowedCdns.some((cdn) => lower.includes(cdn));

    return /\.(jpg|jpeg|png|webp|avif)(?:[?#].*)?$/i.test(lower);
};

const getImageScore = (url, deal = {}) => {
    const optimized = optimizeImageUrl(url);
    const lower = optimized.toLowerCase();
    const storeKey = getStoreKey(deal);
    const amazonAsin = storeKey === 'amazon' ? getAmazonAsin(deal) : '';
    let score = 0;

    if (STORE_IMAGE_CDNS[storeKey]?.some((cdn) => lower.includes(cdn))) score += 60;
    if (lower.includes('/images/i/') || lower.includes('/images/p/')) score += 30;
    if (amazonAsin && lower.includes(`/images/p/${amazonAsin.toLowerCase()}.`)) score += 55;
    if (lower.includes('/image/1200/1200/') || lower.includes('/image/1500/1500/')) score += 25;
    if (lower.includes('w_1080') || lower.includes('h_1440')) score += 20;
    if (/\.(jpg|jpeg|png|webp|avif)(?:[?#].*)?$/i.test(lower)) score += 10;
    if (lower.includes('_sx') || lower.includes('_sy') || lower.includes('_ul') || lower.includes('_sr')) score -= 12;
    if (AMAZON_NON_PRODUCT_IMAGE_REGEX.test(lower)) score -= 200;

    return score;
};

export const getProductImageGallery = (deal = {}, maxImages = 8) => {
    const candidates = [
        deal.image,
        ...(Array.isArray(deal.images) ? deal.images : []),
        ...getProductOwnedImageCandidates(deal)
    ]
        .map(optimizeImageUrl)
        .filter(Boolean)
        .filter((url, index, list) => list.indexOf(url) === index)
        .filter((url) => isLikelyProductImage(url, deal))
        .map((url, sourceIndex) => ({ url, sourceIndex, score: getImageScore(url, deal) }))
        .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex)
        .map(({ url }) => url);

    return candidates.slice(0, maxImages);
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
