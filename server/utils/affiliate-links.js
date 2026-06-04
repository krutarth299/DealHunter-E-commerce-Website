import { detectStoreName } from './deal-normalizer.js';
import { AFFILIATE_STORE_SOURCES } from '../config/storeSources.js';

const KNOWN_AFFILIATE_KEYS = [
    'tag',
    'affextparam',
    'affid',
    'aff_id',
    'affiliate',
    'aff',
    'ref',
    'refid'
];

export const normalizeStoreName = (store = '') => {
    const trimmed = String(store || '').trim();
    if (!trimmed) return 'Generic';
    return trimmed.toLowerCase() === 'generic'
        ? 'Generic'
        : detectStoreName(trimmed);
};

export const getStoreSlug = (store = '') => (
    normalizeStoreName(store)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'generic'
);

const normalizeAffiliateSetting = (setting = {}) => {
    const store = normalizeStoreName(setting.store || setting.storeName);
    return {
        store,
        storeSlug: String(setting.storeSlug || getStoreSlug(store)).trim().toLowerCase(),
        enabled: Boolean(setting.enabled),
        paramKey: String(setting.paramKey || setting.parameterKey || '').trim(),
        paramValue: String(setting.paramValue || setting.parameterValue || '').trim(),
        urlPattern: String(setting.urlPattern || '').trim(),
        notes: String(setting.notes || '').trim(),
        discoveredFromDeals: setting.discoveredFromDeals !== false,
        pendingSetup: !setting.enabled || !String(setting.paramKey || setting.parameterKey || '').trim() || !String(setting.paramValue || setting.parameterValue || '').trim()
    };
};

export const buildDefaultAffiliateSetting = (store = '') => normalizeAffiliateSetting({
    store,
    enabled: false,
    paramKey: '',
    paramValue: '',
    urlPattern: '',
    notes: '',
    discoveredFromDeals: true
});



let settingsCache = null;
let settingsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getAffiliateSettings = async (AffiliateSettingModel, isMockMode, appLocals) => {
    const now = Date.now();
    if (settingsCache && (now - settingsCacheTime < CACHE_TTL) && !appLocals?.affiliateSettingsSyncMeta?.forceRefresh) {
        return settingsCache;
    }

    const stored = await AffiliateSettingModel.find().lean();
    settingsCache = stored
        .map(normalizeAffiliateSetting)
        .sort((a, b) => a.store.localeCompare(b.store));
    settingsCacheTime = now;
    
    if (appLocals?.affiliateSettingsSyncMeta) {
         appLocals.affiliateSettingsSyncMeta.forceRefresh = false;
    }
    
    return settingsCache;
};

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

const findAffiliateRule = (store, settings = [], productUrl = '') => {
    const safeSettings = Array.isArray(settings) ? settings : [];
    const storeName = normalizeStoreName(store) || detectStoreName('', productUrl);
    const normalizedSettings = safeSettings.map(normalizeAffiliateSetting);
    
    // Exact match
    let rule = normalizedSettings.find((setting) => setting.store === storeName);
    
    // Fallback match by slug
    if (!rule) {
        const slug = getStoreSlug(storeName);
        rule = normalizedSettings.find((setting) => setting.storeSlug === slug);
    }
    
    return rule || normalizedSettings.find((setting) => setting.store === 'Generic') || null;
};

const patternMatchesUrl = (pattern = '', originalUrl = '') => {
    const safePattern = String(pattern || '').trim().toLowerCase();
    if (!safePattern) return true;
    return String(originalUrl || '').toLowerCase().includes(safePattern);
};

/**
 * Builds an affiliate link by appending the correct parameter to the product URL.
 * Handles existing query parameters and prevents duplicates.
 */
