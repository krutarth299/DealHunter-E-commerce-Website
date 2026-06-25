import express from 'express';
import AffiliateSetting from '../models/AffiliateSetting.js';
import Deal from '../models/Deal.js';
import {
    getAffiliateSettings,
    getStoreSlug,
    markAffiliateSettingsSyncDirty,
    normalizeStoreName,
    reapplyAffiliateSettingsToDeals,
    syncAffiliateSettingsWithStores
} from '../utils/affiliate-links.js';

import storesRouter from './stores.js';
import { groupDealsIntoListings } from '../utils/product-identity.js';
import { getSitemapData, triggerSitemapUpdate } from './sitemap.js';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);

const router = express.Router();

// Forward stats and stores requests if they land on /api/admin directly
// (though they are also handled by specific mounts in index.js)

router.get('/stats', async (req, res) => {
    try {

        const [
            totalDeals,
            activeDeals,
            totalCategories,
            totalStores,
            featuredDeals,
            avgDiscountResult,
            topClickedDeals,
            dupGroupsResult,
            incompleteDeals
        ] = await Promise.all([
            Deal.countDocuments({}),
            Deal.countDocuments({ isExpired: { $ne: true } }),
            Deal.distinct('category').then(cats => cats.filter(Boolean).length),
            Deal.distinct('storeName').then(stores => stores.filter(Boolean).length),
            Deal.countDocuments({ featured: true }),
            Deal.aggregate([
                { $match: { isExpired: { $ne: true }, discountPercent: { $gt: 0 } } },
                { $group: { _id: null, avgDiscount: { $avg: "$discountPercent" } } }
            ]),
            Deal.find({ isExpired: { $ne: true }, views: { $gt: 0 } })
                .sort({ views: -1 })
                .limit(5)
                .lean(),
            Deal.aggregate([
                {
                    $group: {
                        _id: {
                            title: { $toLower: { $trim: { input: "$title" } } },
                            store: { $toLower: { $trim: { input: { $ifNull: ["$storeName", "$store"] } } } }
                        },
                        ids: { $push: "$_id" },
                        count: { $sum: 1 }
                    }
                },
                { $match: { count: { $gt: 1 } } }
            ]),
            Deal.find({
                isExpired: { $ne: true },
                $or: [
                    { title: { $in: [null, ""] } },
                    { image: { $in: [null, ""] } },
                    { imageUrl: { $in: [null, ""] } },
                    { dealPrice: { $in: [null, 0] } }
                ]
            })
            .limit(20)
            .lean()
        ]);

        const avgDiscount = avgDiscountResult.length ? Math.round(avgDiscountResult[0].avgDiscount) : 0;
        const duplicateGroups = dupGroupsResult.map(g => g.ids);
        const duplicateCount = dupGroupsResult.reduce((acc, g) => acc + (g.count - 1), 0);

        res.json({
            totalDeals,
            activeDeals,
            totalCategories,
            totalStores,
            featuredDeals,
            avgDiscount,
            topClickedDeals,
            duplicateGroups,
            duplicateCount,
            incompleteDeals
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch admin stats' });
    }
});

router.get('/sitemap-data', async (req, res) => {
    try {
        const data = await getSitemapData(req);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch sitemap data' });
    }
});

router.get('/stores', async (req, res) => {
    try {
        const stats = await Deal.aggregate([
            { $group: { _id: "$storeName", count: { $sum: 1 } } },
            { $project: { name: "$_id", count: 1, _id: 0 } },
            { $sort: { name: 1 } }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch admin stores' });
    }
});

router.get('/affiliate-settings', async (req, res) => {
    try {
        await syncAffiliateSettingsWithStores(AffiliateSetting, Deal, false, req.app.locals);
        const settings = await getAffiliateSettings(AffiliateSetting, false, req.app.locals);
        console.log('[AFFILIATE_TAGS_FETCH]', {
            count: settings.length,
            stores: settings.map((setting) => setting.store).filter(Boolean).slice(0, 10)
        });
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
        await syncAffiliateSettingsWithStores(AffiliateSetting, Deal, false, req.app.locals);
        const payload = Array.isArray(req.body?.settings) ? req.body.settings : [];
        const normalizedSettings = normalizeAffiliatePayload(payload);



        await Promise.all(normalizedSettings.map((setting) =>
            AffiliateSetting.findOneAndUpdate(
                { $or: [{ storeSlug: setting.storeSlug }, { store: setting.store }] },
                { $set: setting },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
        ));

        markAffiliateSettingsSyncDirty(req.app.locals);
        const settings = await getAffiliateSettings(AffiliateSetting, false, req.app.locals);
        const reapply = await reapplyAffiliateSettingsToDeals(Deal, settings);
        console.log('[AFFILIATE_TAG_SAVE]', {
            count: settings.length,
            stores: settings.map((setting) => setting.store).filter(Boolean).slice(0, 10),
            reapplyUpdated: reapply.updated || 0
        });

        triggerSitemapUpdate();

        res.json({ settings, reapply });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Failed to save affiliate settings' });
    }
});

router.post('/deals/cleanup', async (req, res) => {
    try {
        const badDealsQuery = {
            $or: [
                // Image issues: both image and imageUrl are missing, empty, or placeholder
                {
                    $and: [
                        {
                            $or: [
                                { image: { $in: [null, '', 'NO_PRODUCT_IMAGE'] } },
                                { image: { $regex: /placeholder|no-image|default-product|no_product_image|noimage/i } },
                                { image: { $not: /^(https?:\/\/|\/)/ } }
                            ]
                        },
                        {
                            $or: [
                                { imageUrl: { $exists: false } },
                                { imageUrl: { $in: [null, '', 'NO_PRODUCT_IMAGE'] } },
                                { imageUrl: { $regex: /placeholder|no-image|default-product|no_product_image|noimage/i } },
                                { imageUrl: { $not: /^(https?:\/\/|\/)/ } }
                            ]
                        }
                    ]
                },
                { dealPrice: { $lte: 0 } },
                { price: { $lte: 0 } },
                { $and: [ { mrp: { $gt: 0 } }, { $expr: { $gte: ["$dealPrice", "$mrp"] } } ] },
                { $and: [ { originalPrice: { $gt: 0 } }, { $expr: { $gte: ["$dealPrice", "$originalPrice"] } } ] },
                { $and: [ { mrp: { $gt: 0 } }, { $expr: { $gte: ["$price", "$mrp"] } } ] },
                { $and: [ { originalPrice: { $gt: 0 } }, { $expr: { $gte: ["$price", "$originalPrice"] } } ] },
                // Title issues: missing/empty, whitespace-only, no alphabetic letters, too short (< 8 chars), fake/test/dummy/incorrect names
                { title: { $in: [null, ''] } },
                { title: { $regex: /^\s*$/ } },
                { title: { $regex: /^[^a-zA-Z]*$/ } },
                { title: { $regex: /^(test|demo|fake|asdf|dummy|temp|untitled|unknown|n\/a|null|undefined|lorem|ipsum|product|charger|gopro|tws\s*ans)$/i } },
                { title: { $regex: /test product|fake deal|testing|asdfasdf|untitled|lorem ipsum/i } },
                { $expr: { $lt: [{ $strLenCP: { $ifNull: ["$title", ""] } }, 8] } }
            ]
        };

        let deletedCount = 0;
        let removedDeals = [];

        const badDeals = await Deal.find(badDealsQuery).lean();
        if (badDeals.length > 0) {
            const result = await Deal.deleteMany({ _id: { $in: badDeals.map(d => d._id) } });
            deletedCount = result.deletedCount;
            removedDeals = badDeals.map(d => ({ id: d._id, title: d.title, store: d.store || d.storeName }));
            
            // Automatically trigger SEO / Sitemap regeneration
            triggerSitemapUpdate();
        }

        res.json({
            success: true,
            deletedCount,
            dealsRemoved: removedDeals
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to clean up deals' });
    }
});

router.post('/generate-manual-sitemap', async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../generate-manual-sitemap.js');
        const { stdout, stderr } = await execPromise(`node "${scriptPath}"`);
        res.json({ success: true, message: 'Generated manual links successfully', output: stdout });
    } catch (error) {
        console.error('Manual sitemap generation error:', error);
        res.status(500).json({ message: 'Failed to generate manual links', error: error.message });
    }
});

export default router;
