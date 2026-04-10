import { detectStoreName } from './deal-normalizer.js';

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

export const getMockAffiliateSettings = (appLocals) => {
    if (!appLocals.affiliateSettings) {
        appLocals.affiliateSettings = [];
    }
    return appLocals.affiliateSettings;
};

export const getAffiliateSettings = async (AffiliateSettingModel, isMockMode, appLocals) => {
    if (isMockMode) {
        return getMockAffiliateSettings(appLocals);
    }

    const stored = await AffiliateSettingModel.find().lean();
    return stored
        .map(normalizeAffiliateSetting)
        .sort((a, b) => a.store.localeCompare(b.store));
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

const findAffiliateRule = (store, settings = []) => {
    const storeName = normalizeStoreName(store);
    const normalizedSettings = settings.map(normalizeAffiliateSetting);
    return normalizedSettings.find((setting) => setting.store === storeName)
        || normalizedSettings.find((setting) => setting.store === 'Generic')
        || null;
};

const patternMatchesUrl = (pattern = '', originalUrl = '') => {
    const safePattern = String(pattern || '').trim().toLowerCase();
    if (!safePattern) return true;
    return String(originalUrl || '').toLowerCase().includes(safePattern);
};

export const buildAffiliateLink = ({ originalUrl = '', store = '', settings = [], manualOverride = '' }) => {
    const original = sanitizeOriginalUrl(originalUrl);
    if (!original) return '';

    const override = String(manualOverride || '').trim();
    if (override && isValidHttpUrl(override)) {
        return override;
    }

    const rule = findAffiliateRule(store, settings);
    if (!rule?.enabled || !rule.paramKey || !rule.paramValue || !patternMatchesUrl(rule.urlPattern, original)) {
        return original;
    }

    try {
        const url = new URL(original);
        [...url.searchParams.keys()].forEach((key) => {
            if (key.toLowerCase() === rule.paramKey.toLowerCase()) {
                url.searchParams.delete(key);
            }
        });
        url.searchParams.set(rule.paramKey, rule.paramValue);
        return url.toString();
    } catch {
        return original;
    }
};

export const syncAffiliateSettingsWithStores = async (AffiliateSettingModel, DealModel, isMockMode, appLocals) => {
    const existingSettings = isMockMode
        ? getMockAffiliateSettings(appLocals)
        : await AffiliateSettingModel.find().lean();
    const bySlug = new Map(existingSettings.map((setting) => {
        const normalized = normalizeAffiliateSetting(setting);
        return [normalized.storeSlug, normalized];
    }));

    if (!isMockMode) {
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
    }

    let rawStoreNames = [];

    if (isMockMode) {
        const mockDeals = Array.isArray(appLocals.deals) ? appLocals.deals : [];
        rawStoreNames = mockDeals.flatMap((deal) => [deal.storeName, deal.store]);
    } else if (DealModel) {
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

    const now = new Date();
    const missingSettings = discoveredStores
        .map((store) => buildDefaultAffiliateSetting(store))
        .filter((setting) => !bySlug.has(setting.storeSlug));

    if (isMockMode) {
        appLocals.affiliateSettings = [
            ...existingSettings.map(normalizeAffiliateSetting),
            ...missingSettings
        ].sort((a, b) => a.store.localeCompare(b.store));
    } else if (missingSettings.length > 0) {
        await Promise.all(missingSettings.map((setting) =>
            AffiliateSettingModel.findOneAndUpdate(
                { storeSlug: setting.storeSlug },
                {
                    $setOnInsert: {
                        ...setting,
                        lastSyncedAt: now
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
        ));
    }

    return {
        discoveredStores,
        created: missingSettings.length
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