export const generateAffiliateUrl = (productUrl = '', store = '', settings = []) => {
    // 1. Sanitize the URL (removes existing known affiliate tags)
    const original = sanitizeOriginalUrl(productUrl);
    if (!original) return '';

    // 2. Find matching rule for this store
    const safeSettings = Array.isArray(settings) ? settings : [];
    const rule = findAffiliateRule(store, safeSettings, original);
    
    // 3. If no rule found or rule is disabled, return sanitized original
    if (!rule?.enabled || !rule.paramKey || !rule.paramValue) {
        return original;
    }

    // 4. Amazon Specific: Force "tag" if it's Amazon
    const storeName = String(store || '').toLowerCase();
    const isAmazon = storeName.includes('amazon');
    const finalParamKey = isAmazon ? 'tag' : rule.paramKey;

    try {
        const url = new URL(original);
        
        // 5. Clean existing occurrences of THIS specific param to avoid duplicates
        const lowerKey = finalParamKey.toLowerCase();
        [...url.searchParams.keys()].forEach((key) => {
            if (key.toLowerCase() === lowerKey) {
                url.searchParams.delete(key);
            }
        });

        // 6. Set the new affiliate parameter
        url.searchParams.set(finalParamKey, rule.paramValue);
        
        return url.toString();
    } catch (err) {
        console.error('[AffiliateLinks] URL parsing failed:', err.message);
        // Fallback to manual string manipulation
        const separator = original.includes('?') ? '&' : '?';
        return `${original}${separator}${finalParamKey}=${rule.paramValue}`;
    }
};

// Maintain buildAffiliateLink as an alias for backward compatibility
export const buildAffiliateLink = ({ originalUrl = '', store = '', settings = [], manualOverride = '' }) => {
    const override = String(manualOverride || '').trim();
    if (override && isValidHttpUrl(override)) {
        return override;
    }
    return generateAffiliateUrl(originalUrl, store, settings);
};

