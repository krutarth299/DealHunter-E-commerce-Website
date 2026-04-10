import { detectStoreName } from './deal-normalizer.js';

export const COUPON_OFFER_TYPES = ['coupon', 'deal', 'cashback', 'bank', 'app', 'new-user', 'wallet', 'sale'];

export const getStoreSlug = (store = '') => (
    String(store || 'store')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'store'
);

const titleCase = (value = '') => (
    String(value || '')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
);

export const normalizeCouponStore = (store = '', url = '') => {
    const detected = detectStoreName(store, url);
    return detected === 'Online Store' && store ? titleCase(store) : detected;
};

const parseDateOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
};

const normalizeOfferType = (value = '') => {
    const normalized = String(value || 'coupon').trim().toLowerCase().replace(/[_\s]+/g, '-');
    return COUPON_OFFER_TYPES.includes(normalized) ? normalized : 'coupon';
};

export const normalizeCouponTitle = (value = '') => (
    String(value || '')
        .toLowerCase()
        .replace(/&amp;/g, ' and ')
        .replace(/[^a-z0-9%₹$]+/g, ' ')
        .replace(/\b(?:coupon|promo\s*code|offer|deal|sale|discount)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
);

const canonicalCouponUrl = (rawUrl = '') => {
    try {
        const url = new URL(String(rawUrl || '').trim());
        [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'msclkid', 'tag', 'affid', 'aff_id', 'affiliate', 'ref'
        ].forEach((key) => url.searchParams.delete(key));
        url.hash = '';
        return url.toString().replace(/\/$/, '');
    } catch {
        return String(rawUrl || '').trim();
    }
};

export const buildCouponDuplicateKey = (payload = {}) => {
    const store = normalizeCouponStore(payload.store || payload.storeName, payload.affiliateUrl || payload.landingUrl);
    const storeSlug = getStoreSlug(store);
    const code = String(payload.code || '').trim().toUpperCase();
    const title = normalizeCouponTitle(payload.title);
    const url = canonicalCouponUrl(payload.landingUrl || payload.affiliateUrl);
    const offerType = normalizeOfferType(payload.offerType || payload.type);
    const expiry = parseDateOrNull(payload.expiryDate);
    const expiryPart = expiry ? expiry.toISOString().slice(0, 10) : 'no-expiry';

    if (storeSlug && code) return `${storeSlug}|code:${code}`;
    if (storeSlug && url && title) return `${storeSlug}|url:${url}|title:${title.slice(0, 80)}`;
    if (storeSlug && title) return `${storeSlug}|${offerType}|title:${title.slice(0, 100)}|expiry:${expiryPart}`;
    return '';
};

export const isCouponActive = (coupon = {}) => {
    if (coupon.status !== 'active') return false;
    const expiry = parseDateOrNull(coupon.expiryDate);
    return !expiry || expiry.getTime() >= Date.now();
};

export const normalizeCouponPayload = (payload = {}) => {
    const landingUrl = String(payload.landingUrl || payload.url || payload.link || '').trim();
    const affiliateUrl = String(payload.affiliateUrl || payload.redirectUrl || '').trim();
    const store = normalizeCouponStore(payload.store || payload.storeName, affiliateUrl || landingUrl);
    const title = String(payload.title || '').replace(/\s+/g, ' ').trim();
    const verifiedAt = parseDateOrNull(payload.verifiedAt) || new Date();
    const expiryDate = parseDateOrNull(payload.expiryDate);

    const normalizedTitle = normalizeCouponTitle(title);
    const normalizedPayload = {
        title,
        description: String(payload.description || '').replace(/\s+/g, ' ').trim(),
        code: String(payload.code || '').trim().toUpperCase(),
        offerType: normalizeOfferType(payload.offerType || payload.type),
        store,
        storeSlug: getStoreSlug(store),
        category: String(payload.category || 'Multi-category').trim() || 'Multi-category',
        affiliateUrl,
        landingUrl,
        cashbackValue: String(payload.cashbackValue || payload.cashback || '').trim(),
        discountValue: String(payload.discountValue || payload.discount || '').trim(),
        expiryDate,
        isVerified: payload.isVerified !== false,
        verifiedAt,
        isFeatured: Boolean(payload.isFeatured || payload.featured),
        isTrending: Boolean(payload.isTrending || payload.trending),
        status: String(payload.status || 'active').trim().toLowerCase() === 'inactive'
            ? 'inactive'
            : expiryDate && expiryDate.getTime() < Date.now()
                ? 'expired'
                : String(payload.status || 'active').trim().toLowerCase() === 'expired'
                    ? 'expired'
                    : 'active',
        terms: String(payload.terms || '').trim(),
        successRate: Math.max(0, Math.min(100, Number(payload.successRate || 0) || 0)),
        usageCount: Math.max(0, Number(payload.usageCount || 0) || 0),
        popularity: Math.max(0, Number(payload.popularity || payload.usageCount || 0) || 0),
        sourceUrl: String(payload.sourceUrl || '').trim(),
        sourceType: String(payload.sourceType || '').trim() || 'manual',
        sourceStoreId: String(payload.sourceStoreId || '').trim(),
        duplicateKey: String(payload.duplicateKey || '').trim().toLowerCase(),
        normalizedTitle,
        autoFetched: Boolean(payload.autoFetched),
        fetchedAt: parseDateOrNull(payload.fetchedAt),
        lastSeenAt: parseDateOrNull(payload.lastSeenAt),
        scanBatchId: String(payload.scanBatchId || '').trim(),
        lastFetchStatus: String(payload.lastFetchStatus || '').trim(),
        lastFetchError: String(payload.lastFetchError || '').trim(),
        isAppOnly: Boolean(payload.isAppOnly),
        isNewUserOnly: Boolean(payload.isNewUserOnly),
        bankName: String(payload.bankName || '').trim(),
        paymentMethod: String(payload.paymentMethod || '').trim(),
        reviewStatus: String(payload.reviewStatus || 'approved').trim().toLowerCase() === 'pending'
            ? 'pending'
            : String(payload.reviewStatus || 'approved').trim().toLowerCase() === 'rejected'
                ? 'rejected'
                : 'approved'
    };

    normalizedPayload.duplicateKey = normalizedPayload.duplicateKey || buildCouponDuplicateKey(normalizedPayload);

    return normalizedPayload;
};

export const normalizeCouponForResponse = (coupon = {}) => {
    const plain = typeof coupon.toObject === 'function' ? coupon.toObject() : coupon;
    const id = String(plain._id || plain.id || '');
    const normalized = normalizeCouponPayload(plain);

    return {
        ...plain,
        ...normalized,
        _id: id || plain._id,
        id: id || plain.id,
        isActive: isCouponActive({ ...plain, ...normalized }),
        revealUrl: normalized.affiliateUrl || normalized.landingUrl,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
    };
};
