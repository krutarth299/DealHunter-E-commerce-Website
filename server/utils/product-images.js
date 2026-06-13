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
    blinkit: [
        'cdn.grofers.com/',
        'cdn.blinkit.com/'
    ],
    croma: [
        'media-ik.croma.com/prod/https://media.croma.com/image/upload/',
        'media.croma.com/image/upload/'
    ],
    reliancedigital: [
        'www.reliancedigital.in/medias/',
        'reliancedigital.in/medias/'
    ],
    firstcry: [
        'cdn.fcglcdn.com/brainbees/images/products/',
        'cdn.fcglcdn.com/brainbees/images/boutique/'
    ],
    purplle: [
        'media6.ppl-media.com/mediafiles/',
        'media6.purplle.com/'
    ],
    lenskart: [
        'static1.lenskart.com/media/catalog/product/',
        'static.lenskart.com/media/catalog/product/'
    ],
    tata1mg: [
        'onemg.gumlet.io/',
        'res.cloudinary.com/du8msdgbj/image/upload/'
    ],
    pharmeasy: [
        'cdn01.pharmeasy.in/dam/products_otc/',
        'cdn01.pharmeasy.in/dam/products/'
    ],
    bigbasket: [
        'www.bigbasket.com/media/uploads/p/',
        'bbassets.com/media/uploads/p/'
    ],
    pepperfry: [
        'ii1.pepperfry.com/media/catalog/product/',
        'ii2.pepperfry.com/media/catalog/product/'
    ],
    urbanladder: [
        'www.ulcdn.net/images/products/',
        'ulcdn.net/images/products/'
    ],
    ikea: [
        'www.ikea.com/in/en/images/products/',
        'www.ikea.com/images/'
    ],
    jiomart: [
        'www.jiomart.com/images/product/',
        'jmd-asp.jiomart.com/images/product/'
    ],
    zepto: [
        'cdn.zeptonow.com/production/'
    ],
    travel: [
        'promos.makemytrip.com/',
        'gos3.ibcdn.com/',
        'images.ixigo.com/',
        'www.yatra.com/'
    ]
};

export const NO_PRODUCT_IMAGE = '';

export const PRODUCT_IMAGE_JUNK_REGEX = /logo|icon|sprite|pixel|loading|placeholder|banner|nav|menu|button|spacer|gif|svg|avatar|profile|captcha|bot|delivery|shipping|portal|pingportal|favicon|blank|thumbnail|thumb|swatch/i;
const IMAGE_CONTEXT_JUNK_REGEX = /recommend|recommended|similar product|related product|you may also like|frequently bought|sponsored|ad(?:vert)?|banner|carousel|cross[- ]sell|upsell|more from|explore more/i;

const AMAZON_NON_PRODUCT_IMAGE_REGEX = /\/images\/s\/|aplus-media|aplus|amazon-adsystem|\/images\/g\/|\/widgets\/q|\/x-locale\/|transparent-pixel|grey-pixel|nav-sprite|al-eu-/i;
const FLIPKART_NON_PRODUCT_IMAGE_REGEX = /static-assets|fk-cp-zion|navigation|header|footer|login|seller|plus/i;

const BRAND_RULES = [
    { canonical: 'Dell', aliases: ['dell'] },
    { canonical: 'Lenovo', aliases: ['lenovo'] },
    { canonical: 'HP', aliases: ['hp'] },
    { canonical: 'Acer', aliases: ['acer'] },
    { canonical: 'ASUS', aliases: ['asus'] },
    { canonical: 'MSI', aliases: ['msi'] },
    { canonical: 'Apple', aliases: ['apple'] },
    { canonical: 'Samsung', aliases: ['samsung'] },
    { canonical: 'Sony', aliases: ['sony'] },
    { canonical: 'LG', aliases: ['lg'] },
    { canonical: 'boAt', aliases: ['boat', 'bo at'] },
    { canonical: 'Zebronics', aliases: ['zebronics'] },
    { canonical: 'Philips', aliases: ['philips'] },
    { canonical: 'Xiaomi', aliases: ['xiaomi', 'mi'] },
    { canonical: 'Redmi', aliases: ['redmi'] },
    { canonical: 'realme', aliases: ['realme'] },
    { canonical: 'OPPO', aliases: ['oppo'] },
    { canonical: 'vivo', aliases: ['vivo'] },
    { canonical: 'iQOO', aliases: ['iqoo'] },
    { canonical: 'OnePlus', aliases: ['oneplus', 'one plus'] },
    { canonical: 'Nothing', aliases: ['nothing'] },
    { canonical: 'JBL', aliases: ['jbl'] },
    { canonical: 'Bose', aliases: ['bose'] },
    { canonical: 'Dyson', aliases: ['dyson'] },
    { canonical: 'GoPro', aliases: ['gopro'] },
    { canonical: 'DJI', aliases: ['dji'] },
    { canonical: 'Garmin', aliases: ['garmin'] },
    { canonical: 'Fitbit', aliases: ['fitbit'] }
];

