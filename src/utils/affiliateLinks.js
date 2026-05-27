import { detectStoreName } from './dealUi';

const KNOWN_AFFILIATE_KEYS = ['tag', 'affextparam', 'affid', 'aff_id', 'affiliate', 'aff', 'ref', 'refid'];

export const sanitizeOriginalUrl = (rawUrl = '') => {
    const value = String(rawUrl || '').trim();
    if (!value) return '';

    try {
        const url = new URL(value);
        [...url.searchParams.keys()].forEach((key) => {
            if (KNOWN_AFFILIATE_KEYS.includes(key.toLowerCase())) {
                url.searchParams.delete(key);
            }
        });
        return url.toString();
    } catch {
        return value;
    }
};

export const isValidHttpUrl = (rawUrl = '') => {
    try {
        const url = new URL(String(rawUrl || '').trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

export const buildAffiliateUrl = ({ url = '', store = '', settings = [], manualOverride = '' }) => {
    const originalUrl = sanitizeOriginalUrl(url);
    if (!originalUrl) return '';

    const override = String(manualOverride || '').trim();
    if (override && isValidHttpUrl(override)) {
        return override;
    }

    // Safety check for settings
    const safeSettings = Array.isArray(settings) ? settings : [];
    const detectedStore = detectStoreName(store, originalUrl);
    
    // Find rule: prioritize exact store match, then pattern match
    const rule = safeSettings.find((setting) => setting.store === detectedStore)
        || safeSettings.find((setting) => (
            setting.urlPattern
            && originalUrl.toLowerCase().includes(String(setting.urlPattern).toLowerCase())
        ))
        || safeSettings.find((setting) => setting.store === 'Generic')
        || null;

    if (
        !rule?.enabled
        || !rule.paramKey
        || !rule.paramValue
    ) {
        return originalUrl;
    }

    // Optional pattern check for the matched rule
    if (
        rule.urlPattern
        && !originalUrl.toLowerCase().includes(String(rule.urlPattern).toLowerCase())
    ) {
        return originalUrl;
    }

    try {
        const parsedUrl = new URL(originalUrl);
        const lowerKey = String(rule.paramKey).toLowerCase();
        
        // Clear existing to avoid duplicates
        [...parsedUrl.searchParams.keys()].forEach((key) => {
            if (key.toLowerCase() === lowerKey) {
                parsedUrl.searchParams.delete(key);
            }
        });

        parsedUrl.searchParams.set(rule.paramKey, rule.paramValue);
        return parsedUrl.toString();
    } catch {
        // Fallback for invalid URLs that passed earlier checks
        const separator = originalUrl.includes('?') ? '&' : '?';
        if (originalUrl.toLowerCase().includes(`${rule.paramKey.toLowerCase()}=`)) return originalUrl;
        return `${originalUrl}${separator}${rule.paramKey}=${rule.paramValue}`;
    }
};

export const resolveBuyLink = (deal = {}, settings = []) => {
    const safeSettings = Array.isArray(settings) ? settings : [];
    return String(
        deal.affiliateLink
        || buildAffiliateUrl({
            url: deal.productUrl || deal.link || '',
            store: deal.storeName || deal.store || '',
            settings: safeSettings,
            manualOverride: deal.affiliateOverrideLink
        })
        || deal.link
        || deal.productUrl
        || ''
    ).trim();
};
