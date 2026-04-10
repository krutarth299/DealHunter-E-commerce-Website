import express from 'express';
import Coupon from '../models/Coupon.js';
import Deal from '../models/Deal.js';
import AffiliateSetting from '../models/AffiliateSetting.js';
import { deals as mockDeals } from '../mockStore.js';
import {
    getStoreSlug,
    isCouponActive,
    normalizeCouponForResponse,
    normalizeCouponPayload
} from '../utils/coupons.js';
import {
    getCouponScanStatus,
    scanCoupons
} from '../services/couponDiscovery.js';

const router = express.Router();

const getMockCoupons = (req) => {
    if (!Array.isArray(req.app.locals.coupons)) {
        req.app.locals.coupons = [];
    }
    return req.app.locals.coupons;
};

const sortCoupons = (coupons = []) => [...coupons].sort((a, b) => {
    const scoreA = (a.isFeatured ? 200 : 0) + (a.isTrending ? 120 : 0) + (a.isVerified ? 50 : 0) + Number(a.popularity || a.usageCount || 0);
    const scoreB = (b.isFeatured ? 200 : 0) + (b.isTrending ? 120 : 0) + (b.isVerified ? 50 : 0) + Number(b.popularity || b.usageCount || 0);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return new Date(b.updatedAt || b.verifiedAt || b.createdAt || 0) - new Date(a.updatedAt || a.verifiedAt || a.createdAt || 0);
});

