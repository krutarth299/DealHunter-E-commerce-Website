const TRACKING_PARAMS = [
    'tag',
    'ascsubtag',
    'linkcode',
    'psc',
    'ref',
    'ref_',
    'qid',
    'sr',
    'sprefix',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'affid',
    'affExtParam',
    'affid'
];

const COLOR_WORDS = [
    'black', 'white', 'blue', 'green', 'red', 'pink', 'purple', 'violet', 'yellow',
    'orange', 'gold', 'silver', 'grey', 'gray', 'brown', 'beige', 'cream', 'navy',
    'maroon', 'teal', 'cyan', 'rose', 'mint', 'charcoal', 'graphite', 'midnight',
    'starlight', 'transparent'
];

const VARIANT_WORD_REGEX = new RegExp(
    `\\b(${COLOR_WORDS.join('|')}|\\d+\\s?(?:gb|tb|mb)|\\d+\\s?(?:ml|l|kg|g|inch|cm|mm)|(?:xs|s|m|l|xl|xxl|xxxl)|pack\\s?of\\s?\\d+|\\d+\\s?pack|set\\s?of\\s?\\d+)\\b`,
    'gi'
);

const trimToKey = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export const normalizeTitleForMatching = (title = '') =>
    trimToKey(title)
        .replace(/\b(?:with|for|and|the|a|an)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const stripVariantSignals = (title = '') => {
    let next = String(title)
        .replace(/\(([^)]*)\)/g, (match, inner) => (
            VARIANT_WORD_REGEX.test(inner) ? ' ' : ` ${inner} `
        ));

    VARIANT_WORD_REGEX.lastIndex = 0;
    next = next.replace(VARIANT_WORD_REGEX, ' ');

    return normalizeTitleForMatching(next);
};

export const normalizeTitleForVariantGroup = (title = '') => {
    const stripped = stripVariantSignals(title);
    const full = normalizeTitleForMatching(title);
    const preferred = stripped.length >= 18 ? stripped : full;
    const tokens = preferred.split(' ').filter(Boolean);
    if (tokens.length >= 12) {
        return tokens.slice(0, 12).join(' ');
    }
    return preferred;
};

export const canonicalizeProductUrl = (url = '') => {
    try {
        const parsed = new URL(String(url).trim());
        parsed.hash = '';
        TRACKING_PARAMS.forEach((param) => parsed.searchParams.delete(param));

        const host = parsed.hostname.toLowerCase().replace(/^m\./, 'www.');
        parsed.hostname = host;

        const amazonMatch = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (amazonMatch) {
            parsed.pathname = `/dp/${amazonMatch[1].toUpperCase()}`;
            parsed.search = '';
        }

        if (host.includes('flipkart.com')) {
            const pid = parsed.searchParams.get('pid');
            parsed.search = '';
            if (pid) parsed.searchParams.set('pid', pid);
        }

        return parsed.toString().replace(/\/$/, '');
    } catch (_) {
        return '';
    }
};

export const getSourceProductId = (productUrl = '', store = '') => {
    const haystack = `${store} ${productUrl}`.toLowerCase();

    try {
        const parsed = new URL(productUrl);
        const pathname = parsed.pathname;

        if (haystack.includes('amazon')) {
            return (pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1] || '').toUpperCase();
        }

        if (haystack.includes('flipkart')) {
            return parsed.searchParams.get('pid') || pathname.match(/\/p\/itm([a-z0-9]+)/i)?.[0]?.replace('/p/', '') || '';
        }

        if (haystack.includes('myntra')) {
            return pathname.match(/\/(\d+)(?:\/buy)?\/?$/i)?.[1] || '';
        }

        if (haystack.includes('ajio')) {
            return pathname.match(/\/p\/([a-z0-9_]+)/i)?.[1] || '';
        }
    } catch (_) {
        return '';
    }

    return '';
};

export const buildDuplicateKey = ({ storeName = '', productUrl = '', title = '', sourceProductId = '' } = {}) => {
    const storeKey = trimToKey(storeName) || 'store';
    const id = sourceProductId || getSourceProductId(productUrl, storeName);
    if (id) return `${storeKey}|id:${String(id).toLowerCase()}`;

    const canonicalUrl = canonicalizeProductUrl(productUrl);
    if (canonicalUrl) return `${storeKey}|url:${canonicalUrl.toLowerCase()}`;

    const normalizedTitle = normalizeTitleForMatching(title);
    return normalizedTitle ? `${storeKey}|title:${normalizedTitle}` : '';
};

export const buildVariantGroupKey = ({ storeName = '', title = '', variantGroupKey = '' } = {}) => {
    if (variantGroupKey) return String(variantGroupKey).trim().toLowerCase();
    const storeKey = trimToKey(storeName) || 'store';
    const titleKey = normalizeTitleForVariantGroup(title);
    return titleKey ? `${storeKey}|family:${titleKey}` : '';
};

const getParentheticalVariant = (title = '') => {
    const matches = [...String(title).matchAll(/\(([^)]{2,45})\)/g)].map((match) => match[1].trim());
    return matches.reverse().find((value) => {
        VARIANT_WORD_REGEX.lastIndex = 0;
        return VARIANT_WORD_REGEX.test(value);
    }) || '';
};

