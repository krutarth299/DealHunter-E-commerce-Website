import express from 'express';
const router = express.Router();

import https from 'https';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Deal from '../models/Deal.js';
import { triggerSitemapUpdate } from './sitemap.js';
import { autoGenerateBlogForDeal } from '../utils/auto-blog-generator.js';
import AffiliateSetting from '../models/AffiliateSetting.js';
import {
    sleep,
    PROFILES,
    getRandomProfile,
    injectStealth
} from '../scraper-utils.js';

// === DEAL NORMALIZATION UTILS ===
import { normalizeDealPayload } from '../utils/deal-normalizer.js';

router.get('/debug-deal/:id', async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id);
        res.json({ dbImages: deal.images, dbVariants: deal.variants });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

import {
    normalizeDealForResponse
} from '../utils/deal-normalizer.js';

import {
    applyAffiliateSettingsToDeal,
    getAffiliateSettings,
    syncAffiliateSettingsWithStores
} from '../utils/affiliate-links.js';

import { normalizeProductImages } from '../utils/product-images.js';
import { downloadAndSaveImages } from '../utils/image-downloader.js';

import {
    groupDealsIntoListings,
    mergeVariantOptions
} from '../utils/product-identity.js';


import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractProduct } from '../extractors/index.js';

puppeteerExtra.use(StealthPlugin());