const applyCouponFilters = (coupons = [], query = {}) => {
    const search = String(query.search || '').trim().toLowerCase();
    const storeSlug = String(query.storeSlug || query.store || '').trim().toLowerCase();
    const category = String(query.category || '').trim().toLowerCase();
    const offerType = String(query.offerType || query.type || '').trim().toLowerCase();
    const includeExpired = query.includeExpired === 'true' || query.status === 'all' || query.adminView === 'true';

    return coupons.filter((coupon) => {
        const normalized = normalizeCouponForResponse(coupon);
        if (!includeExpired && !isCouponActive(normalized)) return false;
        if (storeSlug && normalized.storeSlug !== getStoreSlug(storeSlug) && normalized.store.toLowerCase() !== storeSlug) return false;
        if (category && String(normalized.category || '').toLowerCase() !== category) return false;
        if (offerType && normalized.offerType !== offerType) return false;
        if (search) {
            const haystack = `${normalized.title} ${normalized.description} ${normalized.store} ${normalized.category} ${normalized.code}`.toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });
};

const getCouponList = async (req) => {
    if (req.app.locals.isMockMode) {
        return getMockCoupons(req);
    }

    return Coupon.find().sort({ isFeatured: -1, isTrending: -1, updatedAt: -1, createdAt: -1 }).lean();
};

const getRelatedDeals = async (req, storeSlug) => {
    const dealList = req.app.locals.isMockMode ? mockDeals : await Deal.find().sort({ createdAt: -1 }).limit(120).lean();
    return dealList
        .filter((deal) => getStoreSlug(deal.storeName || deal.store) === storeSlug)
        .slice(0, 12);
};

const buildSummary = (coupons = []) => {
    const activeCoupons = coupons.filter((coupon) => isCouponActive(coupon));
    const storeMap = new Map();
    activeCoupons.forEach((coupon) => {
        const entry = storeMap.get(coupon.storeSlug) || {
            store: coupon.store,
            storeSlug: coupon.storeSlug,
            activeCoupons: 0,
            featuredCoupons: 0,
            offerTypes: new Set()
        };
        entry.activeCoupons += 1;
        if (coupon.isFeatured) entry.featuredCoupons += 1;
        entry.offerTypes.add(coupon.offerType);
        storeMap.set(coupon.storeSlug, entry);
    });

    return {
        totalCoupons: coupons.length,
        activeCoupons: activeCoupons.length,
        verifiedCoupons: activeCoupons.filter((coupon) => coupon.isVerified).length,
        cashbackOffers: activeCoupons.filter((coupon) => coupon.offerType === 'cashback').length,
        stores: [...storeMap.values()].map((store) => ({
            ...store,
            offerTypes: [...store.offerTypes]
        })).sort((a, b) => b.activeCoupons - a.activeCoupons || a.store.localeCompare(b.store))
    };
};

router.get('/', async (req, res) => {
    try {
        const query = req.originalUrl.includes('/api/admin/')
            ? { ...req.query, adminView: req.query.adminView ?? 'true' }
            : req.query;
        const coupons = (await getCouponList(req)).map(normalizeCouponForResponse);
        const filtered = applyCouponFilters(coupons, query);
        res.json(sortCoupons(filtered));
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load coupons' });
    }
});

router.get('/summary', async (req, res) => {
    try {
        const coupons = (await getCouponList(req)).map(normalizeCouponForResponse);
        res.json(buildSummary(coupons));
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load coupon summary' });
    }
});

router.get('/scan/status', async (req, res) => {
    res.json(getCouponScanStatus(req.app.locals));
});

router.post('/scan', async (req, res) => {
    try {
        if (!req.originalUrl.includes('/api/admin/')) {
            return res.status(403).json({ message: 'Coupon scan can only be triggered from the admin API.' });
        }

        const io = req.app.get('socketio');
        const summary = await scanCoupons({
            CouponModel: Coupon,
            DealModel: Deal,
            AffiliateSettingModel: AffiliateSetting,
            isMockMode: req.app.locals.isMockMode,
            appLocals: req.app.locals,
            io,
            manual: true,
            limitSources: Number(req.body?.limitSources || req.query.limitSources || process.env.COUPON_SCAN_SOURCE_LIMIT || 8),
            includeDealSync: req.body?.includeDealSync !== false
        });

        res.json({
            message: 'Coupon scan completed.',
            summary,
            status: getCouponScanStatus(req.app.locals)
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Coupon scan failed', status: getCouponScanStatus(req.app.locals) });
    }
});

router.get('/stores/:storeSlug', async (req, res) => {
    try {
        const storeSlug = getStoreSlug(req.params.storeSlug);
        const coupons = (await getCouponList(req)).map(normalizeCouponForResponse);
        const storeCoupons = sortCoupons(coupons.filter((coupon) => coupon.storeSlug === storeSlug));
        const relatedDeals = await getRelatedDeals(req, storeSlug);
        const store = storeCoupons[0]?.store || relatedDeals[0]?.storeName || relatedDeals[0]?.store || req.params.storeSlug;

        res.json({
            store,
            storeSlug,
            coupons: applyCouponFilters(storeCoupons, req.query),
            relatedDeals,
            summary: buildSummary(storeCoupons)
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load store coupons' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (req.app.locals.isMockMode) {
            const coupon = getMockCoupons(req).find((item) => String(item._id || item.id) === String(req.params.id));
            return coupon ? res.json(normalizeCouponForResponse(coupon)) : res.status(404).json({ message: 'Coupon not found' });
        }

        const coupon = await Coupon.findById(req.params.id).lean();
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        res.json(normalizeCouponForResponse(coupon));
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load coupon' });
    }
});

router.post('/', async (req, res) => {
    try {
        const payload = normalizeCouponPayload(req.body);
        if (!payload.title) return res.status(400).json({ message: 'Coupon title is required' });
        if (!payload.store || payload.store === 'Online Store') return res.status(400).json({ message: 'Store is required' });
        if (!payload.affiliateUrl && !payload.landingUrl) return res.status(400).json({ message: 'Affiliate or landing URL is required' });

        if (req.app.locals.isMockMode) {
            const coupon = {
                _id: Date.now().toString(),
                ...payload,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            getMockCoupons(req).unshift(coupon);
            return res.status(201).json(normalizeCouponForResponse(coupon));
        }

        const existing = payload.duplicateKey ? await Coupon.findOne({ duplicateKey: payload.duplicateKey }) : null;
        if (existing) {
            Object.assign(existing, {
                ...payload,
                sourceType: existing.sourceType || payload.sourceType || 'manual',
                autoFetched: existing.autoFetched || payload.autoFetched
            });
            const updated = await existing.save();
            const io = req.app.get('socketio');
            io?.emit?.('updateCoupon', normalizeCouponForResponse(updated));
            return res.json(normalizeCouponForResponse(updated));
        }

        const coupon = await Coupon.create(payload);
        const io = req.app.get('socketio');
        io?.emit?.('newCoupon', normalizeCouponForResponse(coupon));
        res.status(201).json(normalizeCouponForResponse(coupon));
    } catch (error) {
        res.status(400).json({ message: error.message || 'Failed to save coupon' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const payload = normalizeCouponPayload(req.body);
        if (!payload.title) return res.status(400).json({ message: 'Coupon title is required' });

        if (req.app.locals.isMockMode) {
            const coupons = getMockCoupons(req);
            const index = coupons.findIndex((item) => String(item._id || item.id) === String(req.params.id));
            if (index === -1) return res.status(404).json({ message: 'Coupon not found' });
            coupons[index] = { ...coupons[index], ...payload, updatedAt: new Date() };
            return res.json(normalizeCouponForResponse(coupons[index]));
        }

        const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        const io = req.app.get('socketio');
        io?.emit?.('updateCoupon', normalizeCouponForResponse(coupon));
        res.json(normalizeCouponForResponse(coupon));
    } catch (error) {
        res.status(400).json({ message: error.message || 'Failed to update coupon' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (req.app.locals.isMockMode) {
            const coupons = getMockCoupons(req);
            const index = coupons.findIndex((item) => String(item._id || item.id) === String(req.params.id));
            if (index === -1) return res.status(404).json({ message: 'Coupon not found' });
            coupons.splice(index, 1);
            return res.json({ message: 'Coupon deleted' });
        }

        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        const io = req.app.get('socketio');
        io?.emit?.('deleteCoupon', String(req.params.id));
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to delete coupon' });
    }
});

export default router;
