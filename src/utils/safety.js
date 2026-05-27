/**
 * Enterprise-level Defensive Utilities
 * Prevents null/undefined runtime crashes across the application.
 */

/**
 * Ensures the value is always an array.
 * @param {any} arr 
 * @returns {Array}
 */
export const safeArray = (arr) => {
    if (Array.isArray(arr)) return arr;
    if (!arr) return [];
    console.warn('[DEFENSIVE_INIT] Expected array, got:', typeof arr);
    return [];
};

/**
 * Ensures the value is a safe object with fallback.
 * @param {any} obj 
 * @param {Object} fallback 
 * @returns {Object}
 */
export const safeObject = (obj, fallback = {}) => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    return fallback;
};

/**
 * Ensures the value is a safe string.
 * @param {any} str 
 * @param {string} fallback 
 * @returns {string}
 */
export const safeString = (str, fallback = '') => {
    if (typeof str === 'string') return str;
    if (str === null || str === undefined) return fallback;
    return String(str);
};

/**
 * Safely accesses a property with optional chaining and fallback.
 * Equivalent to obj?.prop || fallback but with logging.
 */
export const safeAccess = (obj, path, fallback = '') => {
    try {
        const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
        return value !== undefined && value !== null ? value : fallback;
    } catch (e) {
        console.warn(`[DEFENSIVE_ACCESS] Failed to access ${path}:`, e.message);
        return fallback;
    }
};

/**
 * Validates a deal object and returns a safe version with all required fields.
 */
export const normalizeAdminDeal = (deal) => {
    if (!deal || typeof deal !== 'object') {
        return {
            _id: '', id: '', title: 'Untitled Deal', productUrl: '', imageUrl: '', 
            affiliateLink: '', store: '', category: '', dealPrice: '', mrp: '', 
            discount: '', images: [], pricing: {}
        };
    }

    return {
        _id: safeString(deal._id || deal.id),
        id: safeString(deal.id || deal._id),
        title: safeString(deal.title || deal.displayTitle, 'Untitled Deal'),
        productUrl: safeString(deal.productUrl || deal.link),
        imageUrl: safeString(deal.imageUrl || deal.image),
        images: safeArray(deal.images || (deal.image ? [deal.image] : [])),
        affiliateLink: safeString(deal.affiliateLink || deal.affiliateOverrideLink),
        store: safeString(deal.store || deal.storeName, 'Unknown Store'),
        category: safeString(deal.category, 'General'),
        dealPrice: safeString(deal.dealPrice || deal.pricing?.dealPrice),
        mrp: safeString(deal.mrp || deal.pricing?.mrp),
        discount: safeString(deal.discount || deal.discountPercent),
        ...deal // Preserve other fields but ensure the above are safe
    };
};

export default {
    safeArray,
    safeObject,
    safeString,
    safeAccess,
    normalizeAdminDeal
};