export const syncAffiliateSettingsWithStores = async (AffiliateSettingModel, DealModel, isMockMode, appLocals) => {
    const now = Date.now();
    const ttlMs = Number(process.env.AFFILIATE_SYNC_TTL_MS || 5 * 60 * 1000);
    const lastSyncAt = Number(appLocals?.affiliateSettingsSyncMeta?.lastCompletedAt || 0);
    const forceSync = Boolean(appLocals?.affiliateSettingsSyncMeta?.forceRefresh);

    if (!forceSync && lastSyncAt && now - lastSyncAt < ttlMs) {
        return {
            discoveredStores: appLocals?.affiliateSettingsSyncMeta?.discoveredStores || [],
            created: 0,
            skipped: true,
            lastCompletedAt: lastSyncAt
        };
    }

    const existingSettings = await AffiliateSettingModel.find().lean();
    const bySlug = new Map(existingSettings.map((setting) => {
        const normalized = normalizeAffiliateSetting(setting);
        return [normalized.storeSlug, normalized];
    }));

    const slugBackfills = existingSettings
        .map((setting) => {
            const normalized = normalizeAffiliateSetting(setting);
            const currentSlug = String(setting.storeSlug || '').trim().toLowerCase();

            if (currentSlug === normalized.storeSlug) return null;

            return {
                updateOne: {
                    filter: setting._id ? { _id: setting._id } : { store: setting.store },
                    update: { $set: { storeSlug: normalized.storeSlug } }
                }
            };
        })
        .filter(Boolean);

    if (slugBackfills.length) {
        await AffiliateSettingModel.bulkWrite(slugBackfills);
    }

    let rawStoreNames = [];

    if (DealModel) {
        const [storeNames, stores] = await Promise.all([
            DealModel.distinct('storeName'),
            DealModel.distinct('store')
        ]);
        rawStoreNames = [...storeNames, ...stores];
    }

    const discoveredStores = [...new Set(rawStoreNames
        .map((store) => normalizeStoreName(store))
        .filter((store) => store && store !== 'Generic' && store !== 'Online Store')
    )].sort((a, b) => a.localeCompare(b));

    const activeSlugs = new Set(discoveredStores.map(s => getStoreSlug(s)));
    
    const extraSettingIds = existingSettings
        .filter(s => !activeSlugs.has(getStoreSlug(s.store || s.storeName)))
        .map(s => s._id);

    if (extraSettingIds.length > 0) {
        await AffiliateSettingModel.deleteMany({ _id: { $in: extraSettingIds } });
        existingSettings.forEach(s => {
            if (extraSettingIds.includes(s._id)) {
                bySlug.delete(getStoreSlug(s.store || s.storeName));
            }
        });
    }

    const syncTimestamp = new Date();
    const missingSettings = discoveredStores
        .map((store) => buildDefaultAffiliateSetting(store))
        .filter((setting) => !bySlug.has(setting.storeSlug));

    if (missingSettings.length > 0) {
        await Promise.all(missingSettings.map((setting) =>
            AffiliateSettingModel.findOneAndUpdate(
                { storeSlug: setting.storeSlug },
                {
                    $setOnInsert: {
                        ...setting,
                        lastSyncedAt: syncTimestamp
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
        ));
    }

    if (appLocals) {
        appLocals.affiliateSettingsSyncMeta = {
            lastCompletedAt: Date.now(),
            discoveredStores,
            forceRefresh: false
        };
    }

    return {
        discoveredStores,
        created: missingSettings.length
    };
};

export const markAffiliateSettingsSyncDirty = (appLocals = {}) => {
    appLocals.affiliateSettingsSyncMeta = {
        ...(appLocals.affiliateSettingsSyncMeta || {}),
        forceRefresh: true
    };
};

export const applyAffiliateSettingsToDeal = ({ deal = {}, settings = [] }) => {
    const plainDeal = typeof deal?.toObject === 'function'
        ? deal.toObject()
        : (deal && deal._doc && typeof deal._doc === 'object'
            ? { ...deal._doc, ...deal }
            : deal);

    const productUrl = sanitizeOriginalUrl(plainDeal.productUrl || plainDeal.originalLink || plainDeal.link || '');
    const store = detectStoreName(plainDeal.storeName || plainDeal.store, productUrl);
    const affiliateOverrideLink = String(plainDeal.affiliateOverrideLink || '').trim();
    const affiliateLink = buildAffiliateLink({
        originalUrl: productUrl,
        store,
        settings,
        manualOverride: affiliateOverrideLink
    });

    return {
        ...plainDeal,
        store,
        storeName: store,
        productUrl,
        affiliateOverrideLink,
        affiliateLink,
        link: affiliateLink || productUrl
    };
};

export const reapplyAffiliateSettingsToDeals = async (DealModel, settings = [], store = null) => {
    const normalizedStore = store ? normalizeStoreName(store) : null;
    const query = normalizedStore
        ? { $or: [{ store: normalizedStore }, { storeName: normalizedStore }] }
        : {};

    const deals = await DealModel.find(query).lean();
    if (!deals.length) return { updated: 0, scanned: 0 };

    const operations = deals.map((deal) => {
        const nextDeal = applyAffiliateSettingsToDeal({ deal, settings });
        const changed = String(deal.link || '') !== String(nextDeal.link || '')
            || String(deal.productUrl || '') !== String(nextDeal.productUrl || '')
            || String(deal.affiliateOverrideLink || '') !== String(nextDeal.affiliateOverrideLink || '')
            || String(deal.affiliateLink || '') !== String(nextDeal.affiliateLink || '')
            || String(deal.store || '') !== String(nextDeal.store || '')
            || String(deal.storeName || '') !== String(nextDeal.storeName || '');

        if (!changed) return null;

        return {
            updateOne: {
                filter: { _id: deal._id },
                update: {
                        $set: {
                            store: nextDeal.store,
                            storeName: nextDeal.storeName,
                            productUrl: nextDeal.productUrl,
                            affiliateOverrideLink: nextDeal.affiliateOverrideLink,
                            affiliateLink: nextDeal.affiliateLink,
                            link: nextDeal.link
                        }
                }
            }
        };
    }).filter(Boolean);

    if (operations.length) {
        await DealModel.bulkWrite(operations);
    }

    return { scanned: deals.length, updated: operations.length };
};
