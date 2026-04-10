const STORE_IMAGE_CDNS = {
    amazon: [
        'm.media-amazon.com/images/i/',
        'images-eu.ssl-images-amazon.com/images/i/',
        'images-na.ssl-images-amazon.com/images/i/',
        'images-na.ssl-images-amazon.com/images/p/'
    ],
    flipkart: [
        'rukminim2.flixcart.com/image/',
        'rukminim1.flixcart.com/image/',
        'rukminim.flixcart.com/image/',
        'rukmini1.flixcart.com/image/'
    ],
    myntra: [
        'assets.myntassets.com/',
        'myntra.myntassets.com/'
    ],
    ajio: [
        'assets.ajio.com/',
        'assets.ajio.com/medias/sys_master/root/'
    ],
    meesho: [
        'images.meesho.com/images/products/'
    ],
    blinkit: [
        'cdn.grofers.com/',
        'cdn.blinkit.com/'
    ]
};

export const NO_PRODUCT_IMAGE = '';

export const PRODUCT_IMAGE_JUNK_REGEX = /logo|icon|sprite|pixel|loading|placeholder|banner|nav|menu|button|spacer|gif|svg|avatar|profile|captcha|bot|delivery|shipping|portal|pingportal|favicon|blank|default/i;

const AMAZON_NON_PRODUCT_IMAGE_REGEX = /\/images\/s\/|aplus-media|aplus|amazon-adsystem|\/images\/g\/|\/widgets\/q|\/x-locale\/|transparent-pixel|grey-pixel|nav-sprite|al-eu-/i;
const FLIPKART_NON_PRODUCT_IMAGE_REGEX = /static-assets|fk-cp-zion|navigation|header|footer|login|seller|plus/i;
const MYNTRA_NON_PRODUCT_IMAGE_REGEX = /sprite|logo|desktop-banner|app-download|studio|giftcard/i;

const toStoreKey = (store = '', productUrl = '') => {
    const haystack = `${store} ${productUrl}`.toLowerCase();
    if (haystack.includes('amazon.')) return 'amazon';
    if (haystack.includes('flipkart.')) return 'flipkart';
    if (haystack.includes('myntra.')) return 'myntra';
    if (haystack.includes('ajio.')) return 'ajio';
    if (haystack.includes('meesho.')) return 'meesho';
    if (haystack.includes('blinkit.') || haystack.includes('grofers.')) return 'blinkit';
    return '';
};

const getAmazonAsin = (productUrl = '') => {
    const match = String(productUrl).match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return match?.[1]?.toUpperCase() || '';
};

const addProtocol = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return '';
};