const titleCaseWords = (value = '') =>
    String(value)
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

export const deriveVariantLabel = (title = '') => {
    const fromParentheses = getParentheticalVariant(title);
    if (fromParentheses) return titleCaseWords(fromParentheses);

    const normalized = String(title);
    const matches = [];
    normalized.replace(VARIANT_WORD_REGEX, (match) => {
        matches.push(match);
        return match;
    });

    const value = matches.reverse().find(Boolean) || '';
    return value ? titleCaseWords(value) : '';
};

export const detectVariantType = (label = '') => {
    const normalized = String(label).toLowerCase();
    if (/\d+\s?(?:gb|tb|mb)/i.test(normalized)) return 'Storage';
    if (/\d+\s?(?:ml|l|kg|g)|pack|set of/i.test(normalized)) return 'Pack';
    if (/^(xs|s|m|l|xl|xxl|xxxl|\d+\s?(?:inch|cm|mm))$/i.test(normalized)) return 'Size';
    if (COLOR_WORDS.some((color) => normalized.split(/\s+/).includes(color))) return 'Color';
    return 'Option';
};

export const makeVariantOptionFromDeal = (deal = {}, index = 0) => {
    const title = deal.title || '';
    const label = deal.variantLabel || deriveVariantLabel(title) || `Option ${index + 1}`;
    const type = deal.variantType || detectVariantType(label);

    return {
        id: String(deal._id || deal.id || deal.dealId || deal.duplicateKey || index),
        dealId: String(deal._id || deal.id || deal.dealId || ''),
        variantKey: String(deal.duplicateKey || deal.productUrl || deal.link || deal._id || index),
        groupKey: deal.variantGroupKey || '',
        label,
        type,
        title,
        displayTitle: deal.displayTitle || '',
        cardTitle: deal.cardTitle || '',
        image: deal.image || '',
        images: Array.isArray(deal.images) ? deal.images : [],
        price: deal.price || '',
        dealPrice: deal.dealPrice || 0,
        originalPrice: deal.originalPrice || '',
        mrp: deal.mrp || 0,
        discount: deal.discount || '',
        discountPercent: deal.discountPercent || 0,
        productUrl: deal.productUrl || '',
        link: deal.link || deal.productUrl || '',
        affiliateLink: deal.affiliateLink || '',
        affiliateOverrideLink: deal.affiliateOverrideLink || '',
        availability: deal.availability || (deal.isExpired ? 'Out of stock' : 'In stock'),
        sourceProductId: deal.sourceProductId || ''
    };
};

const getDealCompletenessScore = (deal = {}) => {
    let score = 0;
    if (deal.title) score += 10;
    if (deal.image) score += 12;
    if (Array.isArray(deal.images)) score += Math.min(deal.images.length, 6);
    if (Number(deal.dealPrice) > 0) score += 10;
    if (Number(deal.mrp) > Number(deal.dealPrice || 0)) score += 6;
    if (deal.description) score += 4;
    if (deal.productUrl) score += 4;
    if (deal.featured) score += 3;
    score += Math.min(Number(deal.views || 0) / 100, 5);
    return score;
};

export const pickBestDealRecord = (deals = []) =>
    [...deals].sort((a, b) => (
        getDealCompletenessScore(b) - getDealCompletenessScore(a)
        || new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    ))[0] || null;

const uniqueVariants = (variants = []) => {
    const seen = new Set();
    return variants.filter((variant) => {
        const key = String(variant.variantKey || variant.productUrl || variant.dealId || variant.label).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export const mergeVariantOptions = (...variantLists) =>
    uniqueVariants(variantLists.flat().filter(Boolean));

export const groupDealsIntoListings = (deals = []) => {
    const byDuplicate = new Map();

    deals.forEach((deal) => {
        const key = deal.duplicateKey || buildDuplicateKey(deal);
        const existing = byDuplicate.get(key);
        if (!existing) {
            byDuplicate.set(key, deal);
            return;
        }

        const best = pickBestDealRecord([existing, deal]);
        const duplicateVariants = mergeVariantOptions(
            existing.variants,
            deal.variants,
            [makeVariantOptionFromDeal(existing), makeVariantOptionFromDeal(deal)]
        );
        best.variants = duplicateVariants;
        byDuplicate.set(key, best);
    });

    const byVariantGroup = new Map();
    [...byDuplicate.values()].forEach((deal) => {
        const groupKey = deal.variantGroupKey || buildVariantGroupKey(deal);
        if (!groupKey) return;
        const group = byVariantGroup.get(groupKey) || [];
        group.push(deal);
        byVariantGroup.set(groupKey, group);
    });

    const listings = [];
    byVariantGroup.forEach((group) => {
        const keeper = { ...pickBestDealRecord(group) };
        const groupedVariants = group.map((deal, index) => makeVariantOptionFromDeal(deal, index));
        keeper.variants = mergeVariantOptions(keeper.variants, groupedVariants);
        listings.push(keeper);
    });

    return listings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};
