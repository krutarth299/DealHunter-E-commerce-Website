export const COUPON_OFFER_LABELS = {
    coupon: 'Coupon Code',
    deal: 'Instant Deal',
    cashback: 'Cashback',
    bank: 'Bank Offer',
    app: 'App Only',
    'new-user': 'New User',
    wallet: 'Wallet / UPI',
    sale: 'Sale Offer'
};

export const getStoreSlug = (store = '') => (
    String(store || 'store')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'store'
);

export const normalizeCouponForUi = (coupon = {}) => {
    const store = String(coupon.store || coupon.storeName || 'Online Store').trim();
    const offerType = String(coupon.offerType || coupon.type || 'coupon').trim().toLowerCase();
    const expiryDate = coupon.expiryDate ? new Date(coupon.expiryDate) : null;
    const now = Date.now();
    const isExpired = Boolean(expiryDate && Number.isFinite(expiryDate.getTime()) && expiryDate.getTime() < now);

    return {
        ...coupon,
        _id: coupon._id || coupon.id,
        id: coupon.id || coupon._id,
        title: String(coupon.title || '').trim(),
        description: String(coupon.description || '').trim(),
        code: String(coupon.code || '').trim().toUpperCase(),
        offerType,
        offerLabel: COUPON_OFFER_LABELS[offerType] || 'Offer',
        store,
        storeSlug: coupon.storeSlug || getStoreSlug(store),
        category: coupon.category || 'Multi-category',
        affiliateUrl: String(coupon.affiliateUrl || coupon.revealUrl || '').trim(),
        landingUrl: String(coupon.landingUrl || coupon.url || '').trim(),
        revealUrl: String(coupon.revealUrl || coupon.affiliateUrl || coupon.landingUrl || '').trim(),
        expiryDate: coupon.expiryDate || '',
        expiryTimestamp: expiryDate && Number.isFinite(expiryDate.getTime()) ? expiryDate.getTime() : 0,
        isExpired,
        isActive: coupon.isActive !== false && coupon.status !== 'inactive' && !isExpired,
        isVerified: coupon.isVerified !== false,
        verifiedAt: coupon.verifiedAt || coupon.updatedAt || coupon.createdAt,
        isFeatured: Boolean(coupon.isFeatured || coupon.featured),
        isTrending: Boolean(coupon.isTrending || coupon.trending),
        status: isExpired ? 'expired' : coupon.status || 'active',
        terms: String(coupon.terms || '').trim(),
        usageCount: Number(coupon.usageCount || coupon.popularity || 0) || 0,
        successRate: Number(coupon.successRate || 0) || 0
    };
};

export const normalizeCouponsForUi = (coupons = []) => (
    (Array.isArray(coupons) ? coupons : [])
        .map(normalizeCouponForUi)
        .filter((coupon) => coupon.title && coupon.store)
);

export const getCouponActionLabel = (coupon = {}, revealed = false) => {
    if (coupon.offerType === 'cashback') return 'Activate Cashback';
    if (coupon.offerType === 'deal' || !coupon.code) return 'Get Deal';
    return revealed ? 'Copy Code' : 'Reveal Code';
};

export const formatCouponTime = (stamp) => {
    if (!stamp) return 'verified recently';
    const time = new Date(stamp).getTime();
    if (!Number.isFinite(time)) return 'verified recently';
    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (minutes < 2) return 'verified just now';
    if (minutes < 60) return `verified ${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `verified ${hours}h ago`;
    return `verified ${Math.round(hours / 24)}d ago`;
};

export const formatCouponExpiry = (stamp) => {
    if (!stamp) return 'No published expiry';
    const time = new Date(stamp).getTime();
    if (!Number.isFinite(time)) return 'No published expiry';
    const days = Math.ceil((time - Date.now()) / 86400000);
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
};

export const copyText = async (text = '') => {
    const value = String(text || '').trim();
    if (!value) return false;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
    }

    return false;
};
