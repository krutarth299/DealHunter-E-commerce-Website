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

    if (!rule?.enabled || !rule.paramValue) {
        return originalUrl;
    }

    const isPrefixValue = String(rule.paramValue || '').trim().toLowerCase().startsWith('http');
    
    if (!rule.paramKey && !isPrefixValue) {
        return originalUrl;
    }

    // Optional pattern check for the matched rule
    if (
        rule.urlPattern
        && !originalUrl.toLowerCase().includes(String(rule.urlPattern).toLowerCase())
    ) {
        return originalUrl;
    }

    const lowerKey = String(rule.paramKey || '').toLowerCase().trim();

    if (lowerKey === 'prefix' || lowerKey === 'link' || (!lowerKey && isPrefixValue)) {
        return `${String(rule.paramValue).trim()}${encodeURIComponent(originalUrl)}`;
    }
    
    if (lowerKey === 'prefix-raw' || lowerKey === 'link-raw') {
        return `${String(rule.paramValue).trim()}${originalUrl}`;
    }

    if (!rule.paramKey) {
        return originalUrl; // Fallback if no valid key and not a prefix
    }

    try {
        const parsedUrl = new URL(originalUrl);
        
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
        const hashIndex = originalUrl.indexOf('#');
        let baseUrl = originalUrl;
        let hash = '';
        if (hashIndex !== -1) {
            baseUrl = originalUrl.substring(0, hashIndex);
            hash = originalUrl.substring(hashIndex);
        }
        const separator = baseUrl.includes('?') ? '&' : '?';
        if (baseUrl.toLowerCase().includes(`${rule.paramKey.toLowerCase()}=`)) return originalUrl;
        return `${baseUrl}${separator}${rule.paramKey}=${rule.paramValue}${hash}`;
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
