import { normalizeProductImages } from './product-images.js';
import { cleanFetchedProductTitle, createProductTitleSet } from './product-titles.js';
import { slugifyProductTitle } from '../../src/utils/productUrls.js';
import {
    buildDuplicateKey,
    buildVariantGroupKey,
    canonicalizeProductUrl,
    detectVariantType,
    deriveVariantLabel,
    getSourceProductId,
    makeVariantOptionFromDeal,
    mergeVariantOptions,
    normalizeTitleForMatching,
    pickBestDealRecord
} from './product-identity.js';
import { AFFILIATE_STORE_SOURCES, getStoreSourceByName, getStoreSourceByUrl } from '../config/storeSources.js';
import { inferDealCategory, resolveDealStoreConfig } from './store-ecosystem.js';

const STORE_PATTERNS = [
    ...AFFILIATE_STORE_SOURCES.map((source) => ({
        name: source.store,
        patterns: [source.domain, source.store, ...(source.aliases || [])].filter(Boolean)
    }))
];

const INR_SYMBOL = '\u20B9';

const asPlainObject = (value = {}) => {
    if (!value || typeof value !== 'object') return {};
    if (typeof value.toObject === 'function') return value.toObject();
    if (value._doc && typeof value._doc === 'object') {
        return { ...value._doc, ...value };
    }
    return value;
};

const pickFirstString = (...candidates) => {
    for (const candidate of candidates.flat()) {
        if (candidate === null || candidate === undefined) continue;
        const normalized = String(candidate).trim();
        if (normalized) return normalized;
    }
    return '';
};

const pickImageValue = (input) => {
    if (!input) return '';
    if (typeof input === 'string') return input.trim();
    if (Array.isArray(input)) {
        for (const item of input) {
            const resolved = pickImageValue(item);
            if (resolved) return resolved;
        }
        return '';
    }
    if (typeof input === 'object') {
        return pickFirstString(input.url, input.src, input.image, input.imageUrl);
    }
    return '';
};

const titleCase = (value = '') =>
    String(value)
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const slugifyValue = (value = '') => slugifyProductTitle(value).replace(/-+/g, '-').replace(/^-+|-+$/g, '');

const toSafeText = (value = '', fallback = '') => {
    const text = String(value || '').trim();
    return text || fallback;
};

