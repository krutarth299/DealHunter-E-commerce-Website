import { isLikelyProductImage } from './product-images.js';
import { canonicalizeProductUrl, normalizeTitleForMatching } from './product-identity.js';
import { cleanFetchedProductTitle } from './product-titles.js';
import { getStoreIntegrationConfig, getStoreSourceByName, getStoreSourceByUrl } from '../config/storeSources.js';

export const CORE_CATEGORIES = [
    'Electronics',
    'Fashion',
    'Footwear',
    'Beauty',
    'Home & Kitchen',
    'Furniture',
    'Baby',
    'Health',
    'Grocery',
    'Accessories',
    'Travel',
    'Multi-category',
    'Uncategorized'
];

const CATEGORY_KEYWORDS = [
    { category: 'Electronics', keys: ['phone', 'mobile', 'laptop', 'tablet', 'tv', 'camera', 'headphone', 'earphone', 'earbud', 'speaker', 'charger', 'smartwatch', 'watch', 'appliance', 'refrigerator', 'washing machine', 'ac', 'air conditioner'] },
    { category: 'Fashion', keys: ['shirt', 'tshirt', 't-shirt', 'jeans', 'kurta', 'dress', 'saree', 'lehenga', 'top', 'jacket', 'hoodie', 'trouser', 'pant', 'skirt', 'blazer'] },
    { category: 'Footwear', keys: ['shoe', 'sneaker', 'sandal', 'slipper', 'boot', 'footwear', 'loafer', 'heel'] },
    { category: 'Beauty', keys: ['beauty', 'makeup', 'lipstick', 'serum', 'cream', 'moisturizer', 'shampoo', 'conditioner', 'kajal', 'cosmetic', 'perfume', 'fragrance', 'skin care', 'skincare'] },
    { category: 'Home & Kitchen', keys: ['kitchen', 'cookware', 'bedsheet', 'curtain', 'pillow', 'mattress', 'blanket', 'towel', 'lamp', 'home', 'decor', 'container', 'mixer', 'bottle'] },
    { category: 'Furniture', keys: ['furniture', 'sofa', 'bed', 'wardrobe', 'table', 'chair', 'recliner', 'bookshelf', 'cabinet'] },
    { category: 'Baby', keys: ['baby', 'kids', 'diaper', 'stroller', 'toy', 'feeding bottle', 'infant', 'child'] },
    { category: 'Health', keys: ['medicine', 'pharmacy', 'health', 'wellness', 'vitamin', 'supplement', 'ayurvedic', 'tablet', 'capsule', 'protein'] },
    { category: 'Grocery', keys: ['grocery', 'atta', 'rice', 'oil', 'snack', 'beverage', 'organic', 'fresh', 'milk', 'tea', 'coffee', 'masala'] },
    { category: 'Accessories', keys: ['bag', 'wallet', 'belt', 'sunglass', 'sunglasses', 'case', 'cover', 'accessory', 'jewellery', 'jewelry'] },
    { category: 'Travel', keys: ['flight', 'hotel', 'holiday', 'travel', 'bus', 'train', 'cab', 'resort'] }
];

const INVALID_CATEGORY_VALUES = new Set(['', 'unknown', 'other', 'uncategorized', 'na', 'n/a', 'null', 'undefined']);

