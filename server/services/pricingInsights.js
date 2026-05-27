import Deal from '../models/Deal.js';
import PriceSnapshot from '../models/PriceSnapshot.js';
import { deals as mockDeals } from '../mockStore.js';
import { normalizeDealForResponse } from '../utils/deal-normalizer.js';

const STOP_WORDS = new Set([
    'the', 'with', 'for', 'and', 'from', 'this', 'that', 'combo', 'pack', 'offer',
    'deal', 'sale', 'new', 'best', 'latest', 'edition', 'inch', 'inches', 'piece',
    'pieces', 'set', 'online', 'buy', 'get', 'free', 'discount', 'smart', 'plus'
]);

const parsePriceNumber = (value) => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeText = (value = '') => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getTitleTokens = (deal = {}) => normalizeText(deal.normalizedTitle || deal.displayTitle || deal.cardTitle || deal.title)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const getBrandToken = (deal = {}) => {
    const [token] = getTitleTokens(deal);
    return token || '';
};

const average = (values = []) => {
    if (!values.length) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const relativeCheckedLabel = (checkedAt) => {
    if (!checkedAt) return null;
    const timestamp = new Date(checkedAt).getTime();
    if (!Number.isFinite(timestamp)) return null;

    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (minutes < 2) return 'Price checked just now';
    if (minutes < 60) return `Price checked ${minutes} minutes ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `Price checked ${hours} hours ago`;
    return `Price checked ${Math.round(hours / 24)} days ago`;
};

const buildDealQuality = ({ currentPrice, bestPriceEver, averagePrice, originalPrice, similarListingsCount }) => {
    if (!currentPrice) return null;

    if (bestPriceEver && currentPrice <= bestPriceEver) return 'Best Deal';

    const averageDelta = averagePrice && currentPrice < averagePrice
        ? ((averagePrice - currentPrice) / averagePrice) * 100
        : 0;
    const mrpDelta = originalPrice && currentPrice < originalPrice
        ? ((originalPrice - currentPrice) / originalPrice) * 100
        : 0;

    if (averageDelta >= 20 || mrpDelta >= 45) return 'Great Deal';
    if (averageDelta >= 10 || mrpDelta >= 25) return 'Good Deal';
    if (similarListingsCount >= 2 || averagePrice) return averageDelta >= 0 ? 'Average Deal' : 'Weak Deal';
    return mrpDelta >= 15 ? 'Good Deal' : null;
};

const buildBuySignal = ({ currentPrice, bestPriceEver, averagePrice, dealQuality }) => {
    if (!currentPrice) return null;
    if (bestPriceEver && currentPrice <= bestPriceEver) return 'Strong buy signal';
    if (dealQuality === 'Great Deal' || dealQuality === 'Good Deal') return 'Good value right now';
    if (averagePrice && currentPrice <= averagePrice) return 'Fair market price';
    if (averagePrice && currentPrice > averagePrice) return 'Wait for a better price';
    return null;
};

const scoreComparableDeal = (baseDeal, candidateDeal) => {
    const baseTokens = getTitleTokens(baseDeal);
    const candidateTokens = new Set(getTitleTokens(candidateDeal));
    if (!baseTokens.length || !candidateTokens.size) return 0;

    let score = 0;
    const shared = baseTokens.filter((token) => candidateTokens.has(token));
    score += shared.length * 2;

    const baseBrand = getBrandToken(baseDeal);
    const candidateBrand = getBrandToken(candidateDeal);
    if (baseBrand && baseBrand === candidateBrand) score += 4;
    if (baseDeal.category && candidateDeal.category && baseDeal.category === candidateDeal.category) score += 2;
    if ((baseDeal.store || baseDeal.storeName) === (candidateDeal.store || candidateDeal.storeName)) score -= 2;

    return score;
};

const buildSnapshotQuery = (deal = {}) => {
    const or = [];
    if (deal._id) or.push({ dealId: deal._id });
    if (deal.duplicateKey) or.push({ duplicateKey: deal.duplicateKey });
    if (deal.variantGroupKey) or.push({ variantGroupKey: deal.variantGroupKey });
    if (deal.normalizedTitle && deal.category) or.push({ normalizedTitle: deal.normalizedTitle, category: deal.category });
    return or.length ? { $or: or } : null;
};

export const persistPriceSnapshot = async (dealInput) => {
    if (!dealInput || !dealInput._id) return null;

    const currentPrice = parsePriceNumber(dealInput.dealPrice || dealInput.price);
    const originalPrice = parsePriceNumber(dealInput.mrp || dealInput.originalPrice);
    if (!currentPrice) return null;

    const latestSnapshot = await PriceSnapshot.findOne({ dealId: dealInput._id }).sort({ checkedAt: -1 }).lean();
    if (
        latestSnapshot
        && latestSnapshot.currentPrice === currentPrice
        && latestSnapshot.originalPrice === originalPrice
        && String(latestSnapshot.sourceUrl || '') === String(dealInput.productUrl || dealInput.link || '')
    ) {
        return latestSnapshot;
    }

    return PriceSnapshot.create({
        dealId: dealInput._id,
        duplicateKey: dealInput.duplicateKey || '',
        variantGroupKey: dealInput.variantGroupKey || '',
        normalizedTitle: dealInput.normalizedTitle || normalizeText(dealInput.title),
        store: dealInput.storeName || dealInput.store || '',
        category: dealInput.category || '',
        sourceUrl: dealInput.productUrl || dealInput.link || '',
        currentPrice,
        originalPrice,
        checkedAt: dealInput.lastFetchedAt || dealInput.updatedAt || new Date(),
        metadata: {
            sourceType: dealInput.sourceType || '',
            extractionStrategy: dealInput.extractionStrategy || '',
            validationStatus: dealInput.validationStatus || ''
        }
    });
};

const getComparableDeals = async (deal, { limit = 4, isMockMode = false } = {}) => {
    const dealId = String(deal._id || deal.id || '');
    const sourceDeals = isMockMode
        ? mockDeals
        : await Deal.find({
            _id: { $ne: deal._id },
            isExpired: { $ne: true },
            validationStatus: { $ne: 'rejected' },
            category: deal.category
        })
            .select({
                title: 1,
                displayTitle: 1,
                cardTitle: 1,
                image: 1,
                images: 1,
                price: 1,
                dealPrice: 1,
                originalPrice: 1,
                mrp: 1,
                discount: 1,
                discountPercent: 1,
                store: 1,
                storeName: 1,
                category: 1,
                productUrl: 1,
                link: 1,
                normalizedTitle: 1,
                duplicateKey: 1,
                variantGroupKey: 1,
                updatedAt: 1,
                createdAt: 1
            })
            .limit(80)
            .lean();

    const scored = sourceDeals
        .filter((candidate) => String(candidate._id || candidate.id || '') !== dealId)
        .map((candidate) => ({
            candidate,
            score: scoreComparableDeal(deal, candidate)
        }))
        .filter(({ candidate, score }) => score >= 4 && parsePriceNumber(candidate.dealPrice || candidate.price) > 0)
        .sort((a, b) => b.score - a.score || parsePriceNumber(a.candidate.dealPrice || a.candidate.price) - parsePriceNumber(b.candidate.dealPrice || b.candidate.price))
        .slice(0, limit)
        .map(({ candidate }) => normalizeDealForResponse(candidate));

    return scored;
};

export const getPriceInsightForDeal = async (dealInput, { isMockMode = false } = {}) => {
    const currentPrice = parsePriceNumber(dealInput.dealPrice || dealInput.price);
    const originalPrice = parsePriceNumber(dealInput.mrp || dealInput.originalPrice);
    const snapshotQuery = isMockMode ? null : buildSnapshotQuery(dealInput);

    const snapshots = snapshotQuery
        ? await PriceSnapshot.find(snapshotQuery)
            .sort({ checkedAt: -1 })
            .limit(90)
            .lean()
        : [];

    const priceHistory = snapshots
        .map((snapshot) => ({
            currentPrice: snapshot.currentPrice,
            originalPrice: snapshot.originalPrice,
            checkedAt: snapshot.checkedAt
        }))
        .filter((snapshot) => snapshot.currentPrice > 0);

    const bestPriceEver = priceHistory.length
        ? Math.min(...priceHistory.map((snapshot) => snapshot.currentPrice))
        : null;

    const historyAverage = average(priceHistory.map((snapshot) => snapshot.currentPrice));
    const similarListings = await getComparableDeals(dealInput, { limit: 4, isMockMode });
    const comparablePrices = similarListings
        .map((listing) => parsePriceNumber(listing.dealPrice || listing.price))
        .filter((value) => value > 0);
    const averagePrice = historyAverage ?? average(comparablePrices);

    const savingsPercentage = (() => {
        if (originalPrice && currentPrice && originalPrice > currentPrice) {
            return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        }
        if (averagePrice && currentPrice && averagePrice > currentPrice) {
            return Math.round(((averagePrice - currentPrice) / averagePrice) * 100);
        }
        return null;
    })();

    const similarListingsCount = comparablePrices.length;
    const dealQuality = buildDealQuality({
        currentPrice,
        bestPriceEver,
        averagePrice,
        originalPrice,
        similarListingsCount
    });

    const buySignal = buildBuySignal({
        currentPrice,
        bestPriceEver,
        averagePrice,
        dealQuality
    });

    const savingsVsAverage = averagePrice && currentPrice && averagePrice > currentPrice
        ? averagePrice - currentPrice
        : null;

    const checkedAt = dealInput.lastFetchedAt || dealInput.updatedAt || priceHistory[0]?.checkedAt || null;

    return {
        currentPrice: currentPrice || null,
        originalPrice: originalPrice || null,
        bestPriceEver,
        averagePrice,
        savingsPercentage,
        savingsVsAverage,
        dealQuality,
        buySignal,
        checkedAt,
        checkedLabel: relativeCheckedLabel(checkedAt),
        similarListingsCount,
        similarListings,
        priceHistoryCount: priceHistory.length,
        hasHistory: priceHistory.length > 0
    };
};