const takeDescriptionSnippet = (value = '', maxLength = 165) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3).replace(/\s+\S*$/, '')}...`;
};

export const parsePriceNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const cleaned = String(value)
        .replace(/&nbsp;/gi, ' ')
        .replace(/,/g, '')
        .replace(/\s+/g, '')
        .replace(/[^0-9.]/g, '');

    if (!cleaned) return null;

    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};

const logPriceEvent = (tag, payload = {}) => {
    // Disabled to prevent massive console spam when loading the deals list
};

const pickPreferredPriceNumber = (...candidates) => {
    for (const candidate of candidates.flat()) {
        const parsed = parsePriceNumber(candidate);
        if (parsed !== null && parsed > 0) {
            return parsed;
        }
    }
    return 0;
};

const pickHighestPriceNumber = (...candidates) => (
    candidates
        .flat()
        .map((candidate) => parsePriceNumber(candidate))
        .filter((parsed) => parsed !== null && parsed > 0)
        .sort((a, b) => b - a)[0] || 0
);

const cleanPricingCandidates = (candidates = []) => (
    candidates
        .flat()
        .map((candidate) => ({
            raw: candidate,
            value: parsePriceNumber(candidate)
        }))
        .filter((entry) => entry.value !== null && entry.value > 0)
);

export const resolveSourcePricing = ({
    context = {},
    currentPriceCandidates = [],
    mrpCandidates = []
} = {}) => {
    const cleanedCurrentCandidates = cleanPricingCandidates(currentPriceCandidates);
    const cleanedMrpCandidates = cleanPricingCandidates(mrpCandidates);

    logPriceEvent('PRICE_SOURCE_READ', {
        title: String(context.title || '').slice(0, 120),
        url: context.productUrl || context.link || '',
        rawCurrentPrice: currentPriceCandidates.filter((value) => value !== null && value !== undefined && value !== ''),
        rawOriginalPrice: mrpCandidates.filter((value) => value !== null && value !== undefined && value !== '')
    });
    logPriceEvent('PRICE_CLEAN', {
        title: String(context.title || '').slice(0, 120),
        url: context.productUrl || context.link || '',
        cleanedDealCandidates: cleanedCurrentCandidates.map((entry) => entry.value),
        cleanedMrpCandidates: cleanedMrpCandidates.map((entry) => entry.value)
    });

    const dealPrice = cleanedCurrentCandidates[0]?.value || 0;
    let mrp = pickHighestPriceNumber(cleanedMrpCandidates.map((entry) => entry.value));
    const hasExplicitMrp = cleanedMrpCandidates.length > 0;

    // High-fidelity pricing: Avoid overwriting MRP with dealPrice if MRP is missing
    // User requested to keep them distinct to identify non-deals or errors
    if (!mrp) mrp = 0; 

    const discountPercent = dealPrice > 0 && mrp > dealPrice
        ? Math.round(((mrp - dealPrice) / mrp) * 100)
        : 0;

    logPriceEvent('DISCOUNT_CALCULATE', {
        title: String(context.title || '').slice(0, 120),
        url: context.productUrl || context.link || '',
        dealPrice,
        mrp,
        discountPercent
    });
    logPriceEvent('PRICE_MAP', {
        title: String(context.title || '').slice(0, 120),
        url: context.productUrl || context.link || '',
        dealPrice,
        mrp,
        discountPercent
    });

    return { dealPrice, mrp, discountPercent, hasExplicitMrp };
};

const formatNormalizedPriceDisplay = (dealPrice = 0, mrp = 0, hasExplicitMrp = false) => ({
    priceDisplay: dealPrice > 0 ? formatPriceDisplay(dealPrice) : '',
    originalPriceDisplay: mrp > 0 && dealPrice > 0 && (mrp > dealPrice || hasExplicitMrp) ? formatPriceDisplay(mrp) : ''
});

export const formatPriceDisplay = (value) => {
    const numeric = parsePriceNumber(value) ?? 0;
    return `${INR_SYMBOL}${numeric.toLocaleString('en-IN', {
        minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
        maximumFractionDigits: 2
    })}`;
};

export const detectStoreName = (storeValue, productUrl = '') => {
    const rawStore = String(storeValue || '').trim();
    const exactStoreMatch = getStoreSourceByName(rawStore);
    if (exactStoreMatch?.store) return exactStoreMatch.store;

    const urlStoreMatch = getStoreSourceByUrl(productUrl);
    if (urlStoreMatch?.store) return urlStoreMatch.store;

    const haystack = `${rawStore} ${productUrl}`.toLowerCase();

    const matched = STORE_PATTERNS.find(({ patterns }) =>
        patterns.some((pattern) => haystack.includes(pattern))
    );

    if (matched) return matched.name;
    if (rawStore) return titleCase(rawStore);
    return 'Online Store';
};

const normalizeVariantOption = (variant = {}, fallbackDeal = {}, index = 0) => {
    const optionDeal = {
        ...fallbackDeal,
        ...asPlainObject(variant),
        variants: [],
        _id: variant.dealId || variant.id || variant._id || fallbackDeal._id,
        title: pickFirstString(variant.title, variant.name, fallbackDeal.title),
        image: pickImageValue([variant.image, variant.mainImage, variant.images, fallbackDeal.image]),
        images: Array.isArray(variant.images) ? variant.images : [],
        price: variant.price || fallbackDeal.price,
        dealPrice: variant.dealPrice ?? variant.price ?? fallbackDeal.dealPrice,
        originalPrice: variant.originalPrice || fallbackDeal.originalPrice,
        mrp: variant.mrp ?? variant.originalPrice ?? fallbackDeal.mrp,
        productUrl: pickFirstString(variant.productUrl, variant.url, variant.link, fallbackDeal.productUrl),
        link: pickFirstString(variant.link, variant.url, variant.productUrl, fallbackDeal.link),
        variantLabel: variant.label || variant.variantLabel,
        variantType: variant.type || variant.variantType,
        availability: variant.availability || fallbackDeal.availability,
        sourceProductId: variant.sourceProductId
    };
    const normalizedOption = normalizeDealPayload(optionDeal);
    const { priceDisplay, originalPriceDisplay } = formatNormalizedPriceDisplay(normalizedOption.dealPrice, normalizedOption.mrp);

    return {
        ...makeVariantOptionFromDeal(normalizedOption, index),
        price: normalizedOption.dealPrice,
        originalPrice: normalizedOption.mrp > normalizedOption.dealPrice && normalizedOption.dealPrice > 0 ? normalizedOption.mrp : 0,
        priceDisplay,
        originalPriceDisplay,
        label: variant.label || variant.variantLabel || normalizedOption.variantLabel,
        type: variant.type || variant.variantType || normalizedOption.variantType
    };
};

export const normalizeDealPayload = (deal = {}) => {
    const rawDeal = asPlainObject(deal);
    const pricing = rawDeal.pricing || {};
    const storeInfo = typeof rawDeal.store === 'object' && rawDeal.store !== null ? rawDeal.store : {};
    const media = rawDeal.media || {};
    const originalLink = pickFirstString(
        rawDeal.originalLink,
        rawDeal.productUrl,
        rawDeal.extractionMetadata?.sourceUrl,
        rawDeal.sourceUrl,
        rawDeal.url,
        rawDeal.buyLink,
        rawDeal.canonicalProductUrl,
        rawDeal.link
    );
    const productUrl = String(rawDeal.productUrl || originalLink || rawDeal.buyLink || rawDeal.link || rawDeal.url || '').trim();
    const affiliateOverrideLink = String(rawDeal.affiliateOverrideLink || '').trim();
    const affiliateLink = String(rawDeal.affiliateLink || rawDeal.buyLink || '').trim();
    const link = affiliateLink || productUrl;
    const storeName = detectStoreName(rawDeal.storeName || storeInfo.name || rawDeal.store, productUrl);
    const isFlipkartStore = String(storeName || '').toLowerCase().includes('flipkart');
    const storeConfig = resolveDealStoreConfig({ ...rawDeal, storeName, store: storeName, productUrl });
    const canonicalProductUrl = canonicalizeProductUrl(productUrl);
    const sourceProductId = pickFirstString(rawDeal.sourceProductId, rawDeal.productId, rawDeal.asin, getSourceProductId(canonicalProductUrl || productUrl, storeName));
    const normalizedImages = normalizeProductImages({
        image: [
            rawDeal.image,
            rawDeal.imageUrl,
            rawDeal.mainImage,
            media.mainImage,
            media.image
        ],
        images: [
            rawDeal.images,
            media.images
        ],
        store: storeName,
        productUrl,
        title: rawDeal.title || rawDeal.name,
        strictStore: false
    });

    const { dealPrice, mrp, discountPercent, hasExplicitMrp } = resolveSourcePricing({
        context: {
            title: rawDeal.title || rawDeal.name || rawDeal.productTitle || '',
            productUrl,
            link
        },
        currentPriceCandidates: [
            pricing.dealPrice,
            pricing.currentPrice,
            pricing.salePrice,
            rawDeal.dealPrice,
            rawDeal.currentPrice,
            rawDeal.salePrice,
            rawDeal.sellingPrice,
            pricing.price,
            rawDeal.price
        ],
        mrpCandidates: [
            pricing.mrp,
            pricing.originalPrice,
            pricing.listPrice,
            pricing.strikePrice,
            rawDeal.mrp,
            rawDeal.listPrice,
            rawDeal.strikePrice,
            rawDeal.wasPrice,
            rawDeal.originalPrice
        ]
    });
    const rawTitle = pickFirstString(rawDeal.title, rawDeal.rawTitle, rawDeal.originalTitle, rawDeal.name, rawDeal.productTitle, rawDeal.product?.title);
    const cleanedSourceTitle = cleanFetchedProductTitle(rawTitle);
    const titleSet = createProductTitleSet(cleanedSourceTitle || rawTitle);
    const publicTitle = pickFirstString(titleSet.displayTitle, titleSet.cardTitle, cleanedSourceTitle, rawTitle);
    const title = publicTitle || cleanedSourceTitle || rawTitle;
    const normalizedTitle = normalizeTitleForMatching(publicTitle || rawTitle);
    const inferredCategory = inferDealCategory({
        ...rawDeal,
        store: storeName,
        storeName,
        productUrl,
        title: publicTitle || rawTitle
    }, storeConfig);
    const slug = slugifyValue(rawDeal.slug || titleSet.cardTitle || titleSet.displayTitle || publicTitle || rawTitle);
    const storeSlug = slugifyValue(rawDeal.storeSlug || storeName);
    const categorySlug = slugifyValue(rawDeal.categorySlug || rawDeal.category || inferredCategory);
    const shortTitle = pickFirstString(rawDeal.shortTitle, titleSet.cardTitle, titleSet.displayTitle, publicTitle || rawTitle);
    const fullTitle = pickFirstString(rawDeal.fullTitle, titleSet.displayTitle, titleSet.cardTitle, publicTitle || rawTitle);
    const shortDescription = pickFirstString(rawDeal.shortDescription, takeDescriptionSnippet(rawDeal.description || rawDeal.summary || rawDeal.product?.description));
    const duplicateKey = pickFirstString(rawDeal.duplicateKey, buildDuplicateKey({ storeName, productUrl: canonicalProductUrl || productUrl, title, sourceProductId }));
    const variantGroupKey = pickFirstString(rawDeal.parentProductKey, rawDeal.parentProductId, buildVariantGroupKey({ storeName, title }));
    const variantLabel = pickFirstString(rawDeal.variantLabel, rawDeal.selectedVariantLabel, deriveVariantLabel(title));
    const variantType = pickFirstString(rawDeal.variantType, detectVariantType(variantLabel));
    const priceCheckedAt = rawDeal.priceCheckedAt || rawDeal.lastFetchedAt || rawDeal.updatedAt || null;
    const publishedAt = rawDeal.publishedAt || rawDeal.createdAt || null;
    const lastSyncedAt = rawDeal.lastSyncedAt || rawDeal.updatedAt || rawDeal.lastFetchedAt || null;
    const reviewCount = Number(rawDeal.reviewCount || rawDeal.reviewsCount || rawDeal.ratingsCount || 0) || 0;
    const availability = pickFirstString(rawDeal.availability, rawDeal.isExpired ? 'Out of stock' : 'In stock');
    const brand = pickFirstString(rawDeal.brand, rawDeal.product?.brand, storeConfig?.brand, storeName);
    const model = pickFirstString(rawDeal.model, rawDeal.product?.model, rawDeal.sku);
    const highlights = Array.isArray(rawDeal.highlights)
        ? rawDeal.highlights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
        : Array.isArray(rawDeal.product?.highlights)
            ? rawDeal.product.highlights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
            : [];
    const specifications = rawDeal.specifications || rawDeal.product?.specifications || rawDeal.product?.specs || {};
    const freshness = rawDeal.freshness || (lastSyncedAt ? 'fresh' : '');
    const canonicalUrl = rawDeal.canonicalUrl || `/product/${slug}`;
    const thumbnail = normalizedImages.image || rawDeal.thumbnail || '';
    const { priceDisplay, originalPriceDisplay } = formatNormalizedPriceDisplay(dealPrice, mrp, hasExplicitMrp);

    const normalizedDeal = {
        ...rawDeal,
        title: publicTitle || rawTitle,
        shortTitle,
        fullTitle,
        slug,
        originalTitle: pickFirstString(rawDeal.originalTitle, rawDeal.rawTitle, rawTitle),
        thumbnail,
        image: normalizedImages.image,
        imageUrl: normalizedImages.image,
        images: normalizedImages.images,
        store: storeName,
        storeName,
        storeSlug,
        canonicalProductUrl,
        sourceProductId,
        normalizedTitle,
        duplicateKey,
        variantGroupKey,
        variantLabel,
        variantType,
        affiliateOverrideLink,
        affiliateLink,
        originalLink,
        link,
        productUrl,
        dealPrice,
        price: mrp || dealPrice || 0, // price => MRP
        priceDisplay,
        mrp: mrp || 0,
        originalPrice: mrp || 0, // Ensure originalPrice is the MRP
        originalPriceDisplay,
        discountPercent,
        discount: discountPercent > 0 ? `${discountPercent}% OFF` : (isFlipkartStore && mrp > 0 && dealPrice > 0 ? '0% OFF' : ''),
        category: pickFirstString(rawDeal.category, rawDeal.categoryName, rawDeal.product?.category, rawDeal.category?.name, inferredCategory, 'Uncategorized'),
        description: pickFirstString(rawDeal.description, rawDeal.summary, rawDeal.product?.description),
        shortDescription,
        canonicalUrl,
        brand,
        model,
        specifications,
        highlights,
        reviewCount,
        availability,
        isVerified: Boolean(rawDeal.isVerified || rawDeal.verified || rawDeal.validationStatus === 'accepted'),
        isTrending: Boolean(rawDeal.isTrending || rawDeal.trending || rawDeal.featured),
        featured: Boolean(rawDeal.featured),
        isBestseller: Boolean(rawDeal.isBestseller || rawDeal.bestseller),
        freshness,
        priceCheckedAt,
        publishedAt,
        lastSyncedAt,
        sourceStore: pickFirstString(rawDeal.sourceStore, storeConfig?.store),
        sourceTier: rawDeal.sourceTier || storeConfig?.tier || null,
        createdAt: rawDeal.createdAt || rawDeal.updatedAt || rawDeal.publishedAt || null,
        updatedAt: rawDeal.updatedAt || null
    };
    normalizedDeal.variants = mergeVariantOptions(
        rawDeal.variants && Array.isArray(rawDeal.variants)
            ? rawDeal.variants.map((variant, index) => normalizeVariantOption(variant, normalizedDeal, index))
            : [],
        [makeVariantOptionFromDeal(normalizedDeal, 0)]
    );

    return normalizedDeal;
};

const hasDealChanges = (deal, normalizedDeal) => (
    String(deal.title || '') !== String(normalizedDeal.title || '')
    || String(deal.slug || '') !== String(normalizedDeal.slug || '')
    || String(deal.shortTitle || '') !== String(normalizedDeal.shortTitle || '')
    || String(deal.fullTitle || '') !== String(normalizedDeal.fullTitle || '')
    || String(deal.store || '') !== String(normalizedDeal.store || '')
    || String(deal.storeName || '') !== String(normalizedDeal.storeName || '')
    || String(deal.storeSlug || '') !== String(normalizedDeal.storeSlug || '')
    || Number(parsePriceNumber(deal.price) || 0) !== Number(parsePriceNumber(normalizedDeal.price) || 0)
    || Number(deal.dealPrice || 0) !== Number(normalizedDeal.dealPrice || 0)
    || Number(parsePriceNumber(deal.originalPrice) || 0) !== Number(parsePriceNumber(normalizedDeal.originalPrice) || 0)
    || Number(deal.mrp || 0) !== Number(normalizedDeal.mrp || 0)
    || String(deal.discount || '') !== String(normalizedDeal.discount || '')
    || Number(deal.discountPercent || 0) !== Number(normalizedDeal.discountPercent || 0)
    || String(deal.link || '') !== String(normalizedDeal.link || '')
    || String(deal.productUrl || '') !== String(normalizedDeal.productUrl || '')
    || String(deal.affiliateOverrideLink || '') !== String(normalizedDeal.affiliateOverrideLink || '')
    || String(deal.affiliateLink || '') !== String(normalizedDeal.affiliateLink || '')
    || String(deal.originalLink || '') !== String(normalizedDeal.originalLink || '')
    || String(deal.image || '') !== String(normalizedDeal.image || '')
    || String(deal.thumbnail || '') !== String(normalizedDeal.thumbnail || '')
    || JSON.stringify(deal.images || []) !== JSON.stringify(normalizedDeal.images || [])
    || String(deal.canonicalProductUrl || '') !== String(normalizedDeal.canonicalProductUrl || '')
    || String(deal.sourceProductId || '') !== String(normalizedDeal.sourceProductId || '')
    || String(deal.normalizedTitle || '') !== String(normalizedDeal.normalizedTitle || '')
    || String(deal.duplicateKey || '') !== String(normalizedDeal.duplicateKey || '')
    || String(deal.variantGroupKey || '') !== String(normalizedDeal.variantGroupKey || '')
    || String(deal.variantLabel || '') !== String(normalizedDeal.variantLabel || '')
    || String(deal.variantType || '') !== String(normalizedDeal.variantType || '')
    || JSON.stringify(deal.variants || []) !== JSON.stringify(normalizedDeal.variants || [])
    || String(deal.originalTitle || '') !== String(normalizedDeal.originalTitle || '')
    || String(deal.categorySlug || '') !== String(normalizedDeal.categorySlug || '')
    || String(deal.shortDescription || '') !== String(normalizedDeal.shortDescription || '')
    || String(deal.canonicalUrl || '') !== String(normalizedDeal.canonicalUrl || '')
    || String(deal.shareTitle || '') !== String(normalizedDeal.shareTitle || '')
    || String(deal.shareDescription || '') !== String(normalizedDeal.shareDescription || '')
    || String(deal.brand || '') !== String(normalizedDeal.brand || '')
    || String(deal.model || '') !== String(normalizedDeal.model || '')
    || JSON.stringify(deal.specifications || {}) !== JSON.stringify(normalizedDeal.specifications || {})
    || JSON.stringify(deal.highlights || []) !== JSON.stringify(normalizedDeal.highlights || [])
    || Number(deal.reviewCount || 0) !== Number(normalizedDeal.reviewCount || 0)
    || String(deal.availability || '') !== String(normalizedDeal.availability || '')
    || Boolean(deal.isVerified) !== Boolean(normalizedDeal.isVerified)
    || Boolean(deal.isTrending) !== Boolean(normalizedDeal.isTrending)
    || Boolean(deal.isBestseller) !== Boolean(normalizedDeal.isBestseller)
    || String(deal.freshness || '') !== String(normalizedDeal.freshness || '')
    || String(deal.priceCheckedAt || '') !== String(normalizedDeal.priceCheckedAt || '')
    || String(deal.publishedAt || '') !== String(normalizedDeal.publishedAt || '')
    || String(deal.lastSyncedAt || '') !== String(normalizedDeal.lastSyncedAt || '')
    || String(deal.validationStatus || '') !== String(normalizedDeal.validationStatus || '')
    || JSON.stringify(deal.validationErrors || []) !== JSON.stringify(normalizedDeal.validationErrors || [])
    || JSON.stringify(deal.validationWarnings || []) !== JSON.stringify(normalizedDeal.validationWarnings || [])
);

export const normalizeDealForResponse = (deal) => {
    const plainDeal = typeof deal?.toObject === 'function' ? deal.toObject() : deal;
    const normalized = normalizeDealPayload(plainDeal || {});
    const hasExplicitMrp = Number(normalized.mrp || 0) > 0;
    const { priceDisplay, originalPriceDisplay } = formatNormalizedPriceDisplay(normalized.dealPrice, normalized.mrp, hasExplicitMrp);
    const isFlipkartStore = String(normalized.storeName || normalized.store || '').toLowerCase().includes('flipkart');

    const standardized = {
        ...normalized,
        dealPrice: normalized.dealPrice || normalized.price || "",
        mrp: normalized.mrp || normalized.originalPrice || "",
        discount: normalized.discount || (normalized.discountPercent > 0 ? `${normalized.discountPercent}% OFF` : ""),
        image: normalized.image || normalized.imageUrl || "",
    };

    return {
        ...standardized,
        price: priceDisplay,
        originalPrice: originalPriceDisplay
    };
};

export const repairStoredDeals = async (DealModel) => {
    const existingDeals = await DealModel.find().lean();
    if (!existingDeals.length) {
        console.log('[DEAL_NORMALIZER] No deals found for repair.');
        return { scanned: 0, updated: 0 };
    }

    let invalidPricingCount = 0;

    const operations = existingDeals
        .map((deal) => {
            const normalized = normalizeDealPayload(deal);
            if (normalized.dealPrice <= 0 || normalized.discountPercent > 95) {
                invalidPricingCount += 1;
            }
            if (!hasDealChanges(deal, normalized)) return null;

            return {
                updateOne: {
                    filter: { _id: deal._id },
                    update: {
                        $set: {
                            slug: normalized.slug,
                            title: normalized.title,
                            shortTitle: normalized.shortTitle,
                            fullTitle: normalized.fullTitle,
                            store: normalized.store,
                            storeName: normalized.storeName,
                            storeSlug: normalized.storeSlug,
                            price: normalized.price,
                            dealPrice: normalized.dealPrice,
                            originalPrice: normalized.originalPrice,
                            mrp: normalized.mrp,
                            discount: normalized.discount,
                            discountPercent: normalized.discountPercent,
                            link: normalized.link,
                            productUrl: normalized.productUrl,
                            originalLink: normalized.originalLink,
                            affiliateOverrideLink: normalized.affiliateOverrideLink,
                            affiliateLink: normalized.affiliateLink,
                            image: normalized.image,
                            thumbnail: normalized.thumbnail,
                            images: normalized.images,
                            canonicalProductUrl: normalized.canonicalProductUrl,
                            sourceProductId: normalized.sourceProductId,
                            normalizedTitle: normalized.normalizedTitle,
                            duplicateKey: normalized.duplicateKey,
                            variantGroupKey: normalized.variantGroupKey,
                            variantLabel: normalized.variantLabel,
                            variantType: normalized.variantType,
                            variants: normalized.variants,
                            originalTitle: normalized.originalTitle,
                            categorySlug: normalized.categorySlug,
                            shortDescription: normalized.shortDescription,
                            canonicalUrl: normalized.canonicalUrl,
                            brand: normalized.brand,
                            model: normalized.model,
                            specifications: normalized.specifications,
                            highlights: normalized.highlights,
                            reviewCount: normalized.reviewCount,
                            availability: normalized.availability,
                            isVerified: normalized.isVerified,
                            isTrending: normalized.isTrending,
                            isBestseller: normalized.isBestseller,
                            freshness: normalized.freshness,
                            priceCheckedAt: normalized.priceCheckedAt,
                            publishedAt: normalized.publishedAt,
                            lastSyncedAt: normalized.lastSyncedAt,
                            validationWarnings: normalized.validationWarnings,
                            updatedAt: normalized.updatedAt || new Date()
                        }
                    }
                }
            };
        })
        .filter(Boolean);

    if (operations.length > 0) {
        await DealModel.bulkWrite(operations);
    }

    const normalizedDeals = existingDeals.map((deal) => normalizeDealPayload(deal));
    const groups = normalizedDeals.reduce((acc, deal) => {
        if (!deal.duplicateKey) return acc;
        if (!acc.has(deal.duplicateKey)) acc.set(deal.duplicateKey, []);
        acc.get(deal.duplicateKey).push(deal);
        return acc;
    }, new Map());

    const duplicateMergeOperations = [];
    const duplicateIdsToDelete = [];

    groups.forEach((group) => {
        if (group.length < 2) return;

        const keeper = pickBestDealRecord(group);
        const extras = group.filter((deal) => String(deal._id) !== String(keeper._id));
        const mergedVariants = mergeVariantOptions(
            keeper.variants,
            group.map((deal) => deal.variants || []),
            group.map((deal, index) => ({
                id: String(deal._id || index),
                dealId: String(deal._id || ''),
                variantKey: deal.duplicateKey,
                groupKey: deal.variantGroupKey,
                label: deal.variantLabel || `Option ${index + 1}`,
                type: deal.variantType || 'Option',
                title: deal.title,
                image: deal.image,
                images: deal.images,
                price: deal.price,
                dealPrice: deal.dealPrice,
                originalPrice: deal.originalPrice,
                mrp: deal.mrp,
                discount: deal.discount,
                discountPercent: deal.discountPercent,
                productUrl: deal.productUrl,
                link: deal.link,
                affiliateLink: deal.affiliateLink,
                affiliateOverrideLink: deal.affiliateOverrideLink,
                availability: deal.isExpired ? 'Out of stock' : 'In stock',
                sourceProductId: deal.sourceProductId
            }))
        );

        duplicateMergeOperations.push({
            updateOne: {
                filter: { _id: keeper._id },
                update: { $set: { variants: mergedVariants, updatedAt: new Date() } }
            }
        });

        extras.forEach((deal) => duplicateIdsToDelete.push(deal._id));
    });

    if (duplicateMergeOperations.length > 0) {
        await DealModel.bulkWrite(duplicateMergeOperations);
    }

    if (duplicateIdsToDelete.length > 0) {
        await DealModel.deleteMany({ _id: { $in: duplicateIdsToDelete } });
    }

    console.log(`[DEAL_NORMALIZER] Scanned ${existingDeals.length} deals, repaired ${operations.length}, merged exact duplicates ${duplicateIdsToDelete.length}, invalid pricing ${invalidPricingCount}.`);
    return {
        scanned: existingDeals.length,
        updated: operations.length,
        deletedDuplicates: duplicateIdsToDelete.length,
        invalidPricing: invalidPricingCount
    };
};
