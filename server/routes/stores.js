import express from 'express';
import Deal from '../models/Deal.js';
import { deals } from '../mockStore.js';
import { normalizeDealForResponse } from '../utils/deal-normalizer.js';

const router = express.Router();

const STORE_PROFILE = {
    Amazon: { domain: 'amazon.in', url: 'https://amazon.in', tagline: 'Live Amazon deals from the current catalog' },
    Flipkart: { domain: 'flipkart.com', url: 'https://flipkart.com', tagline: 'Live Flipkart deals from the current catalog' },
    Myntra: { domain: 'myntra.com', url: 'https://myntra.com', tagline: 'Live Myntra fashion and lifestyle deals' },
    Meesho: { domain: 'meesho.com', url: 'https://meesho.com', tagline: 'Live Meesho marketplace offers' },
    Blinkit: { domain: 'blinkit.com', url: 'https://blinkit.com', tagline: 'Live grocery and essentials offers' },
    Nykaa: { domain: 'nykaa.com', url: 'https://nykaa.com', tagline: 'Live beauty and skincare offers' },
    Ajio: { domain: 'ajio.com', url: 'https://ajio.com', tagline: 'Live branded fashion deals' },
    Croma: { domain: 'croma.com', url: 'https://croma.com', tagline: 'Live electronics and appliance deals' },
    BigBasket: { domain: 'bigbasket.com', url: 'https://bigbasket.com', tagline: 'Live supermarket offers' }
};

const isLiveDeal = (deal = {}) =>
    deal
    && !deal.isExpired
    && Boolean(deal.title)
    && Boolean(deal.productUrl || deal.link)
    && Number(deal.dealPrice || 0) > 0;

const getStoreProfile = (store = '') => {
    const profile = STORE_PROFILE[store] || {};
    const inferredDomain = String(store || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const domain = profile.domain || `${inferredDomain}.com`;

    return {
        domain,
        url: profile.url || `https://${domain}`,
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

            return {
                ...summary,
                ...profile,
                category: topCategory,
                categories: Object.keys(summary.categories).sort(),
                badge: `${summary.count} live deals`,
                cashback: 'Live Offers',
                image: summary.sampleImages[0] || '',
                updatedAt: summary.latestDealAt
            };
        })
        .sort((a, b) => b.count - a.count || a.store.localeCompare(b.store));
};

router.get('/', async (req, res) => {
    try {
        const dealsList = req.app.locals.isMockMode
            ? deals
            : await Deal.find().lean();

        const normalizedDeals = dealsList.map((deal) => normalizeDealForResponse(deal));
        res.json(buildStoreSummary(normalizedDeals));
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load stores' });
    }
});

export default router;
