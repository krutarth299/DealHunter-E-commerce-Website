import { normalizeProductImages } from './product-images.js';
import { createProductTitleSet } from './product-titles.js';
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

const STORE_PATTERNS = [
    { name: 'Amazon', patterns: ['amazon.in', 'amazon.com', 'amzn.in', 'amazon'] },
    { name: 'Flipkart', patterns: ['flipkart.com', 'flipkart'] },
    { name: 'Myntra', patterns: ['myntra.com', 'myntra'] },
    { name: 'Meesho', patterns: ['meesho.com', 'meesho'] },
    { name: 'Blinkit', patterns: ['blinkit.com', 'blinkit'] },
    { name: 'Nykaa', patterns: ['nykaa.com', 'nykaa'] },
    { name: 'Ajio', patterns: ['ajio.com', 'ajio'] },
    { name: 'Croma', patterns: ['croma.com', 'croma'] },
    { name: 'BigBasket', patterns: ['bigbasket.com', 'bigbasket'] }
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

const normalizePricePair = ({ dealPriceCandidates = [], mrpCandidates = [] } = {}) => {
    let dealPrice = pickPreferredPriceNumber(dealPriceCandidates);
    let mrp = pickHighestPriceNumber(mrpCandidates);

    // Old imports sometimes swapped the sale price and MRP. Preserve the pair,
    // but always treat the lower value as the customer-facing selling price.
    if (dealPrice > 0 && mrp > 0 && mrp < dealPrice) {
        [dealPrice, mrp] = [mrp, dealPrice];
    }

    if (dealPrice <= 0) {
        mrp = 0;
    } else if (mrp <= dealPrice) {
        mrp = 0;
    }

    const discountPercent = dealPrice > 0 && mrp > dealPrice
        ? Math.round(((mrp - dealPrice) / mrp) * 100)
        : 0;

    return { dealPrice, mrp, discountPercent };
};

export const formatPriceDisplay = (value) => {
    const numeric = parsePriceNumber(value) ?? 0;
    return `${INR_SYMBOL}${numeric.toLocaleString('en-IN', {
        minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
        maximumFractionDigits: 2
    })}`;
};

export const detectStoreName = (storeValue, productUrl = '') => {
    const rawStore = String(storeValue || '').trim();
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

    return {
        ...makeVariantOptionFromDeal(normalizedOption, index),
        label: variant.label || variant.variantLabel || normalizedOption.variantLabel,
        type: variant.type || variant.variantType || normalizedOption.variantType
    };
};

export const normalizeDealPayload = (deal = {}) => {
    const rawDeal = asPlainObject(deal);
    const pricing = rawDeal.pricing || {};
    const storeInfo = typeof rawDeal.store === 'object' && rawDeal.store !== null ? rawDeal.store : {};
    const media = rawDeal.media || {};
    const productUrl = String(rawDeal.productUrl || rawDeal.originalLink || rawDeal.buyLink || rawDeal.link || rawDeal.url || '').trim();
    const affiliateOverrideLink = String(rawDeal.affiliateOverrideLink || '').trim();
    const affiliateLink = String(rawDeal.affiliateLink || rawDeal.buyLink || '').trim();
    const link = affiliateLink || productUrl;
    const storeName = detectStoreName(rawDeal.storeName || storeInfo.name || rawDeal.store, productUrl);
    const canonicalProductUrl = canonicalizeProductUrl(productUrl);
    const sourceProductId = pickFirstString(rawDeal.sourceProductId, rawDeal.productId, rawDeal.asin, getSourceProductId(canonicalProductUrl || productUrl, storeName));
    const normalizedImages = normalizeProductImages({
        image: [
            rawDeal.image,
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

    const { dealPrice, mrp, discountPercent } = normalizePricePair({
        dealPriceCandidates: [
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
    const title = pickFirstString(rawDeal.title, rawDeal.rawTitle, rawDeal.originalTitle, rawDeal.name, rawDeal.productTitle, rawDeal.product?.title);
    const titleSet = createProductTitleSet(title);
    const normalizedTitle = normalizeTitleForMatching(title);
    const duplicateKey = pickFirstString(rawDeal.duplicateKey, buildDuplicateKey({ storeName, productUrl: canonicalProductUrl || productUrl, title, sourceProductId }));
    const variantGroupKey = pickFirstString(rawDeal.parentProductKey, rawDeal.parentProductId, buildVariantGroupKey({ storeName, title }));
    const variantLabel = pickFirstString(rawDeal.variantLabel, rawDeal.selectedVariantLabel, deriveVariantLabel(title));
    const variantType = pickFirstString(rawDeal.variantType, detectVariantType(variantLabel));

    const normalizedDeal = {
        ...rawDeal,
        title,
        originalTitle: pickFirstString(rawDeal.originalTitle, rawDeal.rawTitle, titleSet.originalTitle),
        rawTitle: pickFirstString(rawDeal.rawTitle, rawDeal.originalTitle, titleSet.rawTitle),
        displayTitle: pickFirstString(rawDeal.displayTitle, titleSet.displayTitle),
        cardTitle: pickFirstString(rawDeal.cardTitle, titleSet.cardTitle),
        image: normalizedImages.image,
        images: normalizedImages.images,
        store: storeName,
        storeName,
        canonicalProductUrl,
        sourceProductId,
        normalizedTitle,
        duplicateKey,
        variantGroupKey,
        variantLabel,
        variantType,
        affiliateOverrideLink,
        affiliateLink,
        link,
        productUrl,
        dealPrice,
        price: dealPrice > 0 ? formatPriceDisplay(dealPrice) : '',
        mrp,
        originalPrice: mrp > dealPrice && dealPrice > 0 ? formatPriceDisplay(mrp) : '',
        discountPercent,
        discount: discountPercent > 0 ? `${discountPercent}% OFF` : '',
        category: pickFirstString(rawDeal.category, rawDeal.categoryName, rawDeal.product?.category, rawDeal.category?.name),
        description: pickFirstString(rawDeal.description, rawDeal.summary, rawDeal.product?.description),
        createdAt: rawDeal.createdAt || rawDeal.updatedAt || rawDeal.publishedAt || null
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
    String(deal.store || '') !== String(normalizedDeal.store || '')
    || String(deal.storeName || '') !== String(normalizedDeal.storeName || '')
    || String(deal.price || '') !== String(normalizedDeal.price || '')
    || Number(deal.dealPrice || 0) !== Number(normalizedDeal.dealPrice || 0)
    || String(deal.originalPrice || '') !== String(normalizedDeal.originalPrice || '')
    || Number(deal.mrp || 0) !== Number(normalizedDeal.mrp || 0)
    || String(deal.discount || '') !== String(normalizedDeal.discount || '')
    || Number(deal.discountPercent || 0) !== Number(normalizedDeal.discountPercent || 0)
    || String(deal.link || '') !== String(normalizedDeal.link || '')
    || String(deal.productUrl || '') !== String(normalizedDeal.productUrl || '')
    || String(deal.affiliateOverrideLink || '') !== String(normalizedDeal.affiliateOverrideLink || '')
    || String(deal.affiliateLink || '') !== String(normalizedDeal.affiliateLink || '')
    || String(deal.image || '') !== String(normalizedDeal.image || '')
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
    || String(deal.rawTitle || '') !== String(normalizedDeal.rawTitle || '')
    || String(deal.displayTitle || '') !== String(normalizedDeal.displayTitle || '')
    || String(deal.cardTitle || '') !== String(normalizedDeal.cardTitle || '')
);

export const normalizeDealForResponse = (deal) => {
    const plainDeal = typeof deal?.toObject === 'function' ? deal.toObject() : deal;
    return normalizeDealPayload(plainDeal || {});
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
            if (normalized.dealPrice <= 0) {
                invalidPricingCount += 1;
            }
            if (!hasDealChanges(deal, normalized)) return null;

            return {
                updateOne: {
                    filter: { _id: deal._id },
                    update: {
                        $set: {
                            store: normalized.store,
                            storeName: normalized.storeName,
                            price: normalized.price,
                            dealPrice: normalized.dealPrice,
                            originalPrice: normalized.originalPrice,
                            mrp: normalized.mrp,
                            discount: normalized.discount,
                            discountPercent: normalized.discountPercent,
                            link: normalized.link,
                            productUrl: normalized.productUrl,
                            affiliateOverrideLink: normalized.affiliateOverrideLink,
                            affiliateLink: normalized.affiliateLink,
                            image: normalized.image,
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
                            rawTitle: normalized.rawTitle,
                            displayTitle: normalized.displayTitle,
                            cardTitle: normalized.cardTitle
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
                update: { $set: { variants: mergedVariants } }
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