const CATEGORY_SYNONYMS = [
    { category: 'Electronics', keys: ['electronics', 'electronic', 'mobile', 'mobiles', 'phone', 'phones', 'smartphone', 'smartphones', 'laptop', 'laptops', 'tablet', 'tablets', 'computer', 'computers', 'audio', 'camera', 'cameras', 'tv', 'television', 'televisions', 'headphone', 'headphones', 'earbud', 'earbuds', 'smartwatch', 'wearable', 'appliance', 'appliances'] },
    { category: 'Fashion', keys: ['fashion', 'clothing', 'apparel', 'wear', 'menswear', 'womenswear', 'ethnic', 'western', 'kidswear'] },
    { category: 'Footwear', keys: ['footwear', 'shoe', 'shoes', 'sneaker', 'sneakers', 'sandal', 'sandals', 'slipper', 'slippers', 'boot', 'boots'] },
    { category: 'Beauty', keys: ['beauty', 'makeup', 'cosmetic', 'cosmetics', 'skin care', 'skincare', 'hair care', 'haircare', 'personal care', 'fragrance'] },
    { category: 'Home & Kitchen', keys: ['home', 'kitchen', 'home & kitchen', 'home and kitchen', 'home essentials', 'home furnishing', 'home decor', 'kitchenware', 'cookware', 'decor'] },
    { category: 'Furniture', keys: ['furniture', 'sofa', 'bed', 'wardrobe', 'table', 'chair', 'cabinet'] },
    { category: 'Baby', keys: ['baby', 'babies', 'kids', 'toys', 'infant', 'newborn', 'child', 'children'] },
    { category: 'Health', keys: ['health', 'wellness', 'medical', 'medicine', 'pharmacy', 'nutrition', 'supplement', 'supplements'] },
    { category: 'Grocery', keys: ['grocery', 'groceries', 'food', 'foods', 'supermarket', 'essentials', 'beverages', 'snacks', 'atta', 'rice', 'oil'] },
    { category: 'Accessories', keys: ['accessories', 'accessory', 'bag', 'bags', 'wallet', 'wallets', 'belt', 'belts', 'sunglasses', 'jewellery', 'jewelry'] },
    { category: 'Travel', keys: ['travel', 'flight', 'flights', 'hotel', 'hotels', 'holiday', 'holidays', 'resort', 'trip'] }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeText = (value = '') => (
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
);

const parsePriceNumber = (value) => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const normalizeCategoryName = (value = '') => {
    const cleaned = normalizeText(value);
    const lower = cleaned.toLowerCase();
    if (INVALID_CATEGORY_VALUES.has(lower)) return '';

    const direct = CORE_CATEGORIES.find((category) => category.toLowerCase() === lower);
    if (direct) return direct;

    if (lower.includes('home') || lower.includes('kitchen')) return 'Home & Kitchen';
    if (lower.includes('personal care') || lower.includes('makeup')) return 'Beauty';
    if (lower.includes('pharmacy') || lower.includes('wellness') || lower.includes('health') || lower.includes('medical')) return 'Health';
    if (lower.includes('baby') || lower.includes('kid')) return 'Baby';
    if (lower.includes('grocer') || lower.includes('supermarket') || lower.includes('food')) return 'Grocery';
    if (lower.includes('shoe') || lower.includes('footwear')) return 'Footwear';
    if (lower.includes('accessor')) return 'Accessories';
    if (lower.includes('cloth') || lower.includes('apparel')) return 'Fashion';

    const synonymMatch = CATEGORY_SYNONYMS.find(({ keys }) => keys.some((key) => lower.includes(key)));
    if (synonymMatch) return synonymMatch.category;

    return cleaned;
};

const buildCategoryCandidates = (...groups) => (
    groups
        .flat()
        .map((value) => normalizeCategoryName(value))
        .filter(Boolean)
);

export const extractCategoryFromUrlPath = (productUrl = '', storeSource = null) => {
    try {
        const url = new URL(productUrl);
        const pathname = decodeURIComponent(url.pathname || '').toLowerCase();
        const sourceCategories = (storeSource?.categories || [])
            .map((category) => normalizeCategoryName(category))
            .filter(Boolean);

        for (const category of sourceCategories) {
            const normalized = category.toLowerCase().replace(/&/g, 'and');
            const slug = normalized.replace(/[^a-z0-9]+/g, '-');
            if (pathname.includes(`/${slug}`) || pathname.includes(normalized.replace(/\s+/g, '-'))) {
                return category;
            }
        }

        const synonymMatch = CATEGORY_SYNONYMS.find(({ keys }) =>
            keys.some((key) => pathname.includes(key.replace(/\s+/g, '-')) || pathname.includes(key.replace(/\s+/g, '')))
        );
        return synonymMatch?.category || '';
    } catch {
        return '';
    }
};


export const inferDealCategory = (deal = {}, storeSource = null) => {
    const source = storeSource || getStoreSourceByName(deal.storeName || deal.store) || getStoreSourceByUrl(deal.productUrl || deal.link);
    const extractedSourceCategory = normalizeCategoryName(
        deal.extractionMetadata?.sourceCategory
        || deal.extractionMetadata?.resolvedCategory
        || deal.sourceCategory
    );
    if (extractedSourceCategory && extractedSourceCategory !== 'Multi-category' && extractedSourceCategory !== 'Uncategorized') {
        return extractedSourceCategory;
    }

    const existing = normalizeCategoryName(deal.category || deal.categoryName);
    const urlCategory = extractCategoryFromUrlPath(deal.productUrl || deal.link || '', source);
    const priorityResult = pickCategoryByPriority({
        breadcrumbCandidates: deal.extractionMetadata?.breadcrumbCategories || [],
        metadataCandidates: deal.extractionMetadata?.metadataCategories || [],
        urlCandidate: urlCategory,
        titleCandidates: `${deal.title || ''} ${deal.originalTitle || ''} ${deal.description || ''}`
    });

    if (priorityResult.category) return priorityResult.category;
    if (existing && existing !== 'Multi-category' && existing !== 'Uncategorized') return existing;

    const haystack = `${deal.title || ''} ${deal.originalTitle || ''} ${deal.description || ''}`.toLowerCase();
    const matched = CATEGORY_KEYWORDS.find(({ keys }) => keys.some((key) => haystack.includes(key)));
    return matched?.category || '';
};

export const logStoreEvent = (store = 'STORE', action = 'INFO', message = '', meta = {}) => {
    const metaText = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${store || 'STORE'}] [${action}] ${message}${metaText}`);
};

export const resolveDealStoreConfig = (dealOrUrl = {}) => {
    const rawUrl = typeof dealOrUrl === 'string' ? dealOrUrl : (dealOrUrl.productUrl || dealOrUrl.link || '');
    const rawStore = typeof dealOrUrl === 'string' ? '' : (dealOrUrl.storeName || dealOrUrl.store || '');
    const source = getStoreSourceByUrl(rawUrl) || getStoreSourceByName(rawStore);
    return source ? getStoreIntegrationConfig(source) : null;
};

export const applyDealQualityDefaults = (deal = {}) => {
    const storeConfig = resolveDealStoreConfig(deal);
    const category = inferDealCategory(deal, storeConfig);
    const canonicalProductUrl = deal.canonicalProductUrl || canonicalizeProductUrl(deal.productUrl || deal.link || '');
    const normalizedTitle = deal.normalizedTitle || normalizeTitleForMatching(deal.title || deal.originalTitle || '');

    return {
        ...deal,
        category: category || normalizeCategoryName(deal.category || deal.categoryName) || 'Uncategorized',
        canonicalProductUrl,
        normalizedTitle
    };
};

export const validateDealCandidate = (deal = {}, { requireKnownCategory = true } = {}) => {
    const normalized = applyDealQualityDefaults(deal);
    const storeConfig = resolveDealStoreConfig(normalized);
    const reasons = [];
    const warnings = [];
    const cleanedTitle = cleanFetchedProductTitle(normalized.title || normalized.originalTitle || '');
    const title = normalizeText(cleanedTitle || normalized.title);
    const productUrl = normalizeText(normalized.productUrl || normalized.link);
    const store = normalizeText(normalized.storeName || normalized.store);
    const category = normalizeCategoryName(normalized.category);
    const dealPrice = parsePriceNumber(normalized.dealPrice || normalized.price);
    const mrp = parsePriceNumber(normalized.mrp || normalized.originalPrice);
    const image = normalizeText(normalized.image || normalized.images?.[0]);
    const galleryImages = Array.isArray(normalized.images) ? normalized.images.filter(Boolean) : [];
    const description = normalizeText(normalized.description || normalized.shortDescription);
    const discountPercent = dealPrice > 0 && mrp > dealPrice
        ? Math.round(((mrp - dealPrice) / mrp) * 100)
        : 0;
    const titleSource = normalizeText(normalized.title || normalized.originalTitle || title);
    const titleMeaningfulChars = titleSource.replace(/[^A-Za-z0-9]+/g, '').length;
    const titleLooksLikeJunk = [
        /\b(?:deal price|mrp|discount|save|cashback|coupon|emi|bank offer|exchange offer)\b/i,
        /^(?:[\d\s.,()/-]+)$/,
        /\b(?:rs\.?|inr|â‚¹)\s*\d/i,
        /\b\d+%\s*off\b/i,
        /\bends in\b/i
    ].some((pattern) => pattern.test(titleSource));
    const brokenTitle = !titleSource || titleMeaningfulChars < 3 || titleLooksLikeJunk;

    if (!title) reasons.push('title_missing');
    if (title && brokenTitle) reasons.push('title_broken');
    if (!store || store === 'Online Store') reasons.push('store_missing');
    if (!productUrl || !/^https?:\/\//i.test(productUrl)) reasons.push('product_url_invalid');
    if (requireKnownCategory && (!category || category === 'Uncategorized')) reasons.push('category_unknown');
    if (!requireKnownCategory && (!category || category === 'Uncategorized')) warnings.push('category_unknown');
    if (dealPrice <= 0) reasons.push('price_invalid');
    if (mrp > 0 && mrp < dealPrice) reasons.push('mrp_lower_than_price');
    if (discountPercent > 95) warnings.push('discount_too_high');
    if (!image || !/^https?:\/\//i.test(image)) {
        reasons.push('image_missing');
        reasons.push('image_failed');
    } else if (!isLikelyProductImage(image, {
        store,
        productUrl,
        title,
        strictStore: true
    })) {
        reasons.push('image_not_product_quality');
    }
    if (galleryImages.length === 0) {
        reasons.push('image_failed');
    }
    if (galleryImages.some((candidate) => !isLikelyProductImage(candidate, {
        store,
        productUrl,
        title,
        strictStore: true
    }))) {
        reasons.push('gallery_contains_non_product_images');
    }
    if (!normalized.duplicateKey && !normalized.canonicalProductUrl && !normalized.sourceProductId && !normalized.normalizedTitle) {
        warnings.push('weak_duplicate_keys');
    }
    if (!description || description.length < 20) warnings.push('description_thin');
    if (String(store).toLowerCase() === 'myntra' && !description) reasons.push('description_missing');
    if (!storeConfig) reasons.push('store_not_in_source_catalog');

    const pricingReasons = reasons.filter((reason) => (
        reason === 'price_invalid'
        || reason === 'mrp_lower_than_price'
        || reason === 'discount_too_high'
    ));
    if (pricingReasons.length > 0) {
        console.warn(`[PRICE_VALIDATION_FAIL] ${JSON.stringify({
            title: title || normalized.title || '',
            url: productUrl,
            store,
            dealPrice,
            mrp,
            discountPercent,
            reasons: pricingReasons
        })}`);
    }

    return {
        ok: reasons.length === 0,
        reasons,
        warnings,
        deal: {
            ...normalized,
            title,
            shortTitle: cleanedTitle || normalized.shortTitle,
            fullTitle: cleanedTitle || normalized.fullTitle,
            category,
            validationStatus: reasons.length === 0 ? 'accepted' : 'rejected',
            validationErrors: reasons,
            validationWarnings: warnings,
            extractionStrategy: storeConfig?.extractionStrategy || normalized.extractionStrategy || '',
            sourceTier: storeConfig?.tier || normalized.sourceTier || null
        },
        storeConfig
    };
};

export const pickCategoryByPriority = ({
    breadcrumbCandidates = [],
    metadataCandidates = [],
    urlCandidate = '',
    titleCandidates = ''
} = {}) => {
    // 1. Breadcrumbs are highly reliable
    const fromBreadcrumbs = buildCategoryCandidates(breadcrumbCandidates)[0];
    if (fromBreadcrumbs) return { category: fromBreadcrumbs, source: 'breadcrumbs' };

    // 2. Metadata (e.g. JSON-LD) is also strong
    const fromMetadata = buildCategoryCandidates(metadataCandidates)[0];
    if (fromMetadata) return { category: fromMetadata, source: 'metadata' };

    // 3. URL path is usually accurate
    const fromUrl = normalizeCategoryName(urlCandidate);
    if (fromUrl) return { category: fromUrl, source: 'url' };

    // 4. Fallback to title keywords if needed
    if (titleCandidates) {
        const lower = titleCandidates.toLowerCase();
        const matched = CATEGORY_KEYWORDS.find(({ keys }) => keys.some((key) => lower.includes(key)));
        if (matched) return { category: matched.category, source: 'title-keywords' };
    }

    return { category: '', source: 'none' };
};
