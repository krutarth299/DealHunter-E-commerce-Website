import express from 'express';
import AffiliateSetting from '../models/AffiliateSetting.js';
import Deal from '../models/Deal.js';
import {
    getAffiliateSettings,
    getMockAffiliateSettings,
    getStoreSlug,
    normalizeStoreName,
    reapplyAffiliateSettingsToDeals,
    syncAffiliateSettingsWithStores
} from '../utils/affiliate-links.js';

const router = express.Router();

router.get('/affiliate-settings', async (req, res) => {
    try {
        await syncAffiliateSettingsWithStores(AffiliateSetting, Deal, req.app.locals.isMockMode, req.app.locals);
        const settings = await getAffiliateSettings(AffiliateSetting, req.app.locals.isMockMode, req.app.locals);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load affiliate settings' });
    }
});

const normalizeAffiliatePayload = (settings = []) => {
    const bySlug = new Map();

    settings.forEach((setting) => {
        const store = normalizeStoreName(setting.store || setting.storeName);
        if (!store || store === 'Generic') return;

        const normalized = {
            store,
            storeSlug: getStoreSlug(store),
            enabled: Boolean(setting.enabled),
            paramKey: String(setting.paramKey || setting.parameterKey || '').trim(),
            paramValue: String(setting.paramValue || setting.parameterValue || '').trim(),
            urlPattern: String(setting.urlPattern || '').trim(),
            notes: String(setting.notes || '').trim(),
            discoveredFromDeals: setting.discoveredFromDeals !== false,
            lastSyncedAt: new Date()
        };

        bySlug.set(normalized.storeSlug, normalized);
    });

    return [...bySlug.values()].sort((a, b) => a.store.localeCompare(b.store));
};

router.put('/affiliate-settings', async (req, res) => {
    try {
        await syncAffiliateSettingsWithStores(AffiliateSetting, Deal, req.app.locals.isMockMode, req.app.locals);
        const payload = Array.isArray(req.body?.settings) ? req.body.settings : [];
        const normalizedSettings = normalizeAffiliatePayload(payload);

        if (req.app.locals.isMockMode) {
            req.app.locals.affiliateSettings = normalizedSettings;
            res.json({
                settings: getMockAffiliateSettings(req.app.locals),
                reapply: { scanned: 0, updated: 0 }
            });
            return;
        }

        await Promise.all(normalizedSettings.map((setting) =>
            AffiliateSetting.findOneAndUpdate(
                { $or: [{ storeSlug: setting.storeSlug }, { store: setting.store }] },
                { $set: setting },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
        ));

        const settings = await getAffiliateSettings(AffiliateSetting, false, req.app.locals);
        const reapply = await reapplyAffiliateSettingsToDeals(Deal, settings);

        res.json({ settings, reapply });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Failed to save affiliate settings' });
    }
});

export default router;
