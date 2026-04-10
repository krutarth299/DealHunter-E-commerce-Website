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

    const detectedStore = detectStoreName(store, originalUrl);
    const rule = settings.find((setting) => (
        setting.store === detectedStore
        || (
            setting.urlPattern
            && originalUrl.toLowerCase().includes(String(setting.urlPattern).toLowerCase())
        )
    ))
        || settings.find((setting) => setting.store === 'Generic')
        || null;

    if (
        !rule?.enabled
        || !rule.paramKey
        || !rule.paramValue
        || (
            rule.urlPattern
            && !originalUrl.toLowerCase().includes(String(rule.urlPattern).toLowerCase())
        )
    ) {
        return originalUrl;
    }

    try {
        const parsedUrl = new URL(originalUrl);
        [...parsedUrl.searchParams.keys()].forEach((key) => {
            if (key.toLowerCase() === String(rule.paramKey).toLowerCase()) {
                parsedUrl.searchParams.delete(key);
            }
        });
        parsedUrl.searchParams.set(rule.paramKey, rule.paramValue);
        return parsedUrl.toString();
    } catch {
        return originalUrl;
    }
};

export const resolveBuyLink = (deal = {}, settings = []) =>
    String(
        deal.affiliateLink
        || buildAffiliateUrl({
            url: deal.productUrl || deal.link || '',
            store: deal.storeName || deal.store || '',
            settings,
            manualOverride: deal.affiliateOverrideLink
        })
        || deal.link
        || deal.productUrl
        || ''
    ).trim();
