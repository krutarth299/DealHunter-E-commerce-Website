import { getStoreProfile } from '../config/storeProfiles';

const getDealId = (deal = {}) => String(deal._id || deal.id || deal.productUrl || deal.link || deal.title || '');

export const isDisplayableDeal = (deal = {}) =>
    deal
    && !deal.isExpired
    && Boolean(deal.title)
    && Boolean(deal.productUrl || deal.link || deal._id || deal.id);

const getNewestTime = (deal = {}) => {
    const parsed = new Date(deal.createdAt || deal.updatedAt || deal.viewedAt || 0).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

export const selectBalancedDeals = (deals = [], { limit = 12, maxPerCategory = 3, maxPerStore = 6 } = {}) => {
    const candidates = (Array.isArray(deals) ? deals : [])
        .filter(isDisplayableDeal)
        .sort((a, b) => getNewestTime(b) - getNewestTime(a));

    const selected = [];
    const selectedIds = new Set();
    const categoryCounts = new Map();
    const storeCounts = new Map();

    const tryAdd = (deal, strict = true) => {
        const id = getDealId(deal);
        if (!id || selectedIds.has(id) || selected.length >= limit) return false;

        const category = deal.category || 'Other';
        const store = deal.store || deal.storeName || 'Online Store';
        const categoryCount = categoryCounts.get(category) || 0;
        const storeCount = storeCounts.get(store) || 0;

        if (strict && (categoryCount >= maxPerCategory || storeCount >= maxPerStore)) {
            return false;
        }

        selected.push(deal);
        selectedIds.add(id);
        categoryCounts.set(category, categoryCount + 1);
        storeCounts.set(store, storeCount + 1);
        return true;
    };

    const categoryBuckets = new Map();
    const storeBuckets = new Map();
    candidates.forEach((deal) => {
        const category = deal.category || 'Other';
        const bucket = categoryBuckets.get(category) || [];
        bucket.push(deal);
        categoryBuckets.set(category, bucket);

        const store = String(deal.store || deal.storeName || 'Online Store').trim() || 'Online Store';
        const storeBucket = storeBuckets.get(store) || [];
        storeBucket.push(deal);
        storeBuckets.set(store, storeBucket);
    });

    const orderedCategories = [...categoryBuckets.keys()].sort((a, b) =>
        getNewestTime(categoryBuckets.get(b)?.[0]) - getNewestTime(categoryBuckets.get(a)?.[0])
        || a.localeCompare(b)
    );
    const orderedStores = [...storeBuckets.keys()].sort((a, b) =>
        getNewestTime(storeBuckets.get(b)?.[0]) - getNewestTime(storeBuckets.get(a)?.[0])
        || a.localeCompare(b)
    );

    for (let round = 0; round < 2 && selected.length < limit; round += 1) {
        let addedThisRound = false;

        for (const store of orderedStores) {
            const bucket = storeBuckets.get(store) || [];
            const deal = bucket[round];
            if (deal && tryAdd(deal, true)) {
                addedThisRound = true;
            }
            if (selected.length >= limit) break;
        }

        if (!addedThisRound) break;
    }

    for (let round = 0; round < maxPerCategory && selected.length < limit; round += 1) {
        let addedThisRound = false;

        for (const category of orderedCategories) {
            const bucket = categoryBuckets.get(category) || [];
            const deal = bucket[round];
            if (deal && tryAdd(deal, true)) {
                addedThisRound = true;
            }
            if (selected.length >= limit) break;
        }

        if (!addedThisRound) break;
    }

    for (const deal of candidates) {
        tryAdd(deal, false);
    }

    return selected;
};

const resolveStoreDomain = (store = '', sampleDeal = {}) => {
    const profile = getStoreProfile(store);
    if (profile?.domain) return profile.domain;

    try {
        const url = new URL(sampleDeal.productUrl || sampleDeal.link || '');
        return url.hostname.replace(/^www\./, '');
    } catch {
        const slug = String(store || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '');
        return `${slug}.com`;
    }
};

export const getLiveStoresFromDeals = (deals = []) => {
    const summaries = new Map();

    (Array.isArray(deals) ? deals : [])
        .filter(isDisplayableDeal)
        .forEach((deal) => {
            const name = String(deal.store || deal.storeName || '').trim();
            if (!name) return;

            const existing = summaries.get(name) || {
                name,
                store: name,
                dealsCount: 0,
                count: 0,
                categories: new Map(),
                latestDealAt: null,
                sampleDeal: deal
            };

            const category = deal.category || 'Multi-category';
            existing.dealsCount += 1;
            existing.count = existing.dealsCount;
            existing.categories.set(category, (existing.categories.get(category) || 0) + 1);

            if (getNewestTime(deal) > getNewestTime({ createdAt: existing.latestDealAt })) {
                existing.latestDealAt = deal.createdAt || deal.updatedAt || null;
                existing.sampleDeal = deal;
            }

            summaries.set(name, existing);
        });

    return [...summaries.values()]
        .map((summary) => {
            const category = [...summary.categories.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'Multi-category';
            const domain = resolveStoreDomain(summary.name, summary.sampleDeal);
            const profile = getStoreProfile(summary.name) || {};

            return {
                name: summary.name,
                store: summary.name,
                tagline: profile.tagline || `Live ${summary.name} deals from your catalog`,
                logo: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
                url: `https://${domain}`,
                category,
                categories: [...summary.categories.keys()].sort(),
                dealsCount: summary.dealsCount,
                count: summary.dealsCount,
                badge: `${summary.dealsCount} live deals`,
                image: summary.sampleDeal.image,
                latestDealAt: summary.latestDealAt
            };
        })
        .sort((a, b) => b.dealsCount - a.dealsCount || a.name.localeCompare(b.name));
};