// NEW EXTRACTION ROUTE (Priority Registration)
router.post('/fetch-deal', async (req, res) => {
    console.log('[API_FETCH_DEAL_REQUEST]', req.body.url);
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

        const result = await extractProduct(url);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('[API_FETCH_DEAL_ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

const loadAffiliateSettings = (req) =>
    getAffiliateSettings(
        AffiliateSetting,
        req.app.locals.isMockMode,
        req.app.locals
    );

const syncAffiliateStoreConfigs = (req) =>
    syncAffiliateSettingsWithStores(
        AffiliateSetting,
        Deal,
        req.app.locals.isMockMode,
        req.app.locals
    ).catch((error) => {
        console.warn('[AFFILIATE_SYNC_WARN]', error.message || error);
    });

const decorateDealForResponse = (deal, settings) =>
    normalizeDealForResponse(
        applyAffiliateSettingsToDeal({
            deal,
            settings
        })
    );

const decorateDealsForResponse = (dealsList, settings) =>
    dealsList.map((deal) =>
        decorateDealForResponse(deal, settings)
    );

const decorateDealListingsForResponse = (dealsList, settings) =>
    groupDealsIntoListings(
        decorateDealsForResponse(dealsList, settings)
    );

const buildDuplicateLookupQuery = (deal = {}) => {
    const or = [];

    if (deal.duplicateKey) {
        or.push({ duplicateKey: deal.duplicateKey });
    }

    if (deal.canonicalProductUrl) {
        or.push({
            canonicalProductUrl: deal.canonicalProductUrl
        });
    }

    if (deal.sourceProductId && deal.storeName) {
        or.push({
            storeName: deal.storeName,
            sourceProductId: deal.sourceProductId
        });
    }

    if (deal.normalizedTitle && deal.storeName) {
        or.push({
            storeName: deal.storeName,
            normalizedTitle: deal.normalizedTitle
        });
    }

    return or.length ? { $or: or } : null;
};

const assignDealFields = (dealDoc, normalizedPayload) => {
    const allowedUpdates = [
        'title',
        'shortTitle',
        'seoTitle',
        'seoDescription',
        'canonicalUrl',
        'focusKeyword',
        'image',
        'images',
        'videos',
        'price',
        'dealPrice',
        'originalPrice',
        'originalTitle',
        'rawTitle',
        'displayTitle',
        'cardTitle',
        'mrp',
        'discount',
        'discountPercent',
        'rating',
        'store',
        'storeName',
        'category',
        'link',
        'productUrl',
        'canonicalProductUrl',
        'sourceProductId',
        'normalizedTitle',
        'duplicateKey',
        'variantGroupKey',
        'variantLabel',
        'variantType',
        'variants',
        'affiliateOverrideLink',
        'affiliateLink',
        'description',
        'shortDescription',
        'brand',
        'model',
        'availability',
        'isVerified',
        'isTrending',
        'isBestseller',
        'featured',
        'isExpired',
        'views'
    ];

    allowedUpdates.forEach((key) => {
        if (normalizedPayload[key] !== undefined) {
            dealDoc[key] = normalizedPayload[key];
        }
    });

    // Bump createdAt so it floats to the top when updated/re-published
    dealDoc.createdAt = new Date();
};

const toSortedCountEntries = (counts = {}) =>
    Object.entries(counts)
        .map(([name, count]) => ({
            name,
            count
        }))
        .sort(
            (a, b) =>
                b.count - a.count ||
                a.name.localeCompare(b.name)
        );

const buildDashboardStats = (dealsList = []) => {
    const categoryStats = dealsList.reduce((acc, deal) => {
        const cat =
            String(deal.category || '').trim() || 'Other';

        acc[cat] = (acc[cat] || 0) + 1;

        return acc;
    }, {});

    const storeStats = dealsList.reduce((acc, deal) => {
        const store =
            String(
                deal.storeName || deal.store || ''
            ).trim() || 'Online Store';

        acc[store] = (acc[store] || 0) + 1;

        return acc;
    }, {});

    const recentDeals = [...dealsList]
        .sort(
            (a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
        )
        .slice(0, 8);

    const topClickedDeals = [...dealsList]
        .filter((d) => (d.views || 0) > 0)
        .sort(
            (a, b) => (b.views || 0) - (a.views || 0)
        )
        .slice(0, 5);

    const discountValues = dealsList
        .map((d) => Number(d.discountPercent || 0))
        .filter((v) => v > 0);

    const avgDiscount = discountValues.length
        ? Math.round(
            discountValues.reduce(
                (sum, v) => sum + v,
                0
            ) / discountValues.length
        )
        : 0;

    return {
        totalDeals: dealsList.length,
        totalCategories:
            Object.keys(categoryStats).length,
        totalStores: Object.keys(storeStats).length,
        featuredDeals: dealsList.filter((deal) =>
            Boolean(deal.featured)
        ).length,
        avgDiscount,
        categoryStats,
        storeStats,
        categories:
            toSortedCountEntries(categoryStats),
        stores: toSortedCountEntries(storeStats),
        recentDeals,
        topClickedDeals,
        latestDeals: recentDeals
    };
};

const logPath = path.join(
    __dirname,
    '../extract.log'
);

const log = (msg) => {
    const time = new Date().toISOString();

    fs.appendFileSync(
        logPath,
        `[${time}] ${msg}\n`
    );

    console.log(msg);
};

const agent = new https.Agent({
    rejectUnauthorized: false
});

/* =========================
   ROUTES START
========================= */

// GET ALL DEALS
router.get('/', async (req, res) => {
    try {
        const affiliateSettings = await loadAffiliateSettings(req);

        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const search = req.query.search;
        const store = req.query.store;
        const category = req.query.category;
        const discount = req.query.discount;
        const dateFilter = req.query.dateFilter;
        const sort = req.query.sort || 'newest';
        const duplicateOnly = req.query.duplicateOnly === 'true';

        // Mock mode removed

        // Build MongoDB Query
        let query = {};
        const andConditions = [];

        if (search) {
            const searchTerms = search.trim().split(/[\s/\-(),|\[\]{}+:]+/).filter(Boolean);
            if (searchTerms.length > 0) {
                const termConditions = searchTerms.map(term => {
                    let safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // Allow optional spaces between letters and numbers (e.g. "8GB" matches "8 GB")
                    safeTerm = safeTerm.replace(/([a-zA-Z])(\d)/g, '$1\\s*$2').replace(/(\d)([a-zA-Z])/g, '$1\\s*$2');
                    return {
                        $or: [
                            { title: { $regex: safeTerm, $options: 'i' } },
                            { shortTitle: { $regex: safeTerm, $options: 'i' } },
                            { fullTitle: { $regex: safeTerm, $options: 'i' } },
                            { normalizedTitle: { $regex: safeTerm, $options: 'i' } },
                            { originalTitle: { $regex: safeTerm, $options: 'i' } },
                            { storeName: { $regex: safeTerm, $options: 'i' } },
                            { store: { $regex: safeTerm, $options: 'i' } },
                            { category: { $regex: safeTerm, $options: 'i' } },
                            { brand: { $regex: safeTerm, $options: 'i' } },
                            { description: { $regex: safeTerm, $options: 'i' } }
                        ]
                    };
                });
                andConditions.push({ $and: termConditions });
            }
        }


        if (store && store !== 'All') {
            andConditions.push({
                $or: [
                    { storeName: store },
                    { store: store }
                ]
            });
        }

        if (category && category !== 'All') {
            andConditions.push({ category: category });
        }

        if (discount && discount !== 'All') {
            if (discount === '50+') {
                andConditions.push({ discountPercent: { $gte: 50 } });
            } else if (discount === '25+') {
                andConditions.push({ discountPercent: { $gte: 25 } });
            } else if (discount === '1-24') {
                andConditions.push({ discountPercent: { $gt: 0, $lt: 25 } });
            } else if (discount === '0') {
                andConditions.push({
                    $or: [
                        { discountPercent: 0 },
                        { discountPercent: { $exists: false } }
                    ]
                });
            }
        }

        const minPrice = parseFloat(req.query.minPrice);
        const maxPrice = parseFloat(req.query.maxPrice);
        if (!isNaN(minPrice) || !isNaN(maxPrice)) {
            const priceCondition = {};
            if (!isNaN(minPrice)) priceCondition.$gte = minPrice;
            if (!isNaN(maxPrice)) priceCondition.$lte = maxPrice;
            andConditions.push({ dealPrice: priceCondition });
        }

        if (dateFilter && dateFilter !== 'All') {
            const now = new Date();
            let dateThreshold;
            if (dateFilter === '24h') {
                dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            } else if (dateFilter === '7d') {
                dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (dateFilter === '30d') {
                dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            if (dateThreshold) {
                andConditions.push({ createdAt: { $gte: dateThreshold } });
            }
        }

        if (duplicateOnly) {
            const dupGroups = await Deal.aggregate([
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
            ]);
            const duplicateIds = dupGroups.flatMap(group => group.ids);
            andConditions.push({ _id: { $in: duplicateIds } });
        }

        if (andConditions.length > 0) {
            query.$and = andConditions;
        }

        let sortQuery = { createdAt: -1 };
        if (sort === 'price-low') {
            andConditions.push({ dealPrice: { $gt: 0 } });
            sortQuery = { dealPrice: 1 };
        } else if (sort === 'price-high') {
            andConditions.push({ dealPrice: { $gt: 0 } });
            sortQuery = { dealPrice: -1 };
        } else if (sort === 'discount') {
            sortQuery = { discountPercent: -1 };
        } else if (sort === 'clicked') {
            sortQuery = { views: -1 };
        }

        if (Number.isInteger(page) && Number.isInteger(limit)) {
            const skip = (page - 1) * limit;
            const totalCount = await Deal.countDocuments(query);
            const dealsList = await Deal.find(query)
                .sort(sortQuery)
                .skip(skip)
                .limit(limit)
                .lean();

            const responseDeals = req.query.raw === 'true'
                ? decorateDealsForResponse(dealsList, affiliateSettings)
                : decorateDealListingsForResponse(dealsList, affiliateSettings);

            return res.json({
                success: true,
                deals: responseDeals,
                totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit)
            });
        }

        const dealsList = await Deal.find(query)
            .sort(sortQuery)
            .lean();

        const responseDeals = req.query.raw === 'true'
            ? decorateDealsForResponse(dealsList, affiliateSettings)
            : decorateDealListingsForResponse(dealsList, affiliateSettings);

        res.json(responseDeals);
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

// LATEST
router.get('/latest', async (req, res) => {
    try {
        const limit =
            parseInt(req.query.limit) || 5;

        let dealsList;

        const affiliateSettings =
            await loadAffiliateSettings(req);

        dealsList = await Deal.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json(
            decorateDealsForResponse(
                dealsList,
                affiliateSettings
            )
        );
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

// STATS
router.get('/stats', async (req, res) => {
    try {
        let dealsList;

        const affiliateSettings =
            await loadAffiliateSettings(req);

        dealsList = await Deal.find().lean();

        const normalizedDeals =
            decorateDealsForResponse(
                dealsList,
                affiliateSettings
            );

        res.json(
            buildDashboardStats(normalizedDeals)
        );
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

// CATEGORIES
router.get('/categories', async (req, res) => {
    try {
        let categories;

        const raw = await Deal.distinct('category');
        categories = raw.filter((c) => c && c.trim() !== '');

        res.json(categories);
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});


// CREATE DEAL
router.post('/', async (req, res) => {
    try {
        const affiliateSettings =
            await loadAffiliateSettings(req);

        const normalizedPayload =
            normalizeDealPayload(req.body);

        console.log('[DEBUG_DEALS] finalPayload.images:', normalizedPayload.images);

        if (normalizedPayload.images && normalizedPayload.images.length > 0) {
            const localImages = await downloadAndSaveImages(normalizedPayload.images);
            normalizedPayload.images = localImages;
            if (localImages.length > 0) {
                normalizedPayload.image = localImages[0];
                normalizedPayload.thumbnail = localImages[0];
            }
        }

        const finalPayload =
            applyAffiliateSettingsToDeal({
                deal: normalizedPayload,
                settings: affiliateSettings
            });

        const duplicateQuery =
            buildDuplicateLookupQuery(
                finalPayload
            );

        const existingDeal =
            duplicateQuery
                ? await Deal.findOne(
                    duplicateQuery
                )
                : null;

        if (existingDeal) {
            const mergedPayload =
                normalizeDealPayload({
                    ...existingDeal.toObject(),
                    ...finalPayload,
                    variants:
                        mergeVariantOptions(
                            existingDeal.variants,
                            finalPayload.variants
                        )
                });

            if (mergedPayload.images && mergedPayload.images.length > 0) {
                const localImages = await downloadAndSaveImages(mergedPayload.images);
                mergedPayload.images = localImages;
                if (localImages.length > 0) {
                    mergedPayload.image = localImages[0];
                    mergedPayload.thumbnail = localImages[0];
                }
            }

            assignDealFields(
                existingDeal,
                mergedPayload
            );

            console.log('[DEBUG_DEALS] Before save, existingDeal.images:', existingDeal.images);

            const updatedDeal =
                await existingDeal.save();

            console.log('[DEBUG_DEALS] After save, updatedDeal.images:', updatedDeal.images);

            const io = req.app.get('socketio');
            if (io) io.emit('updateDeal', updatedDeal);

            // Automatically trigger SEO / Sitemap regeneration
            triggerSitemapUpdate();

            return res.json(
                decorateDealForResponse(
                    updatedDeal,
                    affiliateSettings
                )
            );
        }

        const deal = new Deal(finalPayload);

        const newDeal = await deal.save();

        // Auto-generate blog for the new deal
        await autoGenerateBlogForDeal(newDeal);

        const io = req.app.get('socketio');
        if (io) io.emit('newDeal', newDeal);

        // Automatically trigger SEO / Sitemap regeneration
        triggerSitemapUpdate();

        res.status(201).json(
            decorateDealForResponse(
                newDeal,
                affiliateSettings
            )
        );
    } catch (err) {
        res.status(400).json({
            message: err.message
        });
    }
});

// UPDATE DEAL
router.put('/:id', async (req, res) => {
    try {
        const affiliateSettings =
            await loadAffiliateSettings(req);

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {
            return res
                .status(400)
                .json({
                    message:
                        'Invalid deal ID'
                });
        }

        const deal =
            await Deal.findById(
                req.params.id
            );

        if (!deal) {
            return res
                .status(404)
                .json({
                    message:
                        'Cannot find deal'
                });
        }

        const baseNormalized = normalizeDealPayload({
            ...deal.toObject(),
            ...req.body
        });

        const normalizedPayload =
            applyAffiliateSettingsToDeal({
                deal: {
                    ...baseNormalized,
                    ...req.body // manual edits take precedence
                },
                settings:
                    affiliateSettings
            });

        if (normalizedPayload.images && normalizedPayload.images.length > 0) {
            const localImages = await downloadAndSaveImages(normalizedPayload.images);
            normalizedPayload.images = localImages;
            if (localImages.length > 0) {
                normalizedPayload.image = localImages[0];
                normalizedPayload.thumbnail = localImages[0];
            }
            if (normalizedPayload.variants && normalizedPayload.variants.length > 0) {
                normalizedPayload.variants[0].images = localImages;
                if (localImages.length > 0) {
                    normalizedPayload.variants[0].image = localImages[0];
                }
            }
        }

        assignDealFields(
            deal,
            normalizedPayload
        );

        const updatedDeal =
            await deal.save();

        const io = req.app.get('socketio');
        if (io) io.emit('updateDeal', updatedDeal);

        // Automatically trigger SEO / Sitemap regeneration
        triggerSitemapUpdate();

        res.json(
            decorateDealForResponse(
                updatedDeal,
                affiliateSettings
            )
        );
    } catch (err) {
        res.status(400).json({
            message: err.message
        });
    }
});

// DELETE DEAL
router.delete('/:id', async (req, res) => {
    try {
        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {
            return res
                .status(400)
                .json({
                    message:
                        'Invalid deal ID'
                });
        }

        const deal =
            await Deal.findById(
                req.params.id
            );

        if (!deal) {
            return res
                .status(404)
                .json({
                    message:
                        'Cannot find deal'
                });
        }

        await deal.deleteOne();

        const io = req.app.get('socketio');
        if (io) io.emit('deleteDeal', req.params.id);

        // Automatically trigger SEO / Sitemap regeneration
        triggerSitemapUpdate();

        res.json({
            message: 'Deleted Deal'
        });
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

// VIEW COUNT
router.post('/:id/view', async (req, res) => {
    try {
        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {
            return res
                .status(400)
                .json({
                    message:
                        'Invalid deal ID'
                });
        }

        const deal =
            await Deal.findById(
                req.params.id
            );

        if (!deal) {
            return res
                .status(404)
                .json({
                    message:
                        'Cannot find deal'
                });
        }

        deal.views = (deal.views || 0) + 1;

        await deal.save();

        res.json({
            views: deal.views
        });
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

// REVIEWS
router.post('/:id/reviews', async (req, res) => {
    try {
        const {
            user,
            rating,
            comment
        } = req.body;

        if (
            !user ||
            !rating ||
            !comment
        ) {
            return res
                .status(400)
                .json({
                    message:
                        'Missing required review fields'
                });
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {
            return res
                .status(400)
                .json({
                    message:
                        'Invalid deal ID'
                });
        }

        const deal =
            await Deal.findById(
                req.params.id
            );

        if (!deal) {
            return res
                .status(404)
                .json({
                    message:
                        'Cannot find deal'
                });
        }

        const newReview = {
            user,
            rating:
                Number(rating),
            comment,
            date: new Date()
        };

        deal.reviews.unshift(newReview);

        const total =
            deal.reviews.reduce(
                (acc, r) =>
                    acc + r.rating,
                0
            );

        deal.rating = parseFloat(
            (
                total /
                deal.reviews.length
            ).toFixed(1)
        );

        const updatedDeal =
            await deal.save();

        const affiliateSettings =
            await loadAffiliateSettings(req);

        res.status(201).json(
            decorateDealForResponse(
                updatedDeal,
                affiliateSettings
            )
        );
    } catch (err) {
        res.status(400).json({
            message: err.message
        });
    }
});

// HOMEPAGE DEALS
router.get('/homepage', async (req, res) => {
    try {
        const affiliateSettings = await loadAffiliateSettings(req);
        let dealsList;

        // Fetch active deals, latest first
        const latestDeals = await Deal.find({ isExpired: { $ne: true } })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        // Also fetch featured deals to ensure they show in the slider even if they are old
        const featuredDeals = await Deal.find({
            isExpired: { $ne: true },
            $or: [{ featured: true }, { isTrending: true }, { trending: true }]
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Combine and deduplicate
        const dealMap = new Map();
        latestDeals.forEach(d => dealMap.set(d._id.toString(), d));
        featuredDeals.forEach(d => dealMap.set(d._id.toString(), d));
        
        dealsList = Array.from(dealMap.values());

        const responseDeals = decorateDealListingsForResponse(dealsList, affiliateSettings);
        res.json({
            success: true,
            data: {
                deals: responseDeals,
                updatedAt: Date.now()
            }
        });
    } catch (err) {
        console.error('[HOMEPAGE_DEALS_ERROR]', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal Server Error while loading homepage deals' 
        });
    }
});

// SINGLE DEAL (IMPORTANT: ALWAYS LAST)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {
            return res
                .status(400)
                .json({
                    message:
                        'Invalid deal ID'
                });
        }

        const affiliateSettings =
            await loadAffiliateSettings(req);

        // Mock mode removed

        const deal =
            await Deal.findById(id);

        if (!deal) {
            return res
                .status(404)
                .json({
                    message:
                        'Cannot find deal'
                });
        }

        res.json(
            decorateDealForResponse(
                deal,
                affiliateSettings
            )
        );
    } catch (err) {
        console.error(
            '[GET_DEAL_ERROR]',
            err
        );

        res.status(500).json({
            message: err.message
        });
    }
});

export default router;
