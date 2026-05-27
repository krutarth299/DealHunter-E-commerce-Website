import express from 'express';
import Deal from '../models/Deal.js';
import { deals } from '../mockStore.js';
import { normalizeDealForResponse } from '../utils/deal-normalizer.js';
import { getStoreSlug } from '../utils/affiliate-links.js';
import {
    AFFILIATE_STORE_SOURCES,
    getEnabledStoreSources,
    getStoreIntegrationConfig,
    getStoreSourceByName
} from '../config/storeSources.js';

const router = express.Router();
const LIVE_DEAL_QUERY = { validationStatus: 'accepted', isExpired: { $ne: true } };

const isLiveDeal = (deal = {}) =>
    deal
    && !deal.isExpired
    && Boolean(deal.title)
    && Boolean(deal.productUrl || deal.link)
    && Number(deal.dealPrice || 0) > 0;

const getStoreProfile = (store = '') => {
    const profile = getStoreSourceByName(store) || {};
    const inferredDomain = String(store || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const domain = profile.domain || `${inferredDomain}.com`;

    return {
        domain,
        url: profile.homeUrl || `https://${domain}`,
        tagline: profile.tagline || `Live ${store || 'store'} deals from the current catalog`,
        logo: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
    };
};

const buildStoreSummary = (dealsList = []) => {
    const liveDeals = dealsList.filter(isLiveDeal);

    const counts = liveDeals.reduce((acc, deal) => {
        const store = String(deal.storeName || deal.store || '').trim() || 'Online Store';
        const category = String(deal.category || '').trim() || 'Multi-category';
        const existing = acc[store] || {
            store,
            name: store,
            count: 0,
            dealsCount: 0,
            categories: {},
            sampleImages: [],
            latestDealAt: null
        };

        existing.count += 1;
        existing.dealsCount = existing.count;
        existing.categories[category] = (existing.categories[category] || 0) + 1;
        if (deal.image && existing.sampleImages.length < 4) {
            existing.sampleImages.push(deal.image);
        }

        const dealDate = deal.createdAt || deal.updatedAt || null;
        if (dealDate && (!existing.latestDealAt || new Date(dealDate) > new Date(existing.latestDealAt))) {
            existing.latestDealAt = dealDate;
        }

        acc[store] = existing;
        return acc;
    }, {});

    return Object.values(counts)
        .map((summary) => {
            const topCategory = Object.entries(summary.categories)
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'Multi-category';
            const profile = getStoreProfile(summary.store);
            const storeSlug = getStoreSlug(summary.store);
            const supportedCategories = Object.keys(summary.categories).sort((a, b) => a.localeCompare(b));
            const seoTitle = `${summary.store} Deals, Offers & Savings`.trim();
            const seoDescription = `Browse ${summary.dealsCount} live ${summary.store} deals. Compare the latest live savings and store highlights on DealSphere.`;

            return {
                ...summary,
                ...profile,
                storeSlug,
                category: topCategory,
                categories: supportedCategories,
                supportedCategories,
                description: profile.tagline || `Live ${summary.store} offers from your catalog`,
                seoTitle,
                seoDescription,
                canonicalUrl: `/store/${storeSlug}`,
                badge: `${summary.dealsCount} deals`,
                cashback: 'Live Offers',
                image: summary.sampleImages[0] || '',
                updatedAt: summary.latestDealAt,
                lastSyncedAt: summary.latestDealAt
            };
        })
        .sort((a, b) => b.count - a.count || a.store.localeCompare(b.store));
};

router.get('/sources', (req, res) => {
    const enabledStores = new Set(getEnabledStoreSources().map((source) => source.store));

    res.json(AFFILIATE_STORE_SOURCES.map((source) => {
        const integration = getStoreIntegrationConfig(source);
        return {
            store: integration.store,
            tier: integration.tier,
            domain: integration.domain,
            homeUrl: integration.homeUrl,
            dealsUrl: integration.dealsUrl,
            couponUrl: integration.couponUrl,
            category: integration.category,
            categories: integration.categories || [],
            enabled: enabledStores.has(integration.store),
            enabledByDefault: Boolean(integration.enabledByDefault),
            affiliateReady: Boolean(integration.affiliateReady),
            affiliateParams: integration.affiliateParams,
            categorySources: integration.categorySources,
            extractionStrategy: integration.extractionStrategy,
            productSelectors: integration.productSelectors,
            pricingSelectors: integration.pricingSelectors,
            imageSelectors: integration.imageSelectors,
            variantSelectors: integration.variantSelectors,
            affiliateLinkHandler: integration.affiliateLinkHandler,
            priceMapping: integration.priceMapping,
            validationRules: integration.validationRules,
            duplicateKeys: integration.duplicateKeys,
            retryStrategy: integration.retryStrategy,
            logo: `https://www.google.com/s2/favicons?domain=${integration.domain}&sz=256`
        };
    }));
});

router.get('/', async (req, res) => {
    try {
        const dealsList = req.app.locals.isMockMode
            ? deals
            : await Deal.find(LIVE_DEAL_QUERY).lean();

        const normalizedDeals = dealsList.map((deal) => normalizeDealForResponse(deal));
        res.json(buildStoreSummary(normalizedDeals));
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load stores' });
    }
});

router.get('/:storeSlug', async (req, res) => {
    try {
        const requestedSlug = getStoreSlug(req.params.storeSlug);
        const dealsList = req.app.locals.isMockMode
            ? deals
            : await Deal.find(LIVE_DEAL_QUERY).sort({ createdAt: -1, updatedAt: -1 }).lean();

        const normalizedDeals = dealsList
            .map((deal) => normalizeDealForResponse(deal))
            .filter((deal) => getStoreSlug(deal.storeName || deal.store) === requestedSlug);

        const storeName = normalizedDeals[0]?.storeName
            || normalizedDeals[0]?.store
            || req.params.storeSlug;

        const profile = getStoreProfile(storeName);
        const liveDeals = normalizedDeals.filter(isLiveDeal);
        const categories = [...new Set([
            ...liveDeals.map((deal) => String(deal.category || '').trim())
        ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

        if (!liveDeals.length) {
            return res.status(404).json({ message: 'Store not found' });
        }

        res.json({
            store: storeName,
            storeSlug: requestedSlug,
            ...profile,
            categories,
            supportedCategories: categories,
            dealsCount: liveDeals.length,
            featuredDealsCount: liveDeals.filter((deal) => deal.featured).length,
            topCategory: categories[0] || 'Multi-category',
            latestDealAt: liveDeals[0]?.updatedAt || liveDeals[0]?.createdAt || null,
            seoTitle: profile.seoTitle || `${storeName} Deals, Offers & Price Drops`,
            seoDescription: profile.seoDescription || `Browse live ${storeName} deals and verified offers on DealSphere.`,
            description: profile.tagline || `Live ${storeName} deals and offers from the current catalog.`,
            deals: liveDeals
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load store details' });
    }
});

export default router;