export const optimizeProductImageUrl = (url) => {
    let optimized = addProtocol(url);
    if (!optimized) return '';

    try {
        const lower = optimized.toLowerCase();

        if (lower.includes('media-amazon.com') || lower.includes('ssl-images-amazon.com')) {
            optimized = optimized
                .replace(/\._[A-Z0-9,_%.-]+_\./i, '.')
                .replace(/\.__[A-Z0-9,_%.-]+__\./i, '.')
                .replace(/\._\w+_\.(jpg|jpeg|png|webp)$/i, '.$1');
        }

        if (lower.includes('flixcart.com/image/')) {
            optimized = optimized
                .replace('/image/{@width}/{@height}/', '/image/1200/1200/')
                .replace(/\/image\/\d+\/\d+\//, '/image/1200/1200/')
                .replace('{@width}', '1200')
                .replace('{@height}', '1200')
                .replace(/q=\d+/i, 'q=100');
        }

        if (lower.includes('myntassets.com')) {
            optimized = optimized
                .replace(/w_\d+/i, 'w_1080')
                .replace(/h_\d+/i, 'h_1440')
                .replace(/q_\d+/i, 'q_100')
                .replace('h_480', 'h_1440')
                .replace('w_360', 'w_1080');
        }

        if (lower.includes('ajio.com')) {
            optimized = optimized
                .replace(/w_\d+/i, 'w_1000')
                .replace(/h_\d+/i, 'h_1000');
        }
    } catch (_) {
        return addProtocol(url);
    }

    return optimized;
};

const flattenImageCandidate = (candidate) => {
    if (!candidate) return [];
    if (typeof candidate === 'string') return [candidate];
    if (Array.isArray(candidate)) return candidate.flatMap(flattenImageCandidate);
    if (typeof candidate === 'object') {
        return flattenImageCandidate(
            candidate.url
            || candidate.src
            || candidate.image
            || candidate.imageUrl
            || candidate.large
            || candidate.largeImage
            || candidate.hiRes
        );
    }
    return [];
};

const buildProductOwnedCandidates = ({ productUrl = '', storeKey = '' }) => {
    const candidates = [];

    if (storeKey === 'amazon') {
        const asin = getAmazonAsin(productUrl);
        if (asin) {
            candidates.push(`https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`);
        }
    }

    return candidates;
};

export const isLikelyProductImage = (url, { store = '', productUrl = '', strictStore = true } = {}) => {
    const normalized = optimizeProductImageUrl(url);
    if (!normalized) return false;

    const lower = normalized.toLowerCase();
    if (!/^https?:\/\//i.test(normalized)) return false;
    if (PRODUCT_IMAGE_JUNK_REGEX.test(lower)) return false;
    if (/\.(svg|gif)(?:[?#].*)?$/i.test(lower)) return false;

    const storeKey = toStoreKey(store, productUrl);

    if (storeKey === 'amazon') {
        if (AMAZON_NON_PRODUCT_IMAGE_REGEX.test(lower)) return false;
        return STORE_IMAGE_CDNS.amazon.some((cdn) => lower.includes(cdn));
    }

    if (storeKey === 'flipkart') {
        if (FLIPKART_NON_PRODUCT_IMAGE_REGEX.test(lower)) return false;
        return STORE_IMAGE_CDNS.flipkart.some((cdn) => lower.includes(cdn));
    }

    if (storeKey === 'myntra') {
        if (MYNTRA_NON_PRODUCT_IMAGE_REGEX.test(lower)) return false;
        return STORE_IMAGE_CDNS.myntra.some((cdn) => lower.includes(cdn));
    }

    if (storeKey && STORE_IMAGE_CDNS[storeKey]) {
        return STORE_IMAGE_CDNS[storeKey].some((cdn) => lower.includes(cdn));
    }

    if (strictStore) {
        return false;
    }

    return /\.(jpg|jpeg|png|webp|avif)(?:[?#].*)?$/i.test(lower);
};

const getProductImageScore = (url, context) => {
    const optimized = optimizeProductImageUrl(url);
    const lower = optimized.toLowerCase();
    const storeKey = toStoreKey(context.store, context.productUrl);
    const amazonAsin = storeKey === 'amazon' ? getAmazonAsin(context.productUrl) : '';
    let score = 0;

    if (storeKey && STORE_IMAGE_CDNS[storeKey]?.some((cdn) => lower.includes(cdn))) score += 60;
    if (lower.includes('/images/i/') || lower.includes('/images/p/')) score += 30;
    if (amazonAsin && lower.includes(`/images/p/${amazonAsin.toLowerCase()}.`)) score += 55;
    if (lower.includes('/image/1200/1200/') || lower.includes('/image/1500/1500/')) score += 25;
    if (lower.includes('w_1080') || lower.includes('h_1440')) score += 20;
    if (/\.(jpg|jpeg|png|webp)(?:[?#].*)?$/i.test(lower)) score += 10;
    if (lower.includes('_sx') || lower.includes('_sy') || lower.includes('_ul') || lower.includes('_sr')) score -= 12;
    if (AMAZON_NON_PRODUCT_IMAGE_REGEX.test(lower)) score -= 200;

    return score;
};

export const normalizeProductImages = ({
    image,
    images = [],
    store,
    productUrl,
    title,
    maxImages = 8,
    strictStore = true
} = {}) => {
    const storeKey = toStoreKey(store, productUrl);
    const candidates = [
        ...flattenImageCandidate(image),
        ...flattenImageCandidate(images),
        ...buildProductOwnedCandidates({ productUrl, storeKey })
    ];

    const ranked = candidates
        .map((candidate, sourceIndex) => optimizeProductImageUrl(candidate))
        .filter(Boolean)
        .filter((candidate, index, list) => list.indexOf(candidate) === index)
        .filter((candidate) => isLikelyProductImage(candidate, { store, productUrl, title, strictStore }))
        .map((candidate) => ({
            url: candidate,
            score: getProductImageScore(candidate, { store, productUrl, title }),
            sourceIndex: candidates.findIndex((raw) => optimizeProductImageUrl(raw) === candidate)
        }))
        .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex);

    const normalizedImages = ranked
        .map(({ url }) => url)
        .filter((url, index, list) => list.indexOf(url) === index)
        .slice(0, maxImages);

    return {
        image: normalizedImages[0] || NO_PRODUCT_IMAGE,
        images: normalizedImages,
        rejected: candidates.length - normalizedImages.length
    };
};