const MODEL_STOP_WORDS = new Set([
    'smartphone', 'phone', 'mobile', 'laptop', 'earbuds', 'earphones', 'headphones', 'tablet',
    'watch', 'smartwatch', 'camera', 'speaker', 'tv', 'monitor', 'bag', 'shirt', 'shoes',
    'sneakers', 'men', 'women', 'kids', 'with', 'for', 'and', 'the', 'inch', 'inches',
    'gb', 'tb', 'ram', 'ssd', 'rom', 'pack', 'combo', 'black', 'blue', 'white', 'grey',
    'gray', 'red', 'green', 'silver', 'gold'
]);

const toStoreKey = (store = '', productUrl = '') => {
    const haystack = `${store} ${productUrl}`.toLowerCase();
    if (haystack.includes('amazon.')) return 'amazon';
    if (haystack.includes('flipkart.')) return 'flipkart';
    if (haystack.includes('blinkit.') || haystack.includes('grofers.')) return 'blinkit';
    if (haystack.includes('croma.')) return 'croma';
    if (haystack.includes('reliancedigital.')) return 'reliancedigital';
    if (haystack.includes('firstcry.')) return 'firstcry';
    if (haystack.includes('purplle.')) return 'purplle';
    if (haystack.includes('lenskart.')) return 'lenskart';
    if (haystack.includes('1mg.')) return 'tata1mg';
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

const getCanonicalImageIdentity = (url = '') => {
    const normalized = addProtocol(url);
    if (!normalized) return '';
    try {
        const parsed = new URL(normalized);
        parsed.hash = '';
        ['w', 'width', 'h', 'height', 'q', 'quality', 'crop', 'fit', 'dpr', 'tr', 's', 'size'].forEach((key) => {
            parsed.searchParams.delete(key);
        });
        const pathname = parsed.pathname
            .replace(/\/image\/\d+\/\d+\//i, '/image/')
            .replace(/([?&])(w|h|q|quality|crop|fit|dpr|tr|s|size)=[^&]+/ig, '$1')
            .replace(/\/+$/, '');
        return `${parsed.origin}${pathname}`.replace(/[?&]$/, '');
    } catch {
        return normalized.split('?')[0].replace(/\/+$/, '');
    }
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getBrandSignals = (value = '') => {
    const text = String(value || '').toLowerCase();
    if (!text) return [];

    return BRAND_RULES
        .filter(({ aliases }) => aliases.some((alias) => new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i').test(text)))
        .map(({ canonical }) => canonical);
};

const hasForeignBrandSignal = (candidateUrl = '', title = '') => {
    const titleBrands = new Set(getBrandSignals(title).map((brand) => brand.toLowerCase()));
    if (!titleBrands.size) return '';

    const urlBrands = getBrandSignals(candidateUrl);
    const foreign = urlBrands.find((brand) => !titleBrands.has(brand.toLowerCase()));
    return foreign || '';
};

const getModelSignals = (value = '') => {
    const tokens = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9+]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    return [...new Set(tokens.filter((token) => {
        if (MODEL_STOP_WORDS.has(token)) return false;
        if (token.length <= 1) return false;
        if (/^\d+$/.test(token) && token.length < 3) return false;
        return /[a-z]/.test(token) || /\d/.test(token);
    }))];
};

const countSignalMatches = (haystack = '', signals = []) => {
    const lower = String(haystack || '').toLowerCase();
    return signals.filter((signal) => lower.includes(signal)).length;
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

        if (lower.includes('croma.com/image/upload')) {
            optimized = optimized
                .replace(/\/w_\d+,h_\d+/, '/w_1200,h_1200')
                .replace(/w_\d+/i, 'w_1200')
                .replace(/h_\d+/i, 'h_1200');
        }

        if (lower.includes('bigbasket.com/media/uploads/p/')) {
            optimized = optimized.replace(/\/s\/|\/m\//i, '/l/');
        }
    } catch (_) {
        return addProtocol(url);
    }

    return optimized;
};

const flattenImageCandidate = (candidate) => {
    if (!candidate) return [];
    if (typeof candidate === 'string') return [{ url: candidate, meta: '' }];
    if (Array.isArray(candidate)) return candidate.flatMap(flattenImageCandidate);
    if (typeof candidate === 'object') {
        const url = candidate.url
            || candidate.src
            || candidate.image
            || candidate.imageUrl
            || candidate.large
            || candidate.largeImage
            || candidate.hiRes;
        const meta = [
            candidate.alt,
            candidate.title,
            candidate.label,
            candidate.name,
            candidate.context,
            candidate.path,
            candidate.origin
        ].filter(Boolean).join(' ');
        return url ? [{ url, meta }] : [];
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

    if (normalized.startsWith('/uploads/')) return true;

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

    if (storeKey && STORE_IMAGE_CDNS[storeKey]) {
        return STORE_IMAGE_CDNS[storeKey].some((cdn) => lower.includes(cdn));
    }

    if (strictStore) {
        return false;
    }

    // Strict format and placeholder checks
    if (lower.startsWith('data:image')) return false;
    if (lower.includes('placeholder') || lower.includes('loader') || lower.includes('blank')) return false;
    if (lower.includes('.svg')) return false;

    // Must be real image format
    return (
        lower.includes('.jpg') ||
        lower.includes('.jpeg') ||
        lower.includes('.png') ||
        lower.includes('.webp') ||
        lower.includes('.avif')
    );
};

const getProductImageScore = (url, context) => {
    if (url.startsWith('/uploads/')) return 1000;
    
    const optimized = optimizeProductImageUrl(url);
    const lower = optimized.toLowerCase();
    const storeKey = toStoreKey(context.store, context.productUrl);
    const amazonAsin = storeKey === 'amazon' ? getAmazonAsin(context.productUrl) : '';
    const titleBrands = getBrandSignals(context.title);
    const imageBrands = getBrandSignals(optimized);
    const titleBrandSet = new Set(titleBrands.map((brand) => brand.toLowerCase()));
    let score = 0;

    if (storeKey && STORE_IMAGE_CDNS[storeKey]?.some((cdn) => lower.includes(cdn))) score += 60;
    if (titleBrands.length && imageBrands.some((brand) => titleBrandSet.has(brand.toLowerCase()))) score += 30;
    if (lower.includes('/images/i/') || lower.includes('/images/p/')) score += 30;
    if (amazonAsin && lower.includes(`/images/p/${amazonAsin.toLowerCase()}.`)) score += 55;
    if (lower.includes('/image/1200/1200/') || lower.includes('/image/1500/1500/')) score += 25;
    if (lower.includes('w_1080') || lower.includes('h_1440')) score += 20;
    if (/\.(jpg|jpeg|png|webp)(?:[?#].*)?$/i.test(lower)) score += 10;
    if (lower.includes('_sx') || lower.includes('_sy') || lower.includes('_ul') || lower.includes('_sr')) score -= 12;
    if (AMAZON_NON_PRODUCT_IMAGE_REGEX.test(lower)) score -= 200;
    if (titleBrands.length) {
        const foreign = imageBrands.find((brand) => !titleBrandSet.has(brand.toLowerCase()));
        if (foreign) score -= 120;
    }

    return score;
};

export const normalizeProductImages = ({
    image,
    images = [],
    store,
    productUrl,
    title,
    maxImages = 4,
    strictStore = true
} = {}) => {
    const storeKey = toStoreKey(store, productUrl);
    const titleBrands = getBrandSignals(title);
    const titleSignals = getModelSignals(title);
    const preferredMainImage = optimizeProductImageUrl(flattenImageCandidate(image)[0]?.url || '');
    const rawCandidates = [
        ...flattenImageCandidate(image),
        ...flattenImageCandidate(images),
        ...buildProductOwnedCandidates({ productUrl, storeKey }).map((url) => ({ url, meta: 'product owned candidate' }))
    ];
    const candidates = [];
    const seen = new Set();
    const rejectedReasons = {};

    rawCandidates.forEach((candidate) => {
        const candidateUrl = typeof candidate === 'string' ? candidate : candidate?.url;
        const candidateMeta = typeof candidate === 'object' ? String(candidate.meta || '') : '';
        const optimized = optimizeProductImageUrl(candidateUrl);
        if (!optimized) return;
        const canonicalIdentity = getCanonicalImageIdentity(optimized);
        if (seen.has(canonicalIdentity)) {
            rejectedReasons.duplicate_image = (rejectedReasons.duplicate_image || 0) + 1;
            return;
        }
        seen.add(canonicalIdentity);

        if (IMAGE_CONTEXT_JUNK_REGEX.test(candidateMeta.toLowerCase())) {
            rejectedReasons.context_mismatch = (rejectedReasons.context_mismatch || 0) + 1;
            return;
        }

        if (!isLikelyProductImage(optimized, { store, productUrl, title, strictStore })) {
            const reason = (!/^https?:\/\//i.test(optimized) && !optimized.startsWith('/uploads/'))
                ? 'invalid_url'
                : PRODUCT_IMAGE_JUNK_REGEX.test(optimized.toLowerCase())
                    ? 'junk_pattern'
                    : storeKey && STORE_IMAGE_CDNS[storeKey] && !STORE_IMAGE_CDNS[storeKey].some((cdn) => optimized.toLowerCase().includes(cdn)) && strictStore
                        ? 'store_cdn_mismatch'
                        : 'non_product_image';
            rejectedReasons[reason] = (rejectedReasons[reason] || 0) + 1;
            return;
        }

        const foreignBrand = hasForeignBrandSignal(optimized, title);
        if (foreignBrand) {
            rejectedReasons.brand_mismatch = (rejectedReasons.brand_mismatch || 0) + 1;
            return;
        }

        const matchTarget = `${optimized} ${candidateMeta}`;
        const modelMatchCount = countSignalMatches(matchTarget, titleSignals.slice(0, 6));
        const isTrustedAmazonProductImage = storeKey === 'amazon'
            && STORE_IMAGE_CDNS.amazon.some((cdn) => optimized.toLowerCase().includes(cdn))
            && !AMAZON_NON_PRODUCT_IMAGE_REGEX.test(optimized.toLowerCase());
        if (
            titleSignals.length >= 2
            && modelMatchCount === 0
            && !optimized.includes('/images/p/')
            && !isTrustedAmazonProductImage
        ) {
            rejectedReasons.model_mismatch = (rejectedReasons.model_mismatch || 0) + 1;
            return;
        }

        candidates.push({
            url: optimized,
            score: getProductImageScore(optimized, { store, productUrl, title }),
            sourceIndex: rawCandidates.findIndex((raw) => optimizeProductImageUrl(typeof raw === 'string' ? raw : raw?.url) === optimized)
        });
    });

    const ranked = candidates.sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex);

    const normalizedImages = ranked
        .map(({ url }) => url)
        .filter((url, index, list) => list.indexOf(url) === index)
        .slice(0, maxImages);

    const finalImages = preferredMainImage && normalizedImages.includes(preferredMainImage)
        ? [preferredMainImage, ...normalizedImages.filter((url) => url !== preferredMainImage)].slice(0, maxImages)
        : normalizedImages;

    return {
        image: finalImages[0] || NO_PRODUCT_IMAGE,
        images: finalImages,
        rejected: rawCandidates.length - finalImages.length,
        rejectedReasons,
        titleBrands,
        imageStatus: finalImages.length > 0 ? 'ok' : 'image_failed'
    };
};
