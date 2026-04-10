import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    LayoutDashboard, Package, PlusCircle, Search, Trash2,
    TrendingUp, LogOut, Shield, ExternalLink, Edit3, Image as ImageIcon,
    Zap, DollarSign, Flame, Menu, X, CheckCircle, AlertCircle, Pencil, Activity,
    TrendingDown, Sparkles, Smartphone, Shirt, Gamepad2, Plane, Utensils, ShoppingBag, Layers,
    ChevronLeft, ChevronRight, Home as HomeIcon, ShoppingCart, BadgePercent
} from 'lucide-react';
import { useNavigate, Link, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { buildAffiliateUrl, sanitizeOriginalUrl } from '../utils/affiliateLinks';
import { normalizeDealForUi, normalizeDealsForUi } from '../utils/dealUi';
import { SITE_NAME } from '../config/brand';
import AdminCouponManager from '../components/admin/AdminCouponManager';

const CATEGORY_MAP = {
    'Electronics': Smartphone,
    'Fashion': Shirt,
    'Gaming': Gamepad2,
    'Grocery': ShoppingBag,
    'Travel': Plane,
    'Food': Utensils,
    'Beauty': Sparkles,
    'Home & Kitchen': HomeIcon,
    'Appliances': Zap,
    'Home & Living': HomeIcon,
    'Multi-category': Layers
};
const DEFAULT_CAT_ICON = Layers;
const DEFAULT_DEAL_FORM = {
    title: '',
    store: '',
    price: '',
    originalPrice: '',
    discount: '',
    image: '',
    images: [],
    videos: [],
    link: '',
    affiliateOverrideLink: '',
    affiliateLink: '',
    category: '',
    description: '',
    extractionWarning: '',
    featured: false,
    isExpired: false
};

const DEFAULT_COUPON_FORM = {
    title: '',
    description: '',
    code: '',
    offerType: 'coupon',
    store: '',
    category: 'Multi-category',
    affiliateUrl: '',
    landingUrl: '',
    cashbackValue: '',
    discountValue: '',
    expiryDate: '',
    isVerified: true,
    verifiedAt: '',
    isFeatured: false,
    isTrending: false,
    status: 'active',
    terms: '',
    successRate: '',
    usageCount: ''
};

const COUPON_OFFER_TYPES = [
    { value: 'coupon', label: 'Coupon Code' },
    { value: 'deal', label: 'Instant Deal' },
    { value: 'cashback', label: 'Cashback' },
    { value: 'bank', label: 'Bank Offer' },
    { value: 'app', label: 'App Only' },
    { value: 'new-user', label: 'New User' },
    { value: 'wallet', label: 'Wallet / UPI' },
    { value: 'sale', label: 'Sale Offer' }
];

/* ───────────────────────────────── helpers ── */
const token = () => 'anonymous'; // Auth system removed

const deriveStoreFromUrl = (rawUrl = '') => {
    try {
        const host = new URL(rawUrl).hostname.toLowerCase();
        if (host.includes('amazon')) return 'Amazon';
        if (host.includes('flipkart')) return 'Flipkart';
        if (host.includes('meesho')) return 'Meesho';
        if (host.includes('myntra')) return 'Myntra';
        if (host.includes('ajio')) return 'Ajio';
        if (host.includes('nykaa')) return 'Nykaa';
        return host.replace(/^www\./, '').split('.')[0]?.replace(/^./, c => c.toUpperCase()) || '';
    } catch {
        return '';
    }
};

const normalizeNumberLike = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return value.toString();
    const cleaned = String(value).replace(/[^\d.]/g, '');
    if (!cleaned) return '';
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed.toString() : '';
};

const sanitizeUrl = (u = '') => {
    let val = String(u || '').trim();
    if (!val) return '';
    if (!/^https?:\/\//i.test(val) && /^(www\.)?meesho\./i.test(val)) {
        val = `https://${val}`;
    }
    if (!/^https?:\/\//i.test(val) && /^(www\.)?blinkit\./i.test(val)) {
        val = `https://${val}`;
    }
    if (!/^https?:\/\//i.test(val) && /^meesho\./i.test(val)) {
        val = `https://www.${val}`;
    }
    if (!/^https?:\/\//i.test(val) && /^(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(val)) {
        val = `https://${val}`;
    }
    return val;
};

const isLikelyHttpUrl = (u = '') => /^https?:\/\//i.test(sanitizeUrl(u));

const getAffiliateStoreSlug = (store = '') =>
    String(store || 'store')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'store';

const createPendingAffiliateSetting = (store = '') => ({
    store: String(store || '').trim(),
    storeSlug: getAffiliateStoreSlug(store),
    enabled: false,
    paramKey: '',
    paramValue: '',
    urlPattern: '',
    notes: '',
    discoveredFromDeals: true,
    pendingSetup: true
});

const normalizeAffiliateSetting = (setting = {}) => {
    const store = String(setting.store || setting.storeName || '').trim();
    const paramKey = String(setting.paramKey || setting.parameterKey || '').trim();
    const paramValue = String(setting.paramValue || setting.parameterValue || '').trim();

    return {
        ...createPendingAffiliateSetting(store),
        ...setting,
        store,
        storeSlug: String(setting.storeSlug || getAffiliateStoreSlug(store)).trim().toLowerCase(),
        enabled: Boolean(setting.enabled),
        paramKey,
        paramValue,
        urlPattern: String(setting.urlPattern || '').trim(),
        notes: String(setting.notes || '').trim(),
        pendingSetup: !setting.enabled || !paramKey || !paramValue
    };
};

const mergeAffiliateSettings = (settings = [], storeNames = []) => {
    const bySlug = new Map();

    storeNames
        .map((store) => String(store || '').trim())
        .filter(Boolean)
        .forEach((store) => {
            const pending = createPendingAffiliateSetting(store);
            bySlug.set(pending.storeSlug, pending);
        });

    (Array.isArray(settings) ? settings : [])
        .map(normalizeAffiliateSetting)
        .filter((setting) => setting.store)
        .forEach((setting) => bySlug.set(setting.storeSlug, {
            ...(bySlug.get(setting.storeSlug) || {}),
            ...setting
        }));

    return [...bySlug.values()].sort((a, b) => a.store.localeCompare(b.store));
};

const normalizeCouponForAdmin = (coupon = {}) => ({
    ...DEFAULT_COUPON_FORM,
    ...coupon,
    _id: coupon._id || coupon.id,
    id: coupon.id || coupon._id,
    store: String(coupon.store || '').trim(),
    code: String(coupon.code || '').trim().toUpperCase(),
    expiryDate: coupon.expiryDate ? String(coupon.expiryDate).slice(0, 10) : '',
    verifiedAt: coupon.verifiedAt ? String(coupon.verifiedAt).slice(0, 16) : '',
    successRate: coupon.successRate ? String(coupon.successRate) : '',
    usageCount: coupon.usageCount ? String(coupon.usageCount) : '',
    autoFetched: Boolean(coupon.autoFetched),
    sourceType: coupon.sourceType || 'manual',
    sourceUrl: coupon.sourceUrl || '',
    fetchedAt: coupon.fetchedAt || '',
    lastSeenAt: coupon.lastSeenAt || '',
    lastFetchStatus: coupon.lastFetchStatus || '',
    lastFetchError: coupon.lastFetchError || '',
    scanBatchId: coupon.scanBatchId || '',
    reviewStatus: coupon.reviewStatus || 'approved'
});

const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || `Request failed (${response.status})`);
    }

    return data;
};

const formatMoney = (value) => {
    const normalized = normalizeNumberLike(value);
    if (!normalized) return '—';
    return `₹${Number(normalized).toLocaleString('en-IN')}`;
};

const formatDealDate = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const getDealDisplayPrice = (deal) => formatMoney(deal?.dealPrice || deal?.price);
const getDealDisplayMrp = (deal) => {
    const mrp = Number(normalizeNumberLike(deal?.mrp || deal?.originalPrice) || 0);
    if (!mrp) return '—';
    return formatMoney(mrp);
};
const getDealDisplayDiscount = (deal) => {
    const discount = Number(normalizeNumberLike(deal?.discountPercent || deal?.discount) || 0);
    return discount > 0 ? `${discount}% OFF` : '0% OFF';
};

const getDealId = (deal) => String(deal?._id || deal?.id || '');

const getNumericDealPrice = (deal) =>
    Number(normalizeNumberLike(deal?.dealPrice || deal?.price) || 0);

const getNumericMrp = (deal) =>
    Number(normalizeNumberLike(deal?.mrp || deal?.originalPrice) || 0);

const getNumericDiscount = (deal) =>
    Number(normalizeNumberLike(deal?.discountPercent || deal?.discount) || 0);

const getDealViews = (deal) =>
    Number(deal?.views || deal?.clicks || deal?.viewCount || 0) || 0;

const getDealTimestamp = (deal) => {
    const time = new Date(deal?.createdAt || deal?.updatedAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
};

const normalizeComparableTitle = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\b(?:with|for|and|the|combo|offer|sale|new)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeComparableUrl = (value = '') => {
    try {
        const url = new URL(sanitizeUrl(value));
        [
            'tag', 'ascsubtag', 'affid', 'affExtParam', 'utm_source', 'utm_medium',
            'utm_campaign', 'utm_term', 'utm_content', 'ref', 'ref_', 'pf_rd_p',
            'pf_rd_r'
        ].forEach((param) => url.searchParams.delete(param));
        url.hash = '';
        return `${url.origin}${url.pathname}`.replace(/\/$/, '').toLowerCase();
    } catch {
        return String(value || '').split('?')[0].replace(/\/$/, '').toLowerCase();
    }
};

const getDealDuplicateKey = (deal) => {
    const urlKey = normalizeComparableUrl(deal?.canonicalProductUrl || deal?.productUrl || deal?.link || '');
    if (urlKey) return `url:${urlKey}`;

    const titleKey = normalizeComparableTitle(deal?.normalizedTitle || deal?.title || '');
    const storeKey = String(deal?.storeName || deal?.store || '').toLowerCase().trim();
    return titleKey && storeKey ? `title:${storeKey}:${titleKey}` : getDealId(deal);
};

const findDuplicateGroups = (deals = []) => {
    const groups = new Map();
    deals.forEach((deal) => {
        const key = getDealDuplicateKey(deal);
        if (!key) return;
        const group = groups.get(key) || [];
        group.push(deal);
        groups.set(key, group);
    });
    return [...groups.values()].filter((group) => group.length > 1);
};

const buildAdminInsights = (deals = [], stores = []) => {
    const activeDeals = deals.filter((deal) => !deal.isExpired);
    const discountValues = activeDeals.map(getNumericDiscount).filter((discount) => discount > 0);
    const avgDiscount = discountValues.length
        ? Math.round(discountValues.reduce((sum, discount) => sum + discount, 0) / discountValues.length)
        : 0;

    const topStore = [...stores]
        .sort((a, b) => Number(b.count || b.dealsCount || 0) - Number(a.count || a.dealsCount || 0))[0];
    const topClickedDeals = [...activeDeals]
        .sort((a, b) => getDealViews(b) - getDealViews(a) || getDealTimestamp(b) - getDealTimestamp(a))
        .slice(0, 5);
    const topDiscountDeals = [...activeDeals]
        .sort((a, b) => getNumericDiscount(b) - getNumericDiscount(a) || getDealTimestamp(b) - getDealTimestamp(a))
        .slice(0, 5);
    const incompleteDeals = activeDeals.filter((deal) =>
        !deal.title || !deal.image || !getNumericDealPrice(deal) || !deal.store || !deal.category
    );
    const duplicateGroups = findDuplicateGroups(deals);

    return {
        avgDiscount,
        topStore,
        topClickedDeals,
        topDiscountDeals,
        incompleteDeals,
        duplicateGroups,
        duplicateCount: duplicateGroups.reduce((sum, group) => sum + Math.max(0, group.length - 1), 0)
    };
};

const loadAdminSnapshot = async ({ adminApiBase }) => {
    const headers = { 'auth-token': token() };
    const [dealsData, statsData, categoriesData, storesData] = await Promise.all([
        fetchJson(`${adminApiBase}/admin/deals`, { headers }),
        fetchJson(`${adminApiBase}/admin/deals/stats`, { headers }),
        fetchJson(`${adminApiBase}/admin/deals/categories`, { headers }),
        fetchJson(`${adminApiBase}/stores`, { headers })
    ]);

    return {
        deals: normalizeDealsForUi(dealsData),
        stats: statsData,
        categories: Array.isArray(categoriesData) ? categoriesData.filter(Boolean) : [],
        stores: Array.isArray(storesData) ? storesData : []
    };
};

/* ───────────────────────────────── components ── */

const DealAutomationChecklist = ({ form }) => {
    const price = Number(normalizeNumberLike(form.price) || 0);
    const mrp = Number(normalizeNumberLike(form.originalPrice) || 0);
    const imageCount = [form.image, ...(Array.isArray(form.images) ? form.images : [])].filter(Boolean).length;
    const finalUrl = sanitizeUrl(form.affiliateOverrideLink || form.affiliateLink || form.link);
    const checks = [
        { label: 'Original product URL is valid', ok: isLikelyHttpUrl(form.link) },
        { label: 'Final outbound / affiliate URL is ready', ok: isLikelyHttpUrl(finalUrl) },
        { label: 'Title, store and category are mapped', ok: Boolean(form.title && form.store && form.category) },
        { label: 'Deal price is greater than zero', ok: price > 0 },
        { label: 'MRP is blank or not lower than deal price', ok: !mrp || mrp >= price },
        { label: `${imageCount || 'No'} product image${imageCount === 1 ? '' : 's'} selected`, ok: imageCount > 0 }
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h4 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Shield size={16} className="text-emerald-500" /> Publish Readiness
            </h4>
            <div className="space-y-3">
                {checks.map((check) => (
                    <div key={check.label} className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${check.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {check.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        </span>
                        <span className={`text-xs font-bold leading-relaxed ${check.ok ? 'text-slate-700' : 'text-amber-700'}`}>
                            {check.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DuplicateCandidatesPanel = ({ candidates = [], onEdit }) => {
    if (!candidates.length) {
        return (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                <div className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-600" />
                    <div>
                        <h4 className="text-sm font-black text-emerald-900">No obvious duplicate found</h4>
                        <p className="text-xs font-semibold text-emerald-700 mt-1">The admin UI did not find a matching URL/title in the loaded deals.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={18} className="text-amber-700 mt-0.5" />
                <div>
                    <h4 className="text-sm font-black text-amber-900">Possible duplicate</h4>
                    <p className="text-xs font-semibold text-amber-700 mt-1">Review existing products before publishing a second card.</p>
                </div>
            </div>
            <div className="space-y-3">
                {candidates.slice(0, 3).map((deal) => (
                    <div key={getDealId(deal)} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 border border-amber-100">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white">
                            {deal.image && <img src={optimizeImageUrl(deal.image)} alt="" className="h-full w-full object-contain" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black text-slate-900">{deal.title}</p>
                            <p className="text-[10px] font-bold text-slate-500">{deal.store} · {getDealDisplayPrice(deal)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onEdit?.(deal)}
                            className="rounded-xl bg-amber-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-800 hover:bg-amber-200"
                        >
                            Edit
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════ */
const AdminPanel = ({ user, deals, setDeals, handleAddDeal, dealForm, setDealForm, showToast, apiBase }) => {
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const isAdmin = true; // Account system removed - accessibility granted to all admin routes
    const activeTab = routerLocation.pathname.split('/').pop() || 'dashboard';

    const [searchQuery, setSearchQuery] = useState('');
    const [storeFilter, setStoreFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [discountFilter, setDiscountFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [sortMode, setSortMode] = useState('newest');
    const [duplicateOnly, setDuplicateOnly] = useState(false);
    const [selectedDealIds, setSelectedDealIds] = useState([]);
    const [quickEditDeal, setQuickEditDeal] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [autoPopulated, setAutoPopulated] = useState(new Set());
    const [fetchStatus, setFetchStatus] = useState({ type: '', msg: '' });
    const [dashboardStats, setDashboardStats] = useState(null);
    const [categories, setCategories] = useState([]);
    const [stores, setStores] = useState([]);
    const [affiliateSettings, setAffiliateSettings] = useState([]);
    const [isSavingAffiliateSettings, setIsSavingAffiliateSettings] = useState(false);
    const [coupons, setCoupons] = useState([]);
    const [couponForm, setCouponForm] = useState(DEFAULT_COUPON_FORM);
    const [editingCouponId, setEditingCouponId] = useState(null);
    const [couponSearch, setCouponSearch] = useState('');
    const [couponTypeFilter, setCouponTypeFilter] = useState('all');
    const [isSavingCoupon, setIsSavingCoupon] = useState(false);
    const [couponsLoading, setCouponsLoading] = useState(false);
    const [couponScanStatus, setCouponScanStatus] = useState(null);
    const [isScanningCoupons, setIsScanningCoupons] = useState(false);
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [adminError, setAdminError] = useState('');
    const adminApiBase = apiBase ? apiBase.replace('/user', '') : '';
    const adminDeals = useMemo(() => normalizeDealsForUi(deals), [deals]);
    const liveAffiliateStoreNames = useMemo(() => {
        const fromStoresApi = stores.map((store) => store.store || store.name).filter(Boolean);
        const fromDeals = adminDeals.map((deal) => deal.storeName || deal.store).filter(Boolean);
        return [...new Set([...fromStoresApi, ...fromDeals])].sort((a, b) => a.localeCompare(b));
    }, [adminDeals, stores]);
    const couponStoreOptions = useMemo(() => (
        [...new Set([
            ...liveAffiliateStoreNames,
            ...coupons.map((coupon) => coupon.store).filter(Boolean),
            couponForm.store
        ].filter(Boolean))].sort((a, b) => a.localeCompare(b))
    ), [couponForm.store, coupons, liveAffiliateStoreNames]);
    const filteredCoupons = useMemo(() => {
        const query = couponSearch.trim().toLowerCase();
        return coupons.filter((coupon) => {
            const haystack = `${coupon.title || ''} ${coupon.store || ''} ${coupon.category || ''} ${coupon.code || ''}`.toLowerCase();
            return (!query || haystack.includes(query))
                && (couponTypeFilter === 'all' || coupon.offerType === couponTypeFilter);
        }).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    }, [couponSearch, couponTypeFilter, coupons]);
    const adminInsights = useMemo(() => buildAdminInsights(adminDeals, stores), [adminDeals, stores]);
    const duplicateIdSet = useMemo(() => new Set(
        adminInsights.duplicateGroups.flatMap((group) => group.map(getDealId))
    ), [adminInsights.duplicateGroups]);
    const storeFilterOptions = useMemo(() =>
        ['All', ...new Set(adminDeals.map((deal) => deal.store || deal.storeName).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))
    , [adminDeals]);
    const categoryFilterOptions = useMemo(() =>
        ['All', ...new Set(adminDeals.map((deal) => deal.category).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))
    , [adminDeals]);
    const filteredDeals = useMemo(() => {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const query = searchQuery.toLowerCase();

        const visible = adminDeals.filter(d => {
            if (!d) return false;
            const searchOk = !query
                || (d.title?.toLowerCase().includes(query) ?? false)
                || (d.store?.toLowerCase().includes(query) ?? false)
                || (d.category?.toLowerCase().includes(query) ?? false);
            const storeOk = storeFilter === 'All' || (d.store || d.storeName) === storeFilter;
            const categoryOk = categoryFilter === 'All' || d.category === categoryFilter;
            const discount = getNumericDiscount(d);
            const discountOk = discountFilter === 'All'
                || (discountFilter === '50+' && discount >= 50)
                || (discountFilter === '25+' && discount >= 25)
                || (discountFilter === '1-24' && discount > 0 && discount < 25)
                || (discountFilter === '0' && discount === 0);
            const age = now - getDealTimestamp(d);
            const dateOk = dateFilter === 'All'
                || (dateFilter === '24h' && age <= oneDay)
                || (dateFilter === '7d' && age <= oneDay * 7)
                || (dateFilter === '30d' && age <= oneDay * 30);
            const duplicateOk = !duplicateOnly || duplicateIdSet.has(getDealId(d));

            return searchOk && storeOk && categoryOk && discountOk && dateOk && duplicateOk;
        });

        return [...visible].sort((a, b) => {
            if (sortMode === 'price-low') return getNumericDealPrice(a) - getNumericDealPrice(b);
            if (sortMode === 'price-high') return getNumericDealPrice(b) - getNumericDealPrice(a);
            if (sortMode === 'discount') return getNumericDiscount(b) - getNumericDiscount(a);
            if (sortMode === 'clicked') return getDealViews(b) - getDealViews(a);
            return getDealTimestamp(b) - getDealTimestamp(a);
        });
    }, [adminDeals, searchQuery, storeFilter, categoryFilter, discountFilter, dateFilter, duplicateOnly, duplicateIdSet, sortMode]);
    const selectedDeals = useMemo(() =>
        selectedDealIds.map((id) => adminDeals.find((deal) => getDealId(deal) === id)).filter(Boolean)
    , [adminDeals, selectedDealIds]);
    const duplicateCandidatesForForm = useMemo(() => {
        const candidateKey = getDealDuplicateKey({
            ...dealForm,
            productUrl: dealForm.link,
            storeName: dealForm.store
        });
        const candidateTitle = normalizeComparableTitle(dealForm.title);
        if ((!candidateKey || candidateKey === getDealId({})) && !candidateTitle) return [];

        return adminDeals.filter((deal) => {
            if (editId && getDealId(deal) === String(editId)) return false;
            if (candidateKey && getDealDuplicateKey(deal) === candidateKey) return true;
            return candidateTitle && normalizeComparableTitle(deal.title) === candidateTitle && (deal.store || '') === dealForm.store;
        }).slice(0, 5);
    }, [adminDeals, dealForm, editId]);
    const formCategories = useMemo(() => {
        const merged = [...categories, dealForm.category].filter(Boolean);
        return [...new Set(merged)].sort((a, b) => a.localeCompare(b));
    }, [categories, dealForm.category]);
    const affiliatePreviewUrl = buildAffiliateUrl({
        url: dealForm.link,
        store: dealForm.store,
        settings: affiliateSettings,
        manualOverride: dealForm.affiliateOverrideLink
    });

    const refreshAffiliateSettings = useCallback(async (storeNames = []) => {
        if (!isAdmin || !adminApiBase) return [];

        const response = await fetch(`${adminApiBase}/admin/affiliate-settings`, {
            headers: { 'auth-token': token() }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to load affiliate settings');
        }

        const data = await response.json();
        const mergedSettings = mergeAffiliateSettings(data, storeNames);
        setAffiliateSettings(mergedSettings);
        return mergedSettings;
    }, [adminApiBase, isAdmin]);

    const refreshCoupons = useCallback(async () => {
        if (!isAdmin || !adminApiBase) return [];

        setCouponsLoading(true);
        try {
            const [response, statusResponse] = await Promise.all([
                fetch(`${adminApiBase}/admin/coupons?status=all`, {
                    headers: { 'auth-token': token() }
                }),
                fetch(`${adminApiBase}/admin/coupons/scan/status`, {
                    headers: { 'auth-token': token() }
                }).catch(() => null)
            ]);
            if (statusResponse?.ok) {
                setCouponScanStatus(await statusResponse.json().catch(() => null));
            }

            const data = await response.json().catch(() => []);
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to load coupons');
            }
            const normalizedCoupons = (Array.isArray(data) ? data : []).map(normalizeCouponForAdmin);
            setCoupons(normalizedCoupons);
            return normalizedCoupons;
        } finally {
            setCouponsLoading(false);
        }
    }, [adminApiBase, isAdmin]);

    const handleCouponScan = useCallback(async () => {
        if (!isAdmin || !adminApiBase) return;

        setIsScanningCoupons(true);
        try {
            const response = await fetch(`${adminApiBase}/admin/coupons/scan`, {
                method: 'POST',
                headers: { 'auth-token': token() }
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.message || 'Coupon scan failed');
            }
            setCouponScanStatus(data.status || null);
            await refreshCoupons();
            const summary = data.summary || {};
            showToast?.(`Coupon scan completed: ${summary.created || 0} created, ${summary.updated || 0} updated.`, 'success');
        } catch (error) {
            showToast?.(error.message || 'Coupon scan failed', 'error');
        } finally {
            setIsScanningCoupons(false);
        }
    }, [adminApiBase, isAdmin, refreshCoupons, showToast]);

    const refreshAdminData = useCallback(async ({ silent = false } = {}) => {
        if (!isAdmin || !adminApiBase) return;

        if (!silent) {
            setIsStatsLoading(true);
        }
        setIsRefreshingData(true);
        setAdminError('');

        try {
            const snapshot = await loadAdminSnapshot({ adminApiBase });
            setDeals(snapshot.deals);
            setDashboardStats(snapshot.stats);
            setCategories(snapshot.categories);
            setStores(snapshot.stores);
            const snapshotStoreNames = [
                ...snapshot.stores.map((store) => store.store || store.name).filter(Boolean),
                ...snapshot.deals.map((deal) => deal.storeName || deal.store).filter(Boolean)
            ];
            await refreshAffiliateSettings(snapshotStoreNames).catch((error) => {
                console.warn('Affiliate settings refresh warning:', error);
            });
            await refreshCoupons().catch((error) => {
                console.warn('Coupons refresh warning:', error);
            });
        } catch (error) {
            console.error('Admin snapshot error:', error);
            setAdminError(error.message || 'Failed to load admin data.');
        } finally {
            setIsStatsLoading(false);
            setIsRefreshingData(false);
        }
    }, [adminApiBase, isAdmin, refreshAffiliateSettings, refreshCoupons, setDeals]);

    /* ── auth guard ── (Centrally managed by App.jsx Route) */

    /* ── stats ── */
    useEffect(() => {
        if (!isAdmin || !adminApiBase) return;
        refreshAdminData();
    }, [isAdmin, adminApiBase, refreshAdminData]);

    useEffect(() => {
        if (!isAdmin || !adminApiBase || activeTab !== 'affiliate-tags') return undefined;

        const intervalId = window.setInterval(() => {
            refreshAdminData({ silent: true });
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, [activeTab, adminApiBase, isAdmin, refreshAdminData]);

    useEffect(() => {
        if (!isAdmin || !adminApiBase) return;

        refreshAffiliateSettings(liveAffiliateStoreNames).catch((error) => {
            console.error('Affiliate settings fetch error:', error);
        });
    }, [isAdmin, adminApiBase, liveAffiliateStoreNames, refreshAffiliateSettings]);

    /* ── reset form when switching away from add-deal ── */
    useEffect(() => {
        if (activeTab !== 'add-deal') {
            setEditMode(false);
            setEditId(null);
            setDealForm(DEFAULT_DEAL_FORM);
            setFetchStatus({ type: '', msg: '' });
            setAutoPopulated(new Set());
        }
    }, [activeTab, setDealForm]);

    useEffect(() => {
        if (activeTab !== 'coupons') return;
        refreshCoupons().catch((error) => {
            showToast?.(error.message || 'Failed to refresh coupons', 'error');
        });

        const intervalId = window.setInterval(() => {
            refreshCoupons().catch((error) => {
                console.warn('Coupons auto-refresh warning:', error);
            });
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, [activeTab, refreshCoupons, showToast]);

    /* ── CRUD helpers ── */
    const handleEditClick = (deal) => {
        setEditMode(true);
        setEditId(deal.id || deal._id);
        setDealForm({
            title: deal.title || '', store: deal.store || '', price: deal.price || '',
            originalPrice: deal.originalPrice || '', discount: deal.discount || '',
            image: deal.image || '', images: deal.images || [], videos: deal.videos || [], link: sanitizeOriginalUrl(deal.productUrl || deal.link || ''), affiliateOverrideLink: deal.affiliateOverrideLink || '', affiliateLink: deal.affiliateLink || '',
            category: deal.category || '', description: deal.description || '',
            extractionWarning: deal.extractionWarning || '',
            featured: deal.featured || false,
            isExpired: deal.isExpired || false
        });
        navigate('/admin/add-deal');
    };

    const buildValidatedDealPayload = () => {
        const price = Number(normalizeNumberLike(dealForm.price) || 0);
        const originalPrice = Number(normalizeNumberLike(dealForm.originalPrice) || 0);
        const safeMrp = originalPrice && originalPrice >= price ? originalPrice : originalPrice ? price : '';
        const computedDiscount = safeMrp && price > 0 && safeMrp > price
            ? Math.round(((safeMrp - price) / safeMrp) * 100)
            : Number(normalizeNumberLike(dealForm.discount) || 0);
        const finalUrl = affiliatePreviewUrl || dealForm.affiliateLink || '';
        const payload = {
            ...dealForm,
            link: sanitizeUrl(dealForm.link),
            productUrl: sanitizeUrl(dealForm.link),
            affiliateLink: finalUrl,
            price: price ? price.toString() : '',
            dealPrice: price,
            originalPrice: safeMrp ? safeMrp.toString() : '',
            mrp: safeMrp || price || 0,
            discount: computedDiscount ? `${computedDiscount}%` : '',
            discountPercent: computedDiscount || 0,
            store: dealForm.store || deriveStoreFromUrl(dealForm.link),
            storeName: dealForm.store || deriveStoreFromUrl(dealForm.link),
            rating: Number(dealForm.rating || 0) || 0
        };

        const validationErrors = [];
        if (!payload.title?.trim()) validationErrors.push('Title is required.');
        if (!payload.store?.trim()) validationErrors.push('Store is required.');
        if (!payload.category?.trim()) validationErrors.push('Category is required.');
        if (!price) validationErrors.push('Deal price must be greater than 0.');
        if (!payload.image?.trim()) validationErrors.push('Product image is required.');
        if (!isLikelyHttpUrl(payload.link)) validationErrors.push('Valid original product URL is required.');
        if (safeMrp && safeMrp < price) validationErrors.push('MRP cannot be lower than deal price.');

        return { payload, validationErrors };
    };

    const handleUpdateDeal = async (e) => {
        if (e) e.preventDefault();
        const { payload, validationErrors } = buildValidatedDealPayload();
        if (validationErrors.length) {
            showToast?.(validationErrors[0], 'error');
            return;
        }
        setIsLoading(true);
        try {
            const dealsApi = `${adminApiBase}/admin/deals/${editId}`;
            const r = await fetch(dealsApi, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'auth-token': token() },
                body: JSON.stringify(payload)
            });
            if (r.ok) {
                await r.json().catch(() => ({}));
                await refreshAdminData({ silent: true });
                showToast?.('Deal updated!', 'success');
                navigate('/admin/dashboard');
            } else {
                const error = await r.json().catch(() => ({}));
                showToast?.(error.message || 'Update failed', 'error');
            }
        } catch (error) {
            showToast?.(error.message || 'Server error', 'error');
        }
        finally { setIsLoading(false); }
    };

    const handleDeleteDeal = async (id) => {
        if (!window.confirm('Delete this deal?')) return;
        setIsLoading(true);
        try {
            const dealsApi = `${adminApiBase}/admin/deals/${id}`;
            const r = await fetch(dealsApi, { method: 'DELETE', headers: { 'auth-token': token() } });
            if (r.ok) {
                await refreshAdminData({ silent: true });
                showToast?.('Deal deleted!', 'success');
            } else {
                const error = await r.json().catch(() => ({}));
                showToast?.(error.message || 'Delete failed', 'error');
            }
        } catch (error) {
            showToast?.(error.message || 'Server error', 'error');
        }
        finally { setIsLoading(false); }
    };

    const clearSelectedDeals = () => setSelectedDealIds([]);

    const toggleDealSelection = (deal) => {
        const id = getDealId(deal);
        if (!id) return;
        setSelectedDealIds(prev => prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]);
    };

    const toggleVisibleSelection = () => {
        const visibleIds = filteredDeals.map(getDealId).filter(Boolean);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedDealIds.includes(id));
        setSelectedDealIds(prev => allVisibleSelected
            ? prev.filter((id) => !visibleIds.includes(id))
            : [...new Set([...prev, ...visibleIds])]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedDealIds.length === 0) return;
        if (!window.confirm(`Delete ${selectedDealIds.length} selected deal${selectedDealIds.length === 1 ? '' : 's'}?`)) return;

        setIsLoading(true);
        try {
            const results = await Promise.allSettled(selectedDealIds.map((id) =>
                fetch(`${adminApiBase}/admin/deals/${id}`, {
                    method: 'DELETE',
                    headers: { 'auth-token': token() }
                })
            ));
            const failed = results.filter((result) => result.status === 'rejected' || !result.value?.ok).length;
            clearSelectedDeals();
            await refreshAdminData({ silent: true });
            showToast?.(failed ? `Bulk delete finished. ${failed} failed.` : 'Selected deals deleted.', failed ? 'warning' : 'success');
        } catch (error) {
            showToast?.(error.message || 'Bulk delete failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkFeatured = async (featured) => {
        if (selectedDeals.length === 0) return;

        setIsLoading(true);
        try {
            const results = await Promise.allSettled(selectedDeals.map((deal) =>
                fetch(`${adminApiBase}/admin/deals/${getDealId(deal)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': token()
                    },
                    body: JSON.stringify({ featured })
                })
            ));
            const failed = results.filter((result) => result.status === 'rejected' || !result.value?.ok).length;
            clearSelectedDeals();
            await refreshAdminData({ silent: true });
            showToast?.(failed ? `Bulk update finished. ${failed} failed.` : `Selected deals ${featured ? 'featured' : 'unfeatured'}.`, failed ? 'warning' : 'success');
        } catch (error) {
            showToast?.(error.message || 'Bulk update failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickEditSave = async () => {
        if (!quickEditDeal) return;

        setIsLoading(true);
        try {
            const id = getDealId(quickEditDeal);
            const price = Number(normalizeNumberLike(quickEditDeal.price || quickEditDeal.dealPrice) || 0);
            const mrp = Number(normalizeNumberLike(quickEditDeal.originalPrice || quickEditDeal.mrp) || 0);
            const discount = mrp > price && price > 0
                ? Math.round(((mrp - price) / mrp) * 100)
                : getNumericDiscount(quickEditDeal);
            const payload = {
                ...quickEditDeal,
                price: price ? price.toString() : quickEditDeal.price,
                dealPrice: price,
                originalPrice: mrp ? mrp.toString() : quickEditDeal.originalPrice,
                mrp: mrp || price,
                discount: discount ? `${discount}%` : '',
                discountPercent: discount || 0
            };
            const response = await fetch(`${adminApiBase}/admin/deals/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token()
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'Quick edit failed');

            setQuickEditDeal(null);
            await refreshAdminData({ silent: true });
            showToast?.('Quick edit saved.', 'success');
        } catch (error) {
            showToast?.(error.message || 'Quick edit failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocalAddDeal = async (e) => {
        const { payload, validationErrors } = buildValidatedDealPayload();
        if (validationErrors.length) {
            if (e?.preventDefault) e.preventDefault();
            showToast?.(validationErrors[0], 'error');
            return false;
        }
        if (duplicateCandidatesForForm.length > 0 && !window.confirm('A similar deal already exists. Publish a new listing anyway?')) {
            if (e?.preventDefault) e.preventDefault();
            showToast?.('Publish cancelled. Open the duplicate candidate and update it instead.', 'info');
            return false;
        }

        setIsLoading(true);
        try {
            const success = await handleAddDeal(e, payload);
            if (success) {
                await refreshAdminData({ silent: true });
                navigate('/admin/dashboard');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeaturedToggle = async (deal) => {
        const id = deal._id || deal.id;
        if (!id) return;

        setIsLoading(true);
        try {
            const response = await fetch(`${adminApiBase}/admin/deals/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token()
                },
                body: JSON.stringify({ featured: !deal.featured })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update featured status');
            }

            await refreshAdminData({ silent: true });
            showToast?.(`Deal ${deal.featured ? 'removed from' : 'added to'} featured deals.`, 'success');
        } catch (error) {
            showToast?.(error.message || 'Failed to update featured status', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAffiliateSettingChange = (storeSlug, field, value) => {
        setAffiliateSettings(prev => prev.map(setting =>
            setting.storeSlug === storeSlug
                ? (() => {
                    const nextSetting = { ...setting, [field]: field === 'enabled' ? Boolean(value) : value };
                    nextSetting.pendingSetup = !nextSetting.enabled || !String(nextSetting.paramKey || '').trim() || !String(nextSetting.paramValue || '').trim();
                    return nextSetting;
                })()
                : setting
        ));
    };

    const getSampleProductUrlForAffiliateSetting = useCallback((setting = {}) => {
        const settingSlug = setting.storeSlug || getAffiliateStoreSlug(setting.store);
        const sampleDeal = adminDeals.find((deal) =>
            getAffiliateStoreSlug(deal.storeName || deal.store) === settingSlug
            && sanitizeOriginalUrl(deal.productUrl || deal.link)
        );

        return sanitizeOriginalUrl(
            sampleDeal?.productUrl
            || sampleDeal?.link
            || dealForm.link
            || ''
        );
    }, [adminDeals, dealForm.link]);

    const getAffiliatePreviewForSetting = useCallback((setting = {}) => {
        const sampleUrl = getSampleProductUrlForAffiliateSetting(setting);
        if (!sampleUrl) return '';

        return buildAffiliateUrl({
            url: sampleUrl,
            store: setting.store,
            settings: [setting],
            manualOverride: ''
        });
    }, [getSampleProductUrlForAffiliateSetting]);

    const handleSaveAffiliateSettings = async () => {
        if (!adminApiBase) return;

        setIsSavingAffiliateSettings(true);
        try {
            const response = await fetch(`${adminApiBase}/admin/affiliate-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token()
                },
                body: JSON.stringify({ settings: affiliateSettings })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Failed to save affiliate settings');
            }

            setAffiliateSettings(mergeAffiliateSettings(data.settings, liveAffiliateStoreNames));
            await refreshAdminData({ silent: true });

            showToast?.(`Affiliate settings saved. Reapplied to ${data.reapply?.updated || 0} deals.`, 'success');
        } catch (error) {
            showToast?.(error.message || 'Failed to save affiliate settings', 'error');
        } finally {
            setIsSavingAffiliateSettings(false);
        }
    };

    const resetCouponForm = () => {
        setCouponForm(DEFAULT_COUPON_FORM);
        setEditingCouponId(null);
    };

    const handleCouponFormChange = (field, value) => {
        setCouponForm(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'landingUrl' && !prev.store && deriveStoreFromUrl(value)
                ? { store: deriveStoreFromUrl(value) }
                : {})
        }));
    };

    const handleCouponSubmit = async (event) => {
        event?.preventDefault?.();
        if (!adminApiBase) return;

        setIsSavingCoupon(true);
        try {
            const endpoint = editingCouponId
                ? `${adminApiBase}/admin/coupons/${editingCouponId}`
                : `${adminApiBase}/admin/coupons`;
            const response = await fetch(endpoint, {
                method: editingCouponId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token()
                },
                body: JSON.stringify(couponForm)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Failed to save coupon');
            }
            showToast?.(editingCouponId ? 'Coupon updated successfully.' : 'Coupon created successfully.', 'success');
            resetCouponForm();
            await refreshCoupons();
        } catch (error) {
            showToast?.(error.message || 'Failed to save coupon', 'error');
        } finally {
            setIsSavingCoupon(false);
        }
    };

    const handleEditCoupon = (coupon) => {
        const normalized = normalizeCouponForAdmin(coupon);
        setCouponForm(normalized);
        setEditingCouponId(normalized._id || normalized.id);
    };

    const handleDeleteCoupon = async (couponId) => {
        if (!adminApiBase || !couponId) return;
        if (!window.confirm('Delete this coupon?')) return;

        try {
            const response = await fetch(`${adminApiBase}/admin/coupons/${couponId}`, {
                method: 'DELETE',
                headers: { 'auth-token': token() }
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete coupon');
            }
            showToast?.('Coupon deleted.', 'success');
            if (editingCouponId === couponId) resetCouponForm();
            await refreshCoupons();
        } catch (error) {
            showToast?.(error.message || 'Failed to delete coupon', 'error');
        }
    };

    const handleFetchUrl = async (urlParam) => {
        const url = sanitizeUrl(urlParam || dealForm.link);
        if (!url) { setFetchStatus({ type: 'error', msg: 'Enter a URL first' }); return null; }
        if (!isLikelyHttpUrl(url)) { setFetchStatus({ type: 'error', msg: 'Enter a valid http/https URL' }); return null; }
        setFetchStatus({ type: 'loading', msg: 'Extracting deal info...' });
        setIsLoading(true);
        try {
            const extractApi = apiBase.replace('/user', '') + '/deals/extract';
            const r = await fetch(extractApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'auth-token': token() },
                body: JSON.stringify({ url })
            });
            let data = {};
            try {
                data = await r.json();
            } catch (parseErr) {
                data = { message: 'Invalid server response' };
            }

            if (r.ok) {
                const fields = ['title', 'image', 'images', 'price', 'originalPrice', 'discount', 'store', 'description'];
                const populated = new Set();
                const normalizedPrice = normalizeNumberLike(data.price);
                const normalizedOriginalPrice = normalizeNumberLike(data.originalPrice);
                const fallbackStore = data.store || deriveStoreFromUrl(data.link || url);
                const computedDiscount = (!data.discount && normalizedPrice && normalizedOriginalPrice &&
                    Number(normalizedOriginalPrice) > Number(normalizedPrice))
                    ? `${Math.round((1 - Number(normalizedPrice) / Number(normalizedOriginalPrice)) * 100)}%`
                    : '';

                const nextForm = { ...dealForm };
                fields.forEach(f => {
                    if (data[f] != null && data[f] !== '') { nextForm[f] = data[f]; populated.add(f); }
                });
                if (normalizedPrice) { nextForm.price = normalizedPrice; populated.add('price'); }
                if (normalizedOriginalPrice) { nextForm.originalPrice = normalizedOriginalPrice; populated.add('originalPrice'); }
                if (!nextForm.store && fallbackStore) { nextForm.store = fallbackStore; populated.add('store'); }
                if (!nextForm.discount && computedDiscount) { nextForm.discount = computedDiscount; populated.add('discount'); }
                if (data.link) nextForm.link = data.link;
                if (!data.link) nextForm.link = url;
                if (data.extractionWarning) nextForm.extractionWarning = data.extractionWarning;
                else nextForm.extractionWarning = '';

                setDealForm(nextForm);
                setAutoPopulated(populated);
                setFetchStatus({ type: 'success', msg: `✓ Extracted ${populated.size} fields` });
                showToast?.('Smart Extraction Complete!', 'success');

                return nextForm;
            } else {
                if (r.status === 401) {
                    localStorage.removeItem('auth-token');
                    localStorage.removeItem('user');
                    window.location.reload();
                    return null;
                }
                let msg = 'Extraction limited';
                if (r.status === 403) msg = 'Extraction restricted by store';
                if (r.status === 400) msg = data.message || 'Invalid Request / URL';
                setFetchStatus({ type: 'error', msg });
                return null;
            }
        } catch (err) {
            setFetchStatus({ type: 'error', msg: 'Network error or server down' });
            return null;
        }
        finally { setIsLoading(false); }
    };

    const clearAuto = (field) => setAutoPopulated(prev => { const n = new Set(prev); n.delete(field); return n; });

    /* ── stat cards ── */
    const STATS = [
        { label: 'Total Deals', value: dashboardStats?.totalDeals ?? adminDeals.length, icon: Package, color: 'bg-orange-500', light: 'bg-orange-50', textColor: 'text-orange-600' },
        { label: 'Active Stores', value: dashboardStats?.totalStores ?? stores.length, icon: Activity, color: 'bg-blue-500', light: 'bg-blue-50', textColor: 'text-blue-600' },
        { label: 'Categories', value: dashboardStats?.totalCategories ?? categories.length, icon: TrendingUp, color: 'bg-emerald-500', light: 'bg-emerald-50', textColor: 'text-emerald-600' },
        { label: 'Featured Deals', value: dashboardStats?.featuredDeals ?? adminDeals.filter((deal) => deal.featured).length, icon: Flame, color: 'bg-amber-500', light: 'bg-amber-50', textColor: 'text-amber-600' },
        { label: 'Avg Discount', value: `${adminInsights.avgDiscount}%`, icon: TrendingDown, color: 'bg-rose-500', light: 'bg-rose-50', textColor: 'text-rose-600' },
    ];

    const NAV = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'manage-deals', label: 'Manage Deals', icon: Package },
        { id: 'add-deal', label: 'Add Deal', icon: PlusCircle },
        { id: 'coupons', label: 'Coupons', icon: BadgePercent },
        { id: 'affiliate-tags', label: 'Affiliate Tags', icon: ExternalLink },
    ];

    /* ────────── label helper for auto-filled fields ────────── */
    const AutoBadge = ({ field }) => autoPopulated.has(field) ? (
        <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
            <CheckCircle size={8} /> Auto
        </span>
    ) : null;

    /* ────────── clean input class ────────── */
    const inputCls = 'w-full bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-xl py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:bg-white transition-all duration-300 font-medium hover:bg-white/80 shadow-sm';

    /* ─── render ─── */
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <Helmet>
                <title>Admin Panel | {SITE_NAME}</title>
                <meta name="robots" content="noindex,nofollow" />
                <meta name="application-name" content={SITE_NAME} />
            </Helmet>

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* ═══ SIDEBAR ═══ */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 h-screen flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
                    <img src="/logo.png" alt="DealSphere" className="h-14 w-auto object-contain bg-white rounded-xl p-1.5 shadow-sm scale-110" />
                    <div className="text-xl font-black tracking-tighter flex items-center">
                        <span className="text-[#1E3A8A]">Deal</span>
                        <span className="text-[#F97316]">Sphere</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="ml-auto text-slate-400 lg:hidden hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                {/* Admin info */}
                <div className="mx-4 my-3 bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow flex-shrink-0">
                        <Shield size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{user?.name || 'Admin'}</p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            </span>
                            Session Secure
                        </p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-2 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mt-2 mb-2">Navigation</p>
                    {NAV.map(item => {
                        const active = activeTab === item.id;
                        return (
                            <button key={item.id} onClick={() => { navigate(item.id === 'dashboard' ? '/admin/dashboard' : `/admin/${item.id}`); setIsSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                <item.icon size={17} />
                                {item.label}
                                {item.id === 'manage-deals' && (
                                    <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {adminDeals.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* View Website */}
                <div className="p-4 border-t border-slate-100">
                    <Link to="/" className="w-full mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">
                        <ExternalLink size={15} />
                        View Website
                    </Link>
                </div>
            </aside>

            {/* ═══ MAIN ═══ */}
            <main className="flex-1 min-w-0 h-screen overflow-y-auto flex flex-col">

                {/* Top header */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden">
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 capitalize">{activeTab.replace('-', ' ')}</h1>
                            <p className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search deals..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-orange-400 w-52 transition-all" />
                        </div>
                        <button
                            type="button"
                            onClick={() => refreshAdminData()}
                            disabled={isRefreshingData}
                            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                        >
                            {isRefreshingData ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Refreshing</span>
                                </>
                            ) : (
                                <>
                                    <Activity size={16} />
                                    <span className="hidden sm:inline">Refresh</span>
                                </>
                            )}
                        </button>
                        <button onClick={() => { navigate('/admin/add-deal'); setEditMode(false); }}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-orange-200 transition-all active:scale-95">
                            <PlusCircle size={16} />
                            <span className="hidden sm:inline">Add Deal</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-6">
                    {adminError && (
                        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={16} />
                                <span>{adminError}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => refreshAdminData()}
                                className="text-xs font-black uppercase tracking-wider text-rose-700 hover:text-rose-900"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        {/* ═══════════ DASHBOARD ═══════════ */}
                        {activeTab === 'dashboard' && (
                            <motion.div key="dashboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">

                                {/* Stat Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    {STATS.map((s, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                            className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-200/50 p-6 transition-all hover:shadow-orange-100/50 hover:bg-white/90 hover:shadow-md hover:-translate-y-0.5">
                                            {isStatsLoading ? (
                                                <div className="animate-pulse space-y-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                                                    <div className="h-7 w-16 bg-slate-100 rounded-lg" />
                                                    <div className="h-3 w-20 bg-slate-50 rounded" />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className={`w-10 h-10 ${s.light} rounded-xl flex items-center justify-center mb-4`}>
                                                        <s.icon size={20} className={s.textColor} />
                                                    </div>
                                                    <div className="text-2xl font-black text-slate-900">{s.value}</div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <div className="text-xs font-bold text-slate-400">{s.label}</div>
                                                        <div className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">Live</div>
                                                    </div>
                                                </>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                    {[
                                        {
                                            label: 'Top Store',
                                            value: adminInsights.topStore?.store || adminInsights.topStore?.name || 'No store yet',
                                            detail: adminInsights.topStore ? `${adminInsights.topStore.count || adminInsights.topStore.dealsCount || 0} live deals` : 'Stores appear after deals publish',
                                            icon: ShoppingCart,
                                            tone: 'blue'
                                        },
                                        {
                                            label: 'Most Clicked',
                                            value: adminInsights.topClickedDeals[0]?.title || 'No click data yet',
                                            detail: adminInsights.topClickedDeals[0] ? `${getDealViews(adminInsights.topClickedDeals[0]).toLocaleString('en-IN')} tracked views` : 'Views update when product pages are opened',
                                            icon: Activity,
                                            tone: 'emerald'
                                        },
                                        {
                                            label: 'Best Discount',
                                            value: adminInsights.topDiscountDeals[0]?.title || 'No discounts yet',
                                            detail: adminInsights.topDiscountDeals[0] ? `${getNumericDiscount(adminInsights.topDiscountDeals[0])}% OFF · ${adminInsights.topDiscountDeals[0].store}` : 'Add MRP + price to calculate',
                                            icon: Flame,
                                            tone: 'orange'
                                        },
                                        {
                                            label: 'Data Health',
                                            value: adminInsights.incompleteDeals.length ? `${adminInsights.incompleteDeals.length} need review` : 'Catalog clean',
                                            detail: `${adminInsights.duplicateCount} possible duplicate${adminInsights.duplicateCount === 1 ? '' : 's'} detected`,
                                            icon: Shield,
                                            tone: adminInsights.incompleteDeals.length || adminInsights.duplicateCount ? 'amber' : 'emerald'
                                        }
                                    ].map(({ label, value, detail, icon: Icon, tone }) => {
                                        const toneCls = {
                                            blue: 'bg-blue-50 text-blue-600 border-blue-100',
                                            emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                            orange: 'bg-orange-50 text-orange-600 border-orange-100',
                                            amber: 'bg-amber-50 text-amber-700 border-amber-100'
                                        }[tone];
                                        return (
                                            <div key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                                                <div className="mb-4 flex items-center justify-between gap-3">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
                                                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneCls}`}>
                                                        <Icon size={18} />
                                                    </span>
                                                </div>
                                                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-black leading-snug text-slate-900">{value}</p>
                                                <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">{detail}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Category chart + recent deals */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Category bar chart */}
                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-base font-black text-slate-900">Deals by Category</h3>
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">Distribution across all categories</p>
                                            </div>
                                        </div>
                                        {dashboardStats ? (
                                            <div className="flex items-end gap-3 h-44">
                                                {Object.entries(dashboardStats.categoryStats ?? {}).slice(0, 8).map(([cat, count], idx) => {
                                                    const pct = Math.max(8, (count / (dashboardStats.totalDeals || 1)) * 100);
                                                    const COLORS = ['bg-orange-400', 'bg-blue-400', 'bg-emerald-400', 'bg-purple-400', 'bg-amber-400', 'bg-rose-400', 'bg-cyan-400', 'bg-pink-400'];
                                                    return (
                                                        <div key={cat} onClick={() => setSearchQuery(cat)} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end cursor-pointer">
                                                            <div className="text-[9px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                                                            <motion.div
                                                                initial={{ height: 0 }}
                                                                animate={{ height: `${pct}%` }}
                                                                transition={{ delay: 0.3 + idx * 0.05, ease: 'easeOut' }}
                                                                className={`w-full rounded-t-lg ${COLORS[idx % COLORS.length]} opacity-80 group-hover:opacity-100 transition-opacity`}
                                                            />
                                                            <div className="flex flex-col items-center gap-0.5 w-full">
                                                                {React.createElement(CATEGORY_MAP[cat] || DEFAULT_CAT_ICON, { size: 10, className: "text-slate-300 group-hover:text-orange-400 transition-colors" })}
                                                                <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center group-hover:text-orange-500 transition-colors">{cat.substring(0, 8)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="h-44 flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Recent deals */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-black text-slate-900">
                                                {searchQuery ? `Deals: ${searchQuery}` : 'Recent Deals'}
                                            </h3>
                                            {searchQuery && (
                                                <button onClick={() => setSearchQuery('')} className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors">
                                                    Clear Filter
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                            {(searchQuery ? filteredDeals : (dashboardStats?.recentDeals ?? adminDeals.slice(0, 8))).slice(0, 8).map((deal, i) => (
                                                <div key={i} className="flex items-center gap-3 group">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                                        {deal.image ? <img src={optimizeImageUrl(deal.image)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-orange-100" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate group-hover:text-orange-600 transition-colors">{deal.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-[10px] text-slate-400 font-medium">{deal.store}</p>
                                                            {deal.category && (
                                                                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-100 shadow-sm">
                                                                    {React.createElement(CATEGORY_MAP[deal.category] || DEFAULT_CAT_ICON, { size: 10, className: "text-orange-500" })}
                                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{deal.category}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-xs font-black text-orange-600">{getDealDisplayPrice(deal)}</div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteDeal(deal._id || deal.id); }}
                                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remove Deal">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {!searchQuery && (!dashboardStats?.recentDeals?.length && !adminDeals.length) && (
                                                <div className="text-center py-8 text-sm text-slate-400 font-medium">
                                                    No deals found yet. Add your first live deal to populate the dashboard.
                                                </div>
                                            )}
                                            {searchQuery && filteredDeals.length === 0 && (
                                                <div className="text-center py-8 text-sm text-slate-400 font-medium">
                                                    No deals match "{searchQuery}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Store breakdown table */}
                                {stores.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                        <h3 className="text-base font-black text-slate-900 mb-4">Deals by Store</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {stores.slice(0, 8).map(({ store, count }) => (
                                                <div key={store}
                                                    onClick={() => setSearchQuery(store)}
                                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-all group">
                                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-sm font-black text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                                        {store[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-slate-700 group-hover:text-orange-700 transition-colors">{store}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 group-hover:text-orange-500 transition-colors">{count} deals</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}


                        {/* ═══════════ ADD / EDIT DEAL ═══════════ */}
                        {activeTab === 'manage-deals' && (
                            <motion.div
                                key="manage-deals"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900">All Deals</h2>
                                            <p className="text-sm text-slate-500 font-medium">
                                                Live database data with instant refresh after every admin action.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
                                            <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">{adminDeals.length} total</span>
                                            <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">{filteredDeals.length} visible</span>
                                            <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">{adminDeals.filter((deal) => deal.featured).length} featured</span>
                                        </div>
                                    </div>

                                    <div className="mb-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                                            <select className={inputCls} value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)}>
                                                {storeFilterOptions.map((store) => <option key={store} value={store}>{store === 'All' ? 'All stores' : store}</option>)}
                                            </select>
                                            <select className={inputCls} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                                                {categoryFilterOptions.map((category) => <option key={category} value={category}>{category === 'All' ? 'All categories' : category}</option>)}
                                            </select>
                                            <select className={inputCls} value={discountFilter} onChange={(event) => setDiscountFilter(event.target.value)}>
                                                <option value="All">All discounts</option>
                                                <option value="50+">50%+ off</option>
                                                <option value="25+">25%+ off</option>
                                                <option value="1-24">1-24% off</option>
                                                <option value="0">No discount</option>
                                            </select>
                                            <select className={inputCls} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                                                <option value="All">All dates</option>
                                                <option value="24h">Last 24 hours</option>
                                                <option value="7d">Last 7 days</option>
                                                <option value="30d">Last 30 days</option>
                                            </select>
                                            <select className={inputCls} value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                                                <option value="newest">Sort: newest</option>
                                                <option value="price-low">Price: low to high</option>
                                                <option value="price-high">Price: high to low</option>
                                                <option value="discount">Best discount</option>
                                                <option value="clicked">Most clicked</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setDuplicateOnly(value => !value)}
                                                className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${duplicateOnly ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'}`}
                                            >
                                                Duplicates {adminInsights.duplicateCount ? `(${adminInsights.duplicateCount})` : ''}
                                            </button>
                                        </div>
                                    </div>

                                    {selectedDealIds.length > 0 && (
                                        <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-blue-100 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-sm font-black text-blue-950">{selectedDealIds.length} deal{selectedDealIds.length === 1 ? '' : 's'} selected</p>
                                                <p className="text-xs font-semibold text-blue-700">Bulk actions use the same live admin API as individual edits.</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" onClick={() => handleBulkFeatured(true)} disabled={isLoading} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">
                                                    Feature
                                                </button>
                                                <button type="button" onClick={() => handleBulkFeatured(false)} disabled={isLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">
                                                    Unfeature
                                                </button>
                                                <button type="button" onClick={handleBulkDelete} disabled={isLoading} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">
                                                    Delete
                                                </button>
                                                <button type="button" onClick={clearSelectedDeals} className="rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600">
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!adminDeals.length ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                            <Package size={28} className="mx-auto mb-3 text-slate-300" />
                                            <h3 className="text-lg font-black text-slate-800">No deals available</h3>
                                            <p className="text-sm text-slate-500 mt-2">Publish a deal to see it appear here with live pricing, categories, and store details.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="hidden xl:block overflow-hidden rounded-2xl border border-slate-200">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-slate-200">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={filteredDeals.length > 0 && filteredDeals.every((deal) => selectedDealIds.includes(getDealId(deal)))}
                                                                        onChange={toggleVisibleSelection}
                                                                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                                        aria-label="Select visible deals"
                                                                    />
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Deal</th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Store</th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Category</th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Deal Price</th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">MRP</th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Discount</th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Featured</th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Created</th>
                                                                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 bg-white">
                                                            {filteredDeals.map((deal) => (
                                                                <tr key={deal._id || deal.id} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="px-4 py-4 align-top">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedDealIds.includes(getDealId(deal))}
                                                                            onChange={() => toggleDealSelection(deal)}
                                                                            className="mt-5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                                            aria-label={`Select ${deal.title || 'deal'}`}
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-4">
                                                                        <div className="flex items-center gap-3 min-w-[280px]">
                                                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                                                                {deal.image ? (
                                                                                    <img src={optimizeImageUrl(deal.image)} alt={deal.title} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <div className="w-full h-full bg-slate-100" />
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-start gap-2">
                                                                                    <div className="text-sm font-black text-slate-900 line-clamp-2">{deal.title || 'Untitled deal'}</div>
                                                                                    {duplicateIdSet.has(getDealId(deal)) && (
                                                                                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-800">Dup?</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-xs text-slate-500 mt-1 truncate max-w-[280px]">{sanitizeOriginalUrl(deal.productUrl || deal.link || '') || 'No product URL'}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-4 text-sm font-bold text-slate-700">{deal.store || 'Online Store'}</td>
                                                                    <td className="px-4 py-4 text-sm text-slate-600">{deal.category || 'Other'}</td>
                                                                    <td className="px-4 py-4 text-sm font-black text-slate-900">{getDealDisplayPrice(deal)}</td>
                                                                    <td className="px-4 py-4 text-sm text-slate-500">{getDealDisplayMrp(deal)}</td>
                                                                    <td className="px-4 py-4">
                                                                        <span className="inline-flex px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                                                                            {getDealDisplayDiscount(deal)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-4">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleFeaturedToggle(deal)}
                                                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black transition-colors ${deal.featured ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                                        >
                                                                            {deal.featured ? 'Featured' : 'Not featured'}
                                                                        </button>
                                                                    </td>
                                                                    <td className="px-4 py-4 text-sm text-slate-500">{formatDealDate(deal.createdAt)}</td>
                                                                    <td className="px-4 py-4">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setQuickEditDeal({
                                                                                    ...deal,
                                                                                    price: normalizeNumberLike(deal.dealPrice || deal.price),
                                                                                    originalPrice: normalizeNumberLike(deal.mrp || deal.originalPrice),
                                                                                    discount: normalizeNumberLike(deal.discountPercent || deal.discount)
                                                                                })}
                                                                                className="inline-flex items-center gap-1 rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
                                                                            >
                                                                                <Edit3 size={13} />
                                                                                Quick
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleEditClick(deal)}
                                                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                                                                            >
                                                                                <Pencil size={13} />
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteDeal(deal._id || deal.id)}
                                                                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                                                                            >
                                                                                <Trash2 size={13} />
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="xl:hidden space-y-4">
                                                {filteredDeals.map((deal) => (
                                                    <div key={deal._id || deal.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                        <div className="mb-3 flex items-center justify-between gap-3">
                                                            <label className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedDealIds.includes(getDealId(deal))}
                                                                    onChange={() => toggleDealSelection(deal)}
                                                                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                                />
                                                                Select
                                                            </label>
                                                            {duplicateIdSet.has(getDealId(deal)) && (
                                                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800">Duplicate?</span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                                                {deal.image ? (
                                                                    <img src={optimizeImageUrl(deal.image)} alt={deal.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-slate-100" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <h3 className="text-sm font-black text-slate-900 line-clamp-2">{deal.title || 'Untitled deal'}</h3>
                                                                        <p className="text-xs text-slate-500 mt-1">{deal.store || 'Online Store'} · {deal.category || 'Other'}</p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleFeaturedToggle(deal)}
                                                                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${deal.featured ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
                                                                    >
                                                                        {deal.featured ? 'Featured' : 'Standard'}
                                                                    </button>
                                                                </div>
                                                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                                                    <div>
                                                                        <div className="text-slate-400 font-semibold">Deal</div>
                                                                        <div className="text-slate-900 font-black">{getDealDisplayPrice(deal)}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-slate-400 font-semibold">MRP</div>
                                                                        <div className="text-slate-700 font-bold">{getDealDisplayMrp(deal)}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-slate-400 font-semibold">Discount</div>
                                                                        <div className="text-emerald-700 font-black">{getDealDisplayDiscount(deal)}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-3 text-xs text-slate-400">Created {formatDealDate(deal.createdAt)}</div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setQuickEditDeal({
                                                                    ...deal,
                                                                    price: normalizeNumberLike(deal.dealPrice || deal.price),
                                                                    originalPrice: normalizeNumberLike(deal.mrp || deal.originalPrice),
                                                                    discount: normalizeNumberLike(deal.discountPercent || deal.discount)
                                                                })}
                                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-50"
                                                            >
                                                                <Edit3 size={14} />
                                                                Quick
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditClick(deal)}
                                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                                                            >
                                                                <Pencil size={14} />
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteDeal(deal._id || deal.id)}
                                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-black text-rose-600 hover:bg-rose-50"
                                                            >
                                                                <Trash2 size={14} />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {filteredDeals.length === 0 && (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm font-semibold text-slate-500">
                                                    No deals matched the current search / filter settings.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'add-deal' && (
                            <motion.div key="add-deal" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="max-w-5xl mx-auto relative z-10">

                                {/* Decorative Glow Background */}
                                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-400/10 via-rose-400/5 to-purple-500/10 blur-3xl rounded-[3rem] pointer-events-none" />

                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                                                {editMode ? <Pencil size={20} /> : <Zap size={20} fill="currentColor" />}
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editMode ? 'Edit Deal' : 'Add New Deal'}</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 font-semibold pl-14">{editMode ? 'Update an existing deal' : 'Paste a product URL to automatically extract details'}</p>
                                    </div>
                                    {editMode && (
                                        <button onClick={() => { setEditMode(false); setDealForm(DEFAULT_DEAL_FORM); }}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-all active:scale-95 shadow-sm">
                                            <X size={14} /> Cancel Edit
                                        </button>
                                    )}
                                </div>

                                {/* ════ HERO LINK BAR (AI SEARCH AESTHETIC) ════ */}
                                <div className="mb-10 relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-rose-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                                    <div className="relative bg-white/80 backdrop-blur-2xl rounded-full border border-white max-w-5xl mx-auto shadow-2xl shadow-slate-200/50 flex items-center p-2 focus-within:ring-4 focus-within:ring-orange-500/20 transition-all duration-500">

                                        <div className="pl-4 sm:pl-6 flex items-center pointer-events-none">
                                            <div className="relative w-10 h-10 flex items-center justify-center">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-full blur-[6px] opacity-70 animate-pulse" />
                                                <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-full flex items-center justify-center text-white relative z-10 shadow-inner">
                                                    <Sparkles size={18} className="text-white" />
                                                </div>
                                            </div>
                                        </div>

                                        <input
                                            type="url"
                                            className="w-full bg-transparent border-none py-4 px-4 sm:px-6 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-bold tracking-tight"
                                            placeholder="Paste a product URL here for automatic extraction..."
                                            value={dealForm.link}
                                            onChange={e => { setDealForm({ ...dealForm, link: e.target.value }); clearAuto('link'); }}
                                            onKeyDown={e => { if (e.key === 'Enter' && !isLoading) { e.preventDefault(); handleFetchUrl(e.currentTarget.value); } }}
                                            onPaste={(e) => {
                                                const text = e.clipboardData.getData('text');
                                                if (text && !isLoading) {
                                                    // Trigger fetch with pasted content
                                                    setTimeout(() => handleFetchUrl(text), 50);
                                                }
                                            }}
                                            required
                                        />

                                        <div className="pr-4 sm:pr-6 flex items-center gap-3">
                                            {isLoading && fetchStatus?.type === 'loading' ? (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full border border-orange-100 whitespace-nowrap">
                                                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="hidden sm:inline text-xs font-black tracking-wide">Extracting...</span>
                                                </div>
                                            ) : fetchStatus.type ? (
                                                <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border whitespace-nowrap shadow-sm backdrop-blur-md ${fetchStatus.type === 'success' ? 'bg-green-50/90 text-green-700 border-green-200' : 'bg-red-50/90 text-red-700 border-red-200'}`}>
                                                    {fetchStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                    <span className="hidden sm:inline text-xs font-black tracking-wide">{fetchStatus.msg}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {dealForm.extractionWarning && (
                                        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold px-4 py-2 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shadow-sm relative z-10 w-fit mx-auto text-center">
                                            <AlertCircle size={14} className="flex-shrink-0" /> {dealForm.extractionWarning}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                    {/* LEFT: Form */}
                                    <div className="lg:col-span-3 space-y-5">

                                        {/* Product info */}
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50">
                                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                                <Package size={14} className="text-orange-500" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Product Info</span>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Title *</label>
                                                        <AutoBadge field="title" />
                                                    </div>
                                                    <input type="text" className={inputCls} placeholder="e.g. Samsung Galaxy S24 Ultra..."
                                                        value={dealForm.title} onChange={e => { setDealForm({ ...dealForm, title: e.target.value }); clearAuto('title'); }} required />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Store *</label>
                                                            <AutoBadge field="store" />
                                                        </div>
                                                        <input type="text" className={inputCls} placeholder="Amazon, Flipkart..."
                                                            value={dealForm.store} onChange={e => { setDealForm({ ...dealForm, store: e.target.value }); clearAuto('store'); }} required />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Category *</label>
                                                            <AutoBadge field="category" />
                                                        </div>
                                                        <select
                                className={inputCls + " cursor-pointer"}
                                value={dealForm.category}
                                onChange={e => { setDealForm({ ...dealForm, category: e.target.value }); clearAuto('category'); }}
                                required
                            >
                                <option value="">Select Category</option>
                                {formCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Description</label>
                                                        <AutoBadge field="description" />
                                                    </div>
                                                    <textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder="Short product description..."
                                                        value={dealForm.description} onChange={e => { setDealForm({ ...dealForm, description: e.target.value }); clearAuto('description'); }} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50">
                                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                                <DollarSign size={14} className="text-emerald-500" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Pricing</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { label: 'Deal Price *', field: 'price', prefix: '₹', type: 'number', required: true },
                                                    { label: 'MRP', field: 'originalPrice', prefix: '₹', type: 'number' },
                                                    { label: 'Discount', field: 'discount', placeholder: '50%' },
                                                ].map(({ label, field, prefix, type = 'text', required, placeholder }) => (
                                                    <div key={field}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide">{label}</label>
                                                            <AutoBadge field={field} />
                                                        </div>
                                                        <div className="relative">
                                                            {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">{prefix}</span>}
                                                            <input type={type} className={`${inputCls} ${prefix ? 'pl-7' : ''}`}
                                                                placeholder={placeholder || '0'}
                                                                value={dealForm[field] ?? ''}
                                                                onChange={e => { setDealForm({ ...dealForm, [field]: e.target.value }); clearAuto(field); }}
                                                                required={required} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {dealForm.price && dealForm.originalPrice && Number(dealForm.originalPrice) > Number(dealForm.price) && (
                                                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                                    <TrendingUp size={14} className="text-emerald-600" />
                                                    <span className="text-xs font-black text-emerald-700">
                                                        Saving ₹{(Number(dealForm.originalPrice) - Number(dealForm.price)).toLocaleString('en-IN')} · {Math.round((1 - Number(dealForm.price) / Number(dealForm.originalPrice)) * 100)}% OFF
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Media & link */}
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50">
                                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                                <ImageIcon size={14} className="text-purple-500" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Media & Link</span>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide mb-1.5 block">Product URL *</label>
                                                    <input
                                                        type="url"
                                                        className={inputCls}
                                                        placeholder="https://www.amazon.in/dp/..."
                                                        value={dealForm.link}
                                                        onChange={e => { setDealForm({ ...dealForm, link: e.target.value }); clearAuto('link'); }}
                                                        required
                                                    />
                                                    <p className="mt-2 text-[11px] text-slate-500 font-medium">This stays as the original product URL used for extraction and canonical storage.</p>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide mb-1.5 block">Affiliate URL Override</label>
                                                    <input
                                                        type="url"
                                                        className={inputCls}
                                                        placeholder="Optional manual affiliate URL"
                                                        value={dealForm.affiliateOverrideLink || ''}
                                                        onChange={e => setDealForm({ ...dealForm, affiliateOverrideLink: e.target.value })}
                                                    />
                                                    <p className="mt-2 text-[11px] text-slate-500 font-medium">Leave blank to auto-build the affiliate link from the selected store rule.</p>
                                                </div>

                                                {affiliatePreviewUrl && (
                                                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Final Affiliate URL Preview</p>
                                                        <p className="text-xs font-medium text-blue-900 break-all">{affiliatePreviewUrl}</p>
                                                    </div>
                                                )}

                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Image URL *</label>
                                                        <AutoBadge field="image" />
                                                    </div>
                                                    <div className="relative mb-4">
                                                        <ImageIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="url" className={`${inputCls} pl-10`} placeholder="https://cdn.example.com/product.jpg"
                                                            value={dealForm.image} onChange={e => { setDealForm({ ...dealForm, image: e.target.value }); clearAuto('image'); }} required />
                                                    </div>

                                                    {dealForm.images && dealForm.images.length > 0 && (
                                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                <ImageIcon size={12} /> Extracted Images Preview (All will be saved)
                                                            </label>
                                                            <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                                                {dealForm.images.map((imgUrl, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className={`relative group/img flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden snap-center cursor-pointer transition-all ${dealForm.image === imgUrl ? 'ring-4 ring-orange-500 shadow-md scale-105' : 'bg-slate-50 border border-slate-200 hover:border-orange-300'}`}
                                                                        onClick={() => setDealForm({ ...dealForm, image: imgUrl })}
                                                                    >
                                                                        <img
                                                                            src={optimizeImageUrl(imgUrl)}
                                                                            alt={`Scraped Image ${idx}`}
                                                                            className="w-full h-full object-contain relative z-10"
                                                                            loading="lazy"
                                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                                        />
                                                                        
                                                                        {/* Delete Button */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const newImages = dealForm.images.filter((_, i) => i !== idx);
                                                                                setDealForm({
                                                                                    ...dealForm,
                                                                                    images: newImages,
                                                                                    image: dealForm.image === imgUrl ? (newImages[0] || '') : dealForm.image
                                                                                });
                                                                            }}
                                                                            className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity z-30 shadow-lg"
                                                                            title="Remove this image"
                                                                        >
                                                                            <X size={12} strokeWidth={3} />
                                                                        </button>

                                                                        {dealForm.image === imgUrl && (
                                                                            <div className="absolute inset-0 bg-orange-500/20 z-20 flex items-center justify-center pointer-events-none">
                                                                                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                                                                    <CheckCircle size={14} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                            {/* Featured Deal Toggle */}
                                            <div className="flex-1 flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                                <div>
                                                    <label className="text-sm font-bold text-indigo-900 block mb-0.5">Feature in Slider</label>
                                                    <span className="text-[10px] sm:text-xs text-indigo-600/80 font-medium leading-tight block">Showcase at the top of homepage</span>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer ml-2">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={dealForm.featured || false}
                                                        onChange={e => setDealForm({ ...dealForm, featured: e.target.checked })}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>

                                            {/* Expired Deal Toggle */}
                                            {editMode && <div className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div>
                                                    <label className="text-sm font-bold text-slate-900 block mb-0.5">Mark as Expired</label>
                                                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium leading-tight block">Grey out deal, hide Get Deal button</span>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer ml-2">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={dealForm.isExpired || false}
                                                        onChange={e => setDealForm({ ...dealForm, isExpired: e.target.checked })}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-800"></div>
                                                </label>
                                            </div>}
                                        </div>

                                        {/* Submit buttons */}
                                        <div className="flex gap-4 mt-8">
                                            <button type="button" disabled={isLoading}
                                                onClick={editMode ? handleUpdateDeal : handleLocalAddDeal}
                                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black py-4 rounded-2xl text-base shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(243,62,110,0.5)] transition-all duration-300 active:scale-95 disabled:opacity-60 overflow-hidden relative group">
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                                <div className="relative z-10 flex items-center gap-2">
                                                    {isLoading
                                                        ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {fetchStatus?.type === 'loading' ? 'Extracting...' : 'Publishing...'}</>
                                                        : editMode
                                                            ? <><Pencil size={18} /> Update Deal</>
                                                            : <><Zap size={18} fill="currentColor" /> Publish Deal</>
                                                    }
                                                </div>
                                            </button>
                                            {editMode && (
                                                <button type="button"
                                                    onClick={() => { setEditMode(false); setDealForm(DEFAULT_DEAL_FORM); }}
                                                    className="px-6 py-4 rounded-2xl text-sm font-black text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT: Live Preview */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50 p-6 sticky top-24 overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100/50 relative z-10">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Live Preview</span>
                                            </div>

                                            {dealForm.image ? (
                                                <div className="rounded-3xl overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-100 group/card relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                                                    <div className="relative bg-white h-60 flex items-center justify-center p-8 overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-transparent pointer-events-none" />
                                                        <img src={optimizeImageUrl(dealForm.image)} alt="Preview" className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-md z-10 transition-transform duration-500 group-hover/card:scale-105" />
                                                        {dealForm.discount && (
                                                            <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-orange-500/30 z-20">
                                                                {dealForm.discount} OFF
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-6 space-y-4 relative bg-white z-20 border-t border-slate-50">
                                                        <div className="flex items-center justify-between">
                                                            {dealForm.store && (
                                                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                                    {dealForm.store}
                                                                </span>
                                                            )}
                                                            {dealForm.category && (
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    {dealForm.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-base font-bold text-slate-800 line-clamp-2 leading-snug">{dealForm.title || 'Product Title'}</p>
                                                        <div className="flex items-end gap-3 pt-1">
                                                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                                                {dealForm.price ? `₹${Number(dealForm.price).toLocaleString('en-IN')}` : '₹0'}
                                                            </span>
                                                            {dealForm.originalPrice && (
                                                                <span className="text-sm font-semibold text-slate-400 line-through mb-1.5">
                                                                    ₹{Number(dealForm.originalPrice).toLocaleString('en-IN')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button disabled className="w-full bg-slate-900 text-white text-[13px] font-black py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-slate-900/10 opacity-90">
                                                            <span>GET DEAL NOW</span> <ExternalLink size={14} className="opacity-80" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-[22rem] border-2 border-dashed border-slate-200/60 rounded-[2rem] flex flex-col items-center justify-center gap-5 bg-white/40 backdrop-blur-sm transition-all duration-300 hover:bg-white/60 hover:border-slate-300 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                                    <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-slate-200/30 flex items-center justify-center transform -rotate-6 group-hover:rotate-0 transition-all duration-500 scale-95 group-hover:scale-100 relative z-10">
                                                        <ImageIcon size={32} className="text-slate-300 group-hover:text-orange-400 transition-colors duration-500" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-slate-400 text-center uppercase tracking-[0.2em] leading-relaxed relative z-10 transition-colors duration-500 group-hover:text-slate-500">Paste a Deal URL above<br />to preview the card</p>
                                                </div>
                                            )}

                                            {/* Scanner Enrichment Sections */}
                                            {dealForm.link && !isLoading && (
                                                <div className="mt-6 space-y-4">
                                                    <DealAutomationChecklist form={{ ...dealForm, affiliateLink: affiliatePreviewUrl }} />
                                                    <DuplicateCandidatesPanel candidates={duplicateCandidatesForForm} onEdit={handleEditClick} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'coupons' && (
                            <motion.div
                                key="coupons"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="relative z-10"
                            >
                                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                    <div>
                                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">
                                            <BadgePercent size={14} />
                                            Coupons + offers
                                        </div>
                                        <h2 className="text-4xl font-black tracking-tight text-slate-950">Coupon Management</h2>
                                        <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
                                            Create verified coupon codes, instant deals, cashback, bank offers and store promotions that appear on public coupon pages.
                                        </p>
                                    </div>
                                    <Link
                                        to="/coupons"
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg active:scale-95"
                                    >
                                        <ExternalLink size={15} />
                                        View Coupons Page
                                    </Link>
                                </div>

                                <AdminCouponManager
                                    coupons={coupons}
                                    filteredCoupons={filteredCoupons}
                                    couponForm={couponForm}
                                    couponSearch={couponSearch}
                                    couponTypeFilter={couponTypeFilter}
                                    couponStoreOptions={couponStoreOptions}
                                    offerTypes={COUPON_OFFER_TYPES}
                                    inputCls={inputCls}
                                    isSavingCoupon={isSavingCoupon}
                                    couponsLoading={couponsLoading}
                                    isScanningCoupons={isScanningCoupons}
                                    couponScanStatus={couponScanStatus}
                                    editingCouponId={editingCouponId}
                                    onSearchChange={setCouponSearch}
                                    onTypeFilterChange={setCouponTypeFilter}
                                    onFormChange={handleCouponFormChange}
                                    onSubmit={handleCouponSubmit}
                                    onReset={resetCouponForm}
                                    onEdit={handleEditCoupon}
                                    onDelete={handleDeleteCoupon}
                                    onRefresh={refreshCoupons}
                                    onScan={handleCouponScan}
                                    showToast={showToast}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'affiliate-tags' && (
                            <motion.div
                                key="affiliate-tags"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="max-w-5xl mx-auto relative z-10"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                                                <ExternalLink size={20} />
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Affiliate Tags</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 font-semibold pl-14">Manage store-wise affiliate parameters and auto-apply them to Buy Now links.</p>
                                        <p className="text-xs text-slate-400 font-bold pl-14 mt-2">
                                            {affiliateSettings.length} synced store{affiliateSettings.length === 1 ? '' : 's'} · new stores appear here automatically.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveAffiliateSettings}
                                        disabled={isSavingAffiliateSettings}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-3 rounded-xl text-sm font-black shadow-md shadow-blue-200 transition-all active:scale-95"
                                    >
                                        {isSavingAffiliateSettings ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={16} />
                                                Save Settings
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 mb-6">
                                    {affiliateSettings.length === 0 ? (
                                        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                            <ExternalLink size={28} className="mx-auto mb-4 text-slate-300" />
                                            <h3 className="text-xl font-black text-slate-900">No live stores found yet</h3>
                                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                                Add or fetch deals first. Stores with real products will sync into Affiliate Tags automatically.
                                            </p>
                                        </div>
                                    ) : (
                                    <div className="grid gap-5">
                                        {affiliateSettings.map((setting) => (
                                            <div key={setting.storeSlug || setting.store} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                                                <div className="mb-5 flex flex-col gap-4 border-b border-slate-200/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="min-w-0">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Store</label>
                                                        <div className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 border border-slate-200">
                                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                                                {setting.store?.charAt(0) || 'S'}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="truncate">{setting.store}</p>
                                                                <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">{setting.storeSlug}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${setting.enabled && !setting.pendingSetup ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                                                            {setting.enabled && !setting.pendingSetup ? 'Configured' : 'Pending setup'}
                                                        </span>
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Enabled</label>
                                                        <label className="h-12 flex items-center justify-between px-4 rounded-xl bg-white border border-slate-200 cursor-pointer relative">
                                                            <span className="text-sm font-bold text-slate-700">{setting.enabled ? 'On' : 'Off'}</span>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={Boolean(setting.enabled)}
                                                                onChange={e => handleAffiliateSettingChange(setting.storeSlug, 'enabled', e.target.checked)}
                                                            />
                                                            <div className="w-9 h-5 bg-slate-200 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[16px] after:right-[34px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">

                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Parameter Key</label>
                                                        <input
                                                            type="text"
                                                            className={inputCls}
                                                            placeholder="tag"
                                                            value={setting.paramKey}
                                                            onChange={e => handleAffiliateSettingChange(setting.storeSlug, 'paramKey', e.target.value)}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Parameter Value</label>
                                                        <input
                                                            type="text"
                                                            className={inputCls}
                                                            placeholder="mytag-21"
                                                            value={setting.paramValue}
                                                            onChange={e => handleAffiliateSettingChange(setting.storeSlug, 'paramValue', e.target.value)}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Optional URL Pattern</label>
                                                        <input
                                                            type="text"
                                                            className={inputCls}
                                                            placeholder="amazon.in or /dp/"
                                                            value={setting.urlPattern || ''}
                                                            onChange={e => handleAffiliateSettingChange(setting.storeSlug, 'urlPattern', e.target.value)}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Admin Notes</label>
                                                        <input
                                                            type="text"
                                                            className={inputCls}
                                                            placeholder="Program ID, approval notes, payout rules..."
                                                            value={setting.notes || ''}
                                                            onChange={e => handleAffiliateSettingChange(setting.storeSlug, 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-5 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                                                    <div className="min-w-0 space-y-3">
                                                        <div>
                                                            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Sample original URL</p>
                                                            <p className="break-all text-xs font-semibold text-slate-600">{getSampleProductUrlForAffiliateSetting(setting) || 'No product URL sample available for this store yet.'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">Current final Buy Now URL</p>
                                                            <p className="break-all text-xs font-black text-slate-900">{getAffiliatePreviewForSetting(setting) || 'Enable rule + add key/value to generate a preview.'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3 lg:flex-col">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const preview = getAffiliatePreviewForSetting(setting);
                                                                if (!preview) {
                                                                    showToast?.('No preview URL available for this store yet.', 'info');
                                                                    return;
                                                                }
                                                                window.open(preview, '_blank', 'noopener,noreferrer');
                                                            }}
                                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg active:scale-95"
                                                        >
                                                            <ExternalLink size={14} />
                                                            Test
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const preview = getAffiliatePreviewForSetting(setting);
                                                                if (!preview) return;
                                                                navigator.clipboard.writeText(preview);
                                                                showToast?.(`${setting.store} preview copied.`, 'success');
                                                            }}
                                                            disabled={!getAffiliatePreviewForSetting(setting)}
                                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <ExternalLink size={16} className="text-blue-600" />
                                        <h3 className="text-lg font-black text-slate-900">Live Link Preview</h3>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Original Product URL</label>
                                            <div className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 break-all">
                                                {dealForm.link || 'Go to Add Deal and paste a product URL to preview the final affiliate link.'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Final Affiliate URL</label>
                                            <div className="min-h-12 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 break-all">
                                                {affiliatePreviewUrl || 'No valid product URL available yet.'}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm text-slate-500 font-medium">Saving settings re-applies updated affiliate parameters to existing deals too.</p>
                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!affiliatePreviewUrl) {
                                                    showToast?.('Paste a product URL in Add Deal first.', 'info');
                                                    return;
                                                }
                                                window.open(affiliatePreviewUrl, '_blank', 'noopener,noreferrer');
                                            }}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-200 active:scale-95"
                                        >
                                            <ExternalLink size={14} />
                                            Test Final Link
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!affiliatePreviewUrl) return;
                                                navigator.clipboard.writeText(affiliatePreviewUrl);
                                                showToast?.('Affiliate preview copied.', 'success');
                                            }}
                                            disabled={!affiliatePreviewUrl}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
                                        >
                                            <ExternalLink size={14} />
                                            Copy Preview
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {quickEditDeal && (
                            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                                <motion.button
                                    type="button"
                                    aria-label="Close quick edit"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0"
                                    onClick={() => setQuickEditDeal(null)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.96 }}
                                    className="relative z-10 w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl"
                                >
                                    <div className="mb-6 flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">Quick Edit</p>
                                            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Update deal without leaving the table</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setQuickEditDeal(null)}
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
                                        <div>
                                            <div className="flex h-44 items-center justify-center overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-5">
                                                {quickEditDeal.image ? (
                                                    <img src={optimizeImageUrl(quickEditDeal.image)} alt="" className="h-full w-full object-contain" />
                                                ) : (
                                                    <ImageIcon size={36} className="text-slate-300" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <input className={inputCls} value={quickEditDeal.title || ''} onChange={(event) => setQuickEditDeal(prev => ({ ...prev, title: event.target.value }))} placeholder="Deal title" />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <input className={inputCls} value={quickEditDeal.store || ''} onChange={(event) => setQuickEditDeal(prev => ({ ...prev, store: event.target.value, storeName: event.target.value }))} placeholder="Store" />
                                                <input className={inputCls} value={quickEditDeal.category || ''} onChange={(event) => setQuickEditDeal(prev => ({ ...prev, category: event.target.value }))} placeholder="Category" />
                                                <input type="number" className={inputCls} value={quickEditDeal.price || ''} onChange={(event) => setQuickEditDeal(prev => ({ ...prev, price: event.target.value, dealPrice: Number(event.target.value) || 0 }))} placeholder="Deal price" />
                                                <input type="number" className={inputCls} value={quickEditDeal.originalPrice || ''} onChange={(event) => setQuickEditDeal(prev => ({ ...prev, originalPrice: event.target.value, mrp: Number(event.target.value) || 0 }))} placeholder="MRP" />
                                            </div>
                                            <input className={inputCls} value={quickEditDeal.image || ''} onChange={(event) => setQuickEditDeal(prev => ({ ...prev, image: event.target.value }))} placeholder="Image URL" />
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <button
                                                    type="button"
                                                    onClick={handleQuickEditSave}
                                                    disabled={isLoading}
                                                    className="flex-1 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-widest text-white disabled:opacity-50"
                                                >
                                                    Save Quick Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setQuickEditDeal(null);
                                                        handleEditClick(quickEditDeal);
                                                    }}
                                                    className="rounded-2xl border border-slate-200 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                                                >
                                                    Full Edit
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default AdminPanel;
