import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';

import {
    LayoutDashboard, Package, PlusCircle, Search, Trash2,
    TrendingUp, Shield, ExternalLink, Edit3, Image as ImageIcon,
    Zap, DollarSign, Flame, Menu, X, CheckCircle, AlertCircle, Pencil, Activity,
    TrendingDown, Sparkles, Smartphone, Shirt, Gamepad2, Plane, Utensils, ShoppingBag, Layers,
    ChevronLeft, ChevronRight, Home as HomeIcon, Loader2, Filter, BookOpen, Gift
} from 'lucide-react';
import { useNavigate, Link, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { buildAffiliateUrl, sanitizeOriginalUrl } from '../utils/affiliateLinks';
import { normalizeDealForUi, normalizeDealsForUi } from '../utils/dealUi';
import { generateSeoTitle, generateSeoDescription } from '../utils/seoBuilder';
import { SITE_NAME } from '../config/brand';
import { getStoreLogoUrl, AFFILIATE_STORE_PROFILES } from '../config/storeProfiles';
import { safeObject, safeString, normalizeAdminDeal } from '../utils/safety';
import { getSocket } from '../utils/socket';
import logo from '../assets/logo.png';

// Sub-components
import Dashboard from '../components/admin/Dashboard';

import { DealAutomationChecklist, DuplicateCandidatesPanel } from '../components/admin/AdminComponents';
import AdminBlogManager from '../components/admin/AdminBlogManager';
import AdminFreebieManager from '../components/admin/AdminFreebieManager';

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
    dealPrice: '',
    mrp: '',
    discount: '',
    imageUrl: '',
    images: [],
    videos: [],
    productUrl: '',
    affiliateOverrideLink: '',
    affiliateLink: '',
    category: '',
    description: '',
    brand: '',
    seoTitle: '',
    seoDescription: '',
    featured: false,
    isExpired: false
};

/* ───────────────────────────────── helpers ── */
const token = () => 'anonymous';

const deriveStoreFromUrl = (rawUrl = '') => {
    try {
        const host = new URL(rawUrl).hostname.toLowerCase();
        if (host.includes('amazon')) return 'Amazon';
        if (host.includes('flipkart')) return 'Flipkart';
        if (host.includes('croma')) return 'Croma';
        if (host.includes('reliancedigital')) return 'Reliance Digital';
        if (host.includes('firstcry')) return 'FirstCry';
        return host.replace(/^www\./, '').split('.')[0]?.replace(/^./, c => c.toUpperCase()) || '';
    } catch {
        return '';
    }
};

const detectPlatform = (url = '') => {
    const low = url.toLowerCase();
    if (low.includes("amazon")) return "amazon";
    if (low.includes("flipkart")) return "flipkart";
    if (low.includes("croma")) return "croma";
    if (low.includes("reliancedigital")) return "reliancedigital";
    if (low.includes("firstcry")) return "firstcry";
    return "unknown";
};

const normalizeNumberLike = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return value.toString();
    const cleaned = String(value).replace(/[^\d.]/g, '');
    return cleaned || '';
};

const sanitizeUrl = (u = '') => {
    let val = String(u || '').trim();
    if (!val) return '';
    if (!/^https?:\/\//i.test(val)) val = `https://${val.replace(/^\/+/, '')}`;
    return val;
};

const mergeAffiliateSettings = (backendSettings = [], storeNames = []) => {
    const safeBackend = Array.isArray(backendSettings) ? backendSettings : [];
    const safeStoreNames = Array.isArray(storeNames) ? storeNames : [];
    
    const storeMap = new Map();
    const addStore = (name) => {
        if (!name) return;
        const normalized = name.trim();
        const lower = normalized.toLowerCase();
        if (!storeMap.has(lower) || storeMap.get(lower) === 'Generic') {
            storeMap.set(lower, normalized);
        }
    };

    safeStoreNames.forEach(addStore);
    safeBackend.forEach(s => addStore(s.store || s.storeName));

    const allStoreNames = Array.from(storeMap.values()).sort((a, b) => a.localeCompare(b));

    return allStoreNames.map(storeName => {
        const existing = safeBackend.find(s => 
            String(s?.store || s?.storeName || '').toLowerCase() === storeName.toLowerCase()
        );
        if (existing) {
            return {
                ...existing,
                store: storeName
            };
        }
        
        return {
            store: storeName,
            storeSlug: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            enabled: false,
            paramKey: '',
            paramValue: '',
            urlPattern: '',
            notes: '',
            discoveredFromDeals: false,
            pendingSetup: true
        };
    });
};

const isLikelyHttpUrl = (u = '') => /^https?:\/\//i.test(sanitizeUrl(u));

const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("NON JSON RESPONSE:", text.slice(0, 500));
        throw new Error("Server did not return JSON");
    }
    return await response.json();
};

const formatMoney = (value) => {
    const normalized = normalizeNumberLike(value);
    if (!normalized) return '—';
    return `₹${Number(normalized).toLocaleString('en-IN')}`;
};

const getDealDisplayPrice = (deal) => formatMoney(deal?.dealPrice || deal?.price);
const getDealDisplayMrp = (deal) => formatMoney(deal?.mrp || deal?.originalPrice);
const getDealDisplayDiscount = (deal) => {
    const discount = Number(normalizeNumberLike(deal?.discountPercent || deal?.discount) || 0);
    return discount > 0 ? `${discount}% OFF` : '0% OFF';
};
const getNumericDiscount = (deal) => Number(normalizeNumberLike(deal?.discountPercent || deal?.discount) || 0);
const getDealTimestamp = (deal) => new Date(deal?.createdAt || deal?.updatedAt || 0).getTime();
const getNumericDealPrice = (deal) => Number(normalizeNumberLike(deal?.dealPrice || deal?.price) || 0);
const getDealDuplicateKey = (deal) => {
    const title = safeString(deal?.title || '').toLowerCase().trim();
    const store = safeString(deal?.store || deal?.storeName || '').toLowerCase().trim();
    return `${title}-${store}`;
};
const normalizeComparableTitle = (title = '') => safeString(title).toLowerCase().replace(/[^a-z0-9]+/g, '').trim();

const getDealId = (deal) => String(deal?._id || deal?.id || '');
const getDealViews = (deal) => Number(deal?.views || deal?.clicks || 0) || 0;

const getAffiliateStoreSlug = (storeName = '') => {
    if (!storeName) return '';
    return String(storeName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

const formatDealDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (!Number.isFinite(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const safeArray = (arr = []) => {
    if (!Array.isArray(arr)) return [];

    return arr.filter((item) => {
        if (!item) return false;

        if (typeof item !== 'object') return false;

        const hasProductUrl =
            typeof item.productUrl === 'string' &&
            item.productUrl.trim() !== '';

        const hasLink =
            typeof item.link === 'string' &&
            item.link.trim() !== '';

        const hasTitle =
            typeof item.title === 'string' &&
            item.title.trim() !== '';

        const hasName =
            typeof item.name === 'string' &&
            item.name.trim() !== '';

        return hasProductUrl || hasLink || hasTitle || hasName;
    });
};


const buildAdminInsights = (deals = [], stores = [], dashboardStats = {}) => {
    const safeStores = safeArray(stores);
    const topStore = [...safeStores].sort((a, b) => (b?.count || 0) - (a?.count || 0))[0] || null;

    if (dashboardStats) {
        return {
            avgDiscount: Number(dashboardStats.avgDiscount || 0),
            topStore,
            topClickedDeals: safeArray(dashboardStats.topClickedDeals),
            incompleteDeals: safeArray(dashboardStats.incompleteDeals),
            duplicateGroups: safeArray(dashboardStats.duplicateGroups),
            duplicateCount: Number(dashboardStats.duplicateCount || 0)
        };
    }

    const safeDeals = safeArray(deals);
    const activeDeals = safeDeals.filter((deal) => deal && !deal?.isExpired);
    const discountValues = activeDeals.map(d => Number(d?.discountPercent || d?.discount || 0)).filter(v => v > 0);
    const avgDiscount = discountValues.length
        ? Math.round(discountValues.reduce((sum, v) => sum + v, 0) / discountValues.length)
        : 0;

    const topClickedDeals = [...activeDeals].sort((a, b) => getDealViews(b) - getDealViews(a)).slice(0, 5);

    return {
        avgDiscount,
        topStore,
        topClickedDeals,
        incompleteDeals: activeDeals.filter(d => !d?.title || !(d?.imageUrl || d?.image) || !d?.dealPrice),
        duplicateGroups: [],
        duplicateCount: 0
    };
};


// Component definitions moved to external files

/* ═══════════════════════════════════════════ */
const AdminPanel = ({ user, deals, setDeals, handleAddDeal, dealForm = {}, setDealForm = () => {}, showToast, apiBase }) => {
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const isAdmin = true; // Account system removed - accessibility granted to all admin routes
    const activeTab = routerLocation.pathname.split('/').pop() || 'dashboard';

    const adminApiBase = apiBase ? apiBase.replace('/user', '') : '';

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [storeFilter, setStoreFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [sortMode, setSortMode] = useState('newest');
    const [duplicateOnly, setDuplicateOnly] = useState(false);
    const [selectedDealIds, setSelectedDealIds] = useState([]);
    const [quickEditDeal, setQuickEditDeal] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isStatsLoading, setIsStatsLoading] = useState(true);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [categories, setCategories] = useState([]);
    const [stores, setStores] = useState([]);
    const [affiliateSettings, setAffiliateSettings] = useState([]);
    const [isSavingAffiliateSettings, setIsSavingAffiliateSettings] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [adminError, setAdminError] = useState('');
    const [fetchError, setFetchError] = useState('');
    const [autoFetchUrl, setAutoFetchUrl] = useState('');
    const [autoPopulated, setAutoPopulated] = useState(new Set());

    // Paginated Admin Panel States
    const [adminDeals, setAdminDeals] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [duplicateCandidates, setDuplicateCandidates] = useState([]);

    const liveAffiliateStoreNames = useMemo(() => {
        const fromStoresApi = safeArray(stores).map((store) => store?.store || store?.name).filter(Boolean);
        const staticStores = Object.keys(AFFILIATE_STORE_PROFILES);
        return [...new Set([...fromStoresApi, ...staticStores])].sort((a, b) => a.localeCompare(b));
    }, [stores]);
    const adminInsights = useMemo(() => buildAdminInsights(adminDeals, stores, dashboardStats), [adminDeals, stores, dashboardStats]);
    const duplicateIdSet = useMemo(() => new Set(
        safeArray(adminInsights?.duplicateGroups).flatMap((group) => safeArray(group).map(getDealId))
    ), [adminInsights?.duplicateGroups]);
    const storeFilterOptions = useMemo(() => {
        const names = safeArray(stores).map(store => store?.store || store?.name).filter(Boolean);
        return ['All', ...new Set(names)].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
    }, [stores]);
    const categoryFilterOptions = useMemo(() => {
        const cats = safeArray(categories).filter(Boolean);
        return ['All', ...new Set(cats)].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
    }, [categories]);
    const filteredDeals = adminDeals;
    const selectedDeals = useMemo(() =>
        safeArray(selectedDealIds).map((id) => adminDeals.find((deal) => getDealId(deal) === id)).filter(Boolean)
        , [adminDeals, selectedDealIds]);
    const formCategory = dealForm?.category;
    const formCategories = useMemo(() => {
        const merged = [...categories, formCategory].filter(Boolean);
        return [...new Set(merged)].sort((a, b) => a.localeCompare(b));
    }, [categories, formCategory]);
    const affiliatePreviewUrl = buildAffiliateUrl({
        url: dealForm?.productUrl,
        store: dealForm?.store,
        settings: affiliateSettings,
        manualOverride: dealForm?.affiliateOverrideLink
    });

    const refreshAffiliateSettings = useCallback(async (storeNames = []) => {
        if (!isAdmin || !adminApiBase) return [];

        let data = [];
        try {
            data = await fetchJson(`${adminApiBase}/admin/affiliate-settings`, {
                headers: { 'auth-token': token() }
            });
        } catch (e) {
            console.error('[Admin] Affiliate settings JSON fetch fail', e);
        }


        const safeData = Array.isArray(data) ? data : [];
        const mergedSettings = mergeAffiliateSettings(safeData, storeNames);
        setAffiliateSettings(Array.isArray(mergedSettings) ? mergedSettings : []);
        return mergedSettings;
    }, [adminApiBase, isAdmin]);

    const fetchDealsList = useCallback(async ({ silent = false, signal } = {}) => {
        if (!isAdmin || !adminApiBase) return;
        if (!silent) setIsLoading(true);
        let aborted = false;
        try {
            const headers = { 'auth-token': token() };
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            params.append('limit', pageSize.toString());
            if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
            if (storeFilter && storeFilter !== 'All') params.append('store', storeFilter);
            if (categoryFilter && categoryFilter !== 'All') params.append('category', categoryFilter);
            if (sortMode) params.append('sort', sortMode);
            if (duplicateOnly) params.append('duplicateOnly', 'true');
            params.append('raw', 'true');

            const data = await fetchJson(`${adminApiBase}/deals?${params.toString()}`, { headers, signal });
            const dealsArray = Array.isArray(data) ? data : (data?.deals || []);
            const normalizedDeals = normalizeDealsForUi(dealsArray);
            
            setAdminDeals(normalizedDeals);
            setTotalCount(data?.totalCount || normalizedDeals.length);
            setTotalPages(data?.totalPages || 1);
            return normalizedDeals;
        } catch (error) {
            if (error?.name === 'AbortError') {
                aborted = true;
                return;
            }
            console.error('Failed to fetch deals list:', error);
            setAdminError(error.message || 'Failed to fetch deals list.');
        } finally {
            if (!silent && !aborted) setIsLoading(false);
        }
    }, [adminApiBase, isAdmin, currentPage, pageSize, debouncedSearchQuery, storeFilter, categoryFilter, sortMode, duplicateOnly]);

    const fetchMetadata = useCallback(async ({ silent = false } = {}) => {
        if (!isAdmin || !adminApiBase) return;
        if (!silent) setIsStatsLoading(true);
        try {
            const headers = { 'auth-token': token() };
            const [statsData, categoriesData, storesData] = await Promise.all([
                fetchJson(`${adminApiBase}/admin/stats`, { headers }),
                fetchJson(`${adminApiBase}/deals/categories`, { headers }),
                fetchJson(`${adminApiBase}/stores`, { headers })
            ]);

            setDashboardStats(statsData);
            setCategories(Array.isArray(categoriesData) ? categoriesData.filter(Boolean) : []);
            setStores(Array.isArray(storesData) ? storesData : []);
            
            return { statsData, categoriesData, storesData };
        } catch (error) {
            console.error('Failed to fetch admin metadata:', error);
            setAdminError(error.message || 'Failed to load admin metadata.');
        } finally {
            if (!silent) setIsStatsLoading(false);
        }
    }, [adminApiBase, isAdmin]);

    const refreshAdminData = useCallback(async ({ silent = false } = {}) => {
        if (!isAdmin || !adminApiBase) return;
        setIsRefreshingData(true);
        setAdminError('');
        try {
            const [metaResult, newDealsList] = await Promise.all([
                fetchMetadata({ silent }),
                fetchDealsList({ silent })
            ]);

            if (metaResult) {
                const safeStoresData = Array.isArray(metaResult.storesData) ? metaResult.storesData : [];
                const safeDealsData = Array.isArray(newDealsList) ? newDealsList : [];
                const snapshotStoreNames = [
                    ...safeStoresData.map((store) => store?.store || store?.name).filter(Boolean),
                    ...safeDealsData.map((deal) => deal?.storeName || deal?.store).filter(Boolean)
                ];
                await refreshAffiliateSettings(snapshotStoreNames).catch((error) => {
                    console.warn('Affiliate settings refresh warning:', error);
                });
            }
        } catch (error) {
            console.error('Admin snapshot error:', error);
            setAdminError(error.message || 'Failed to load admin data.');
        } finally {
            setIsRefreshingData(false);
        }
    }, [isAdmin, adminApiBase, fetchMetadata, fetchDealsList, refreshAffiliateSettings]);

    /* ── auth guard ── (Centrally managed by App.jsx Route) */

    /* ── stats ── */
    useEffect(() => {
        document.body.classList.add('admin-page-active');
        return () => {
            document.body.classList.remove('admin-page-active');
        };
    }, []);

    // Fetch deals when page/filters change
    useEffect(() => {
        if (!isAdmin || !adminApiBase) return;
        const controller = new AbortController();
        Promise.resolve().then(() => {
            fetchDealsList({ signal: controller.signal });
        });
        return () => controller.abort();
    }, [fetchDealsList, isAdmin, adminApiBase]);

    // Initial load for metadata and stats
    useEffect(() => {
        if (!isAdmin || !adminApiBase) return;
        
        // We use a ref to prevent infinite loops from object references
        let mounted = true;
        
        const loadMeta = async () => {
            if (mounted) await fetchMetadata();
            if (mounted) {
                refreshAffiliateSettings().catch(console.warn);
            }
        };
        
        loadMeta();
        
        return () => { mounted = false; };
    }, [isAdmin, adminApiBase, fetchMetadata, refreshAffiliateSettings]);

    useEffect(() => {
        if (!isAdmin || !adminApiBase || activeTab !== 'affiliate-tags') return undefined;

        // intervalId was removed to prevent continuous backend polling
        // Admin data will now only refresh on mount or manual trigger.
        return undefined;
    }, [activeTab, adminApiBase, isAdmin, refreshAdminData]);

    // refreshAffiliateSettings effect consolidated above

    // Debounce searchQuery
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery((prev) => {
                if (prev !== searchQuery) {
                    setCurrentPage(1);
                    return searchQuery;
                }
                return prev;
            });
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Debounce similar candidates search
    useEffect(() => {
        const title = dealForm?.title?.trim();
        if (!title || title.length < 3) {
            Promise.resolve().then(() => {
                setDuplicateCandidates([]);
            });
            return;
        }

        const handler = setTimeout(async () => {
            try {
                const headers = { 'auth-token': token() };
                const params = new URLSearchParams();
                params.append('search', title);
                params.append('limit', '5');
                const res = await fetchJson(`${adminApiBase}/deals?${params.toString()}`, { headers });
                const fetchedDeals = normalizeDealsForUi(Array.isArray(res) ? res : (res?.deals || []));
                
                // Filter out the one we are editing
                const candidates = fetchedDeals.filter(d => !editId || getDealId(d) !== String(editId));
                setDuplicateCandidates(candidates);
            } catch (err) {
                console.warn('Failed to fetch duplicate candidates:', err);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [dealForm?.title, dealForm?.store, editId, adminApiBase]);

    // Real-Time Socket Connection
    useEffect(() => {
        const socket = typeof window !== 'undefined' ? getSocket() : null;
        if (!socket) return;

        const handleNewDeal = (newDeal) => {
            if (currentPage === 1) {
                fetchDealsList({ silent: true });
            } else {
                setTotalCount(prev => prev + 1);
            }
        };

        const handleUpdateDeal = (updatedDeal) => {
            if (currentPage === 1) {
                fetchDealsList({ silent: true });
            } else {
                const normalized = normalizeDealForUi(updatedDeal);
                setAdminDeals(prev => prev.map(d => (d._id || d.id) === (normalized._id || normalized.id) ? normalized : d));
            }
        };

        const handleDeleteDeal = (dealId) => {
            setAdminDeals(prev => prev.filter(d => (d._id || d.id) !== dealId));
            setTotalCount(prev => Math.max(0, prev - 1));
        };

        socket.on('newDeal', handleNewDeal);
        socket.on('updateDeal', handleUpdateDeal);
        socket.on('deleteDeal', handleDeleteDeal);

        return () => {
            socket.off('newDeal', handleNewDeal);
            socket.off('updateDeal', handleUpdateDeal);
            socket.off('deleteDeal', handleDeleteDeal);
        };
    }, [currentPage, fetchDealsList, adminApiBase]);

    const handleFetchDeal = async (urlToFetch) => {
        const url = (typeof urlToFetch === 'string' ? urlToFetch : dealForm.productUrl)?.trim();
        if (!url) {
            showToast?.('Please paste a product URL first.', 'error');
            return;
        }

        setIsFetching(true);
        setFetchError('');
        try {
            const response = await fetch(`${adminApiBase}/deals/fetch-deal`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'auth-token': token()
                },
                body: JSON.stringify({ url })
            });

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error('[FETCH_ERROR_NON_JSON]', text.slice(0, 200));
                throw new Error("Server returned non-JSON response. (Check API Route)");
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                const d = result.data;
                setDealForm(prev => {
                    const finalStore = d.store || prev.store || deriveStoreFromUrl(url);
                    const generatedOverride = buildAffiliateUrl({
                        url: url,
                        store: finalStore,
                        settings: affiliateSettings,
                        manualOverride: ''
                    });

                    const sanitizedOriginal = sanitizeOriginalUrl(url);
                    const hasAffiliateApplied = generatedOverride && generatedOverride !== sanitizedOriginal;

                    return {
                        ...prev,
                        title: d.title || prev.title,
                        store: finalStore,
                        category: d.category || prev.category,
                        description: d.description || prev.description,
                        mrp: d.mrp || prev.mrp,
                        dealPrice: d.dealPrice || prev.dealPrice,
                        imageUrl: d.imageUrl || prev.imageUrl,
                        images: d.images || prev.images || [],
                        productUrl: url,
                        affiliateOverrideLink: hasAffiliateApplied ? generatedOverride : '',
                        discount: d.mrp && d.dealPrice ? Math.round(((d.mrp - d.dealPrice) / d.mrp) * 100).toString() : prev.discount
                    };
                });
                showToast?.('Product details fetched!', 'success');
                setAutoFetchUrl(''); // Clear input after success
            } else {
                setFetchError(result.message || 'Fetch failed');
                showToast?.(result.message || 'Fetch failed', 'error');
            }
        } catch (error) {
            setFetchError(error.message);
            showToast?.(error.message, 'error');
        } finally {
            setIsFetching(false);
        }
    };

    /* ── reset form when switching away from add-deal ── */
    useEffect(() => {
        if (activeTab !== 'add-deal') {
            Promise.resolve().then(() => {
                setEditMode(false);
                setEditId(null);
                setDealForm(DEFAULT_DEAL_FORM);
            });
        }
    }, [activeTab, setDealForm]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'productUrl') {

        }
        setDealForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    useEffect(() => {
        if (dealForm.mrp && dealForm.dealPrice) {
            const disc = ((Number(dealForm.mrp) - Number(dealForm.dealPrice)) / Number(dealForm.mrp)) * 100;
            setDealForm((prev) => ({
                ...prev,
                discount: disc > 0 ? disc.toFixed(0) : "0",
            }));
        }
    }, [dealForm.mrp, dealForm.dealPrice, setDealForm]);

    /* ── CRUD helpers ── */


    const handleEditClick = (rawDeal) => {
        if (!rawDeal) return;
        const deal = normalizeAdminDeal(rawDeal);
        setEditMode(true);
        setEditId(getDealId(deal));
        const primaryVariant = Array.isArray(deal?.variants) && deal?.variants?.length > 0 ? deal.variants[0] : {};
        const safeDealPrice = deal?.dealPrice || deal?.price || primaryVariant?.dealPrice || primaryVariant?.price || '';
        const safeMrp = deal?.mrp || deal?.originalPrice || primaryVariant?.mrp || primaryVariant?.originalPrice || '';
        const safeDiscount = deal?.discount || deal?.discountPercent || primaryVariant?.discount || primaryVariant?.discountPercent || '';
        const safeProductUrl = deal?.productUrl || deal?.link || primaryVariant?.productUrl || primaryVariant?.link || '';

        setDealForm({
            title: deal?.title || '',
            store: deal?.store || '',
            dealPrice: safeDealPrice,
            mrp: safeMrp,
            discount: safeDiscount,
            image: deal?.imageUrl || deal?.image || '',
            imageUrl: deal?.imageUrl || deal?.image || '',
            images: safeArray(deal?.images),
            videos: safeArray(deal?.videos),
            productUrl: sanitizeOriginalUrl(safeProductUrl),
            affiliateOverrideLink: deal?.affiliateOverrideLink || primaryVariant?.affiliateOverrideLink || '',
            affiliateLink: deal?.affiliateLink || primaryVariant?.affiliateLink || '',
            category: deal?.category || '',
            description: deal?.description || deal?.shortDescription || '',
            seoTitle: deal?.seoTitle || '',
            seoDescription: deal?.seoDescription || '',
            focusKeyword: deal?.focusKeyword || '',
            featured: deal?.featured || false,
            isExpired: deal?.isExpired || false,
            brand: deal?.brand || ''
        });
        navigate('/admin/add-deal');
        // Ensure the browser scrolls to the top of the edit form
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    };

    const buildValidatedDealPayload = () => {
        const price = Number(normalizeNumberLike(dealForm?.dealPrice) || 0);
        const originalPrice = Number(normalizeNumberLike(dealForm?.mrp) || 0);
        const safeMrp = originalPrice || null;
        const computedDiscount = (safeMrp && price > 0)
            ? Math.round(((safeMrp - price) / safeMrp) * 100)
            : Number(normalizeNumberLike(dealForm?.discount) || 0);
        const finalUrl = affiliatePreviewUrl || dealForm?.affiliateLink || '';
        const payload = {
            ...dealForm,
            images: Array.isArray(dealForm?.images) ? dealForm.images.filter(img => img && String(img).trim() !== '') : [],
            image: dealForm?.imageUrl,
            link: sanitizeUrl(dealForm?.productUrl),
            productUrl: sanitizeUrl(dealForm?.productUrl),
            affiliateLink: finalUrl,
            price: price || safeMrp || 0,
            dealPrice: price || 0,
            originalPrice: safeMrp || 0,
            mrp: safeMrp || 0,
            discount: computedDiscount ? `${computedDiscount}%` : '',
            discountPercent: computedDiscount || 0,
            store: dealForm?.store || deriveStoreFromUrl(dealForm?.productUrl),
            storeName: dealForm?.store || deriveStoreFromUrl(dealForm?.productUrl),
            rating: Number(dealForm?.rating || 0) || 0
        };

        const validationErrors = [];
        if (!payload?.title?.trim()) validationErrors.push('Title is required.');
        if (!payload?.store?.trim()) validationErrors.push('Store is required.');
        if (!payload?.category?.trim()) validationErrors.push('Category is required.');
        if (!price) validationErrors.push('Deal price must be greater than 0.');
        if (!dealForm?.imageUrl?.trim()) validationErrors.push('Product image is required.');
        if (!isLikelyHttpUrl(payload?.productUrl)) validationErrors.push('Valid original product URL is required.');
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
            const dealsApi = `${adminApiBase}/deals/${editId}`;
            const r = await fetch(dealsApi, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'auth-token': token() },
                body: JSON.stringify(payload)
            });
            if (r.ok) {
                const responseData = await r.json().catch(() => ({}));
                window.dispatchEvent(new CustomEvent('dealsphere:data-changed', {
                    detail: { entity: 'deal', action: 'updated', id: editId, deal: responseData.deal || responseData }
                }));
                await refreshAdminData({ silent: true });
                showToast?.('Deal updated!', 'success');
                navigate('/admin/manage-deals');
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
            const dealsApi = `${adminApiBase}/deals/${id}`;
            const r = await fetch(dealsApi, { method: 'DELETE', headers: { 'auth-token': token() } });
            if (r.ok) {
                if (typeof setDeals === 'function') {
                    setDeals(prev => {
                        const next = prev.filter(d => (d._id || d.id) !== id);
                        sessionStorage.setItem('dealhunter_deals_cache', JSON.stringify(next));
                        return next;
                    });
                }
                window.dispatchEvent(new CustomEvent('dealsphere:data-changed', {
                    detail: { entity: 'deal', action: 'deleted', id }
                }));
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
        const visibleIds = safeArray(filteredDeals).map(getDealId).filter(Boolean);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => safeArray(selectedDealIds).includes(id));
        setSelectedDealIds(prev => allVisibleSelected
            ? safeArray(prev).filter((id) => !visibleIds.includes(id))
            : [...new Set([...safeArray(prev), ...visibleIds])]
        );
    };

    const handleBulkDelete = async () => {
        const ids = safeArray(selectedDealIds);
        if (ids.length === 0) return;
        if (!window.confirm(`Delete ${ids.length} selected deal${ids.length === 1 ? '' : 's'}?`)) return;

        setIsLoading(true);
        try {
            const results = await Promise.allSettled(ids.map((id) =>
                fetch(`${adminApiBase}/deals/${id}`, {
                    method: 'DELETE',
                    headers: { 'auth-token': token() }
                })
            ));
            const failed = results.filter((result) => result.status === 'rejected' || !result.value?.ok).length;
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value?.ok) {
                    window.dispatchEvent(new CustomEvent('dealsphere:data-changed', {
                        detail: { entity: 'deal', action: 'deleted', id: ids[index] }
                    }));
                }
            });
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
        const ids = safeArray(selectedDealIds);
        if (ids.length === 0) return;

        setIsLoading(true);
        try {
            const results = await Promise.allSettled(ids.map((id) =>
                fetch(`${adminApiBase}/deals/${id}`, {
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
            const price = Number(normalizeNumberLike(quickEditDeal?.price || quickEditDeal?.dealPrice) || 0);
            const mrp = Number(normalizeNumberLike(quickEditDeal?.originalPrice || quickEditDeal?.mrp) || 0);
            const discount = mrp > price && price > 0
                ? Math.round(((mrp - price) / mrp) * 100)
                : getNumericDiscount(quickEditDeal);
            const payload = {
                ...quickEditDeal,
                price: price ? price.toString() : quickEditDeal?.price,
                dealPrice: price,
                originalPrice: mrp ? mrp.toString() : quickEditDeal?.originalPrice,
                mrp: mrp > price ? mrp : null,
                discount: discount ? `${discount}%` : '',
                discountPercent: discount || 0
            };
            const response = await fetch(`${adminApiBase}/deals/${id}`, {
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
        if (duplicateCandidates.length > 0 && !window.confirm('A similar deal already exists. Publish a new listing anyway?')) {
            if (e?.preventDefault) e.preventDefault();
            showToast?.('Publish cancelled. Open the duplicate candidate and update it instead.', 'info');
            return false;
        }

        setIsLoading(true);
        try {
            const success = await handleAddDeal(e, payload);
            if (success) {
                setCurrentPage(1);
                setSortMode('newest');
                setSearchQuery('');
                setDebouncedSearchQuery('');
                setStoreFilter('All');
                setCategoryFilter('All');
                setDuplicateOnly(false);
                
                await refreshAdminData({ silent: true });
                navigate('/admin/manage-deals');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCleanupDeals = async () => {
        const confirmMsg = "Are you sure you want to clean up the database?\n\nThis will permanently delete all deals that match the following criteria:\n" +
            "- Missing/Wrong images (placeholder, default, no-image, invalid url, etc. in both image and imageUrl fields)\n" +
            "- Invalid or no-discount prices (dealPrice <= 0, or dealPrice >= MRP)\n" +
            "- Title issues/Fake listings (missing title, blank/whitespace, no letters, less than 8 characters, or placeholder/fake names like 'product', 'charger', 'gopro', 'tws ans', test, demo, fake, asdf)\n\n" +
            "This action cannot be undone. Proceed?";
            
        if (!window.confirm(confirmMsg)) return;
        
        setIsCleaning(true);
        try {
            const response = await fetch(`${adminApiBase}/admin/deals/cleanup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token()
                }
            });
            const data = await response.json();
            if (response.ok && data.success) {
                const deletedCount = data.deletedCount || 0;
                await refreshAdminData({ silent: true });
                showToast?.(`Successfully cleaned up database! Removed ${deletedCount} invalid deals.`, 'success');
            } else {
                showToast?.(data.message || 'Cleanup failed', 'error');
            }
        } catch (error) {
            showToast?.(error.message || 'Server error', 'error');
        } finally {
            setIsCleaning(false);
        }
    };

    const handleFeaturedToggle = async (deal) => {
        const id = deal?._id || deal?.id;
        if (!id) return;

        setIsLoading(true);
        try {
            const response = await fetch(`${adminApiBase}/deals/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token()
                },
                body: JSON.stringify({ featured: !deal?.featured })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to update featured status');
            }

            await refreshAdminData({ silent: true });
            showToast?.(`Deal ${deal?.featured ? 'removed from' : 'added to'} featured deals.`, 'success');
        } catch (error) {
            showToast?.(error.message || 'Failed to update featured status', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAffiliateSettingChange = (storeSlug, field, value) => {
        setAffiliateSettings(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.map(setting =>
                setting?.storeSlug === storeSlug
                    ? (() => {
                        const nextSetting = { ...setting, [field]: field === 'enabled' ? Boolean(value) : value };
                        nextSetting.pendingSetup = !nextSetting?.enabled || !String(nextSetting?.paramKey || '').trim() || !String(nextSetting?.paramValue || '').trim();
                        return nextSetting;
                    })()
                    : setting
            );
        });
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
            || dealForm?.productUrl
            || ''
        );
    }, [adminDeals, dealForm.productUrl]);

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

            const safeSettings = Array.isArray(data.settings) ? data.settings : [];
            setAffiliateSettings(mergeAffiliateSettings(safeSettings, liveAffiliateStoreNames));
            await refreshAdminData({ silent: true });

            showToast?.(`Affiliate settings saved. Reapplied to ${data.reapply?.updated || 0} deals.`, 'success');
        } catch (error) {
            showToast?.(error.message || 'Failed to save affiliate settings', 'error');
        } finally {
            setIsSavingAffiliateSettings(false);
        }
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
        { id: 'manage-blogs', label: 'Manage Blogs', icon: BookOpen },
        { id: 'manage-freebies', label: 'Manage Freebies', icon: Gift },
        { id: 'affiliate-tags', label: 'Affiliate Tags', icon: ExternalLink },
    ];

    /* ────────── label helper for auto-filled fields ────────── */
    const renderAutoBadge = (field) => autoPopulated.has(field) ? (
        <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
            <CheckCircle size={8} /> Auto
        </span>
    ) : null;

    /* ────────── clean input class ────────── */
    const inputCls = 'w-full bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-xl py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:bg-white transition-all duration-300 font-medium hover:bg-white/80 shadow-sm';

    /* ─── render ─── */
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <SEO 
                title={`${NAV.find(n => n.id === activeTab)?.label || 'Admin'} - Admin Panel`} 
                noindex={true} 
            />

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* ═══ SIDEBAR ═══ */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 h-screen flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
                    <img src={logo} alt="DealSphere" className="h-14 w-auto object-contain bg-white rounded-xl p-1.5 shadow-sm scale-110" />
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
                            <motion.div key="dashboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <Dashboard
                                    stats={dashboardStats}
                                    adminDeals={adminDeals}
                                    adminInsights={adminInsights}
                                    getDealDisplayPrice={getDealDisplayPrice}
                                    getDealDisplayMrp={getDealDisplayMrp}
                                    getDealDisplayDiscount={getDealDisplayDiscount}
                                    getDealViews={getDealViews}
                                    onEditDeal={handleEditClick}
                                    navigate={navigate}
                                    setDuplicateOnly={setDuplicateOnly}
                                />
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
                                <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm p-6 relative overflow-hidden">
                                    {/* Glassmorphism Gradient */}
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-50/60 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900">All Deals</h2>
                                            <p className="text-sm text-slate-500 font-medium">
                                                Live database data with instant refresh after every admin action.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-sm font-black text-slate-600 relative z-10">
                                            <span className="px-3.5 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200 shadow-sm">{totalCount} total</span>
                                            <span className="px-3.5 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200 shadow-sm">{filteredDeals.length} visible</span>
                                            <span className="px-3.5 py-2 rounded-xl bg-orange-50/70 text-[#FF6A00] backdrop-blur-md border border-orange-200/60 shadow-sm">{dashboardStats?.featuredDeals || 0} featured</span>
                                            <button
                                                type="button"
                                                onClick={handleCleanupDeals}
                                                disabled={isCleaning}
                                                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 font-bold transition-all flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {isCleaning ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                                        <span>Cleaning...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-4 h-4 text-rose-600" />
                                                        <span>Clean Up Database</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-6 rounded-3xl border border-slate-200/60 bg-white/60 backdrop-blur-xl p-4 shadow-sm relative z-10">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 overflow-hidden focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                                                <Search size={16} className="text-slate-400 shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Search deals..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full bg-transparent py-2.5 text-sm font-bold text-slate-700 focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${showAdvancedFilters ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                <Filter size={16} className="inline-block mr-1.5 -mt-0.5" />
                                                Filters
                                            </button>
                                        </div>
                                        {showAdvancedFilters && (
                                            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-200/60">
                                                <select className="flex-1 min-w-[140px] bg-white rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all" value={storeFilter} onChange={(event) => { setStoreFilter(event.target.value); setCurrentPage(1); }}>
                                                    {storeFilterOptions.map((store) => <option key={store} value={store}>{store === 'All' ? 'All stores' : store}</option>)}
                                                </select>
                                                <select className="flex-1 min-w-[140px] bg-white rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setCurrentPage(1); }}>
                                                    {categoryFilterOptions.map((category) => <option key={category} value={category}>{category === 'All' ? 'All categories' : category}</option>)}
                                                </select>
                                                <select className="flex-1 min-w-[140px] bg-white rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all" value={sortMode} onChange={(event) => { setSortMode(event.target.value); setCurrentPage(1); }}>
                                                    <option value="newest">Sort: newest</option>
                                                    <option value="price-low">Price: low to high</option>
                                                    <option value="price-high">Price: high to low</option>
                                                    <option value="discount">Best discount</option>
                                                    <option value="clicked">Most clicked</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => { setDuplicateOnly(value => !value); setCurrentPage(1); }}
                                                    className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${duplicateOnly ? 'bg-amber-500 text-white shadow-sm border-transparent' : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'}`}
                                                >
                                                    Dups {adminInsights.duplicateCount ? `(${adminInsights.duplicateCount})` : ''}
                                                </button>
                                            </div>
                                        )}
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
                                            <div className="hidden xl:block overflow-hidden rounded-[24px] border border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-xl relative z-10">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-slate-200/60">
                                                        <thead className="bg-slate-50/50 backdrop-blur-sm">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left w-12">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={filteredDeals.length > 0 && filteredDeals.every((deal) => selectedDealIds.includes(getDealId(deal)))}
                                                                        onChange={toggleVisibleSelection}
                                                                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                                        aria-label="Select visible deals"
                                                                    />
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Deal Product</th>
                                                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Price & Offer</th>
                                                                <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">Featured</th>
                                                                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100/60">
                                                            {safeArray(filteredDeals).map((rawDeal, index) => {
                                                                const deal = normalizeAdminDeal(rawDeal);
                                                                const dealId = getDealId(deal);
                                                                return (
                                                                    <tr key={deal._id || deal.id} className="hover:bg-slate-50/50 hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] transition-all duration-300">
                                                                        <td className="px-4 py-4 align-top w-12">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedDealIds.includes(getDealId(deal))}
                                                                                onChange={() => toggleDealSelection(deal)}
                                                                                className="mt-2 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                                                aria-label={`Select ${deal.title || 'deal'}`}
                                                                            />
                                                                        </td>
                                                                        <td className="px-4 py-4">
                                                                            <div className="flex items-start gap-4 min-w-[280px]">
                                                                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-200/80 flex-shrink-0 shadow-sm p-1">
                                                                                    {deal.imageUrl ? (
                                                                                        <div className="w-full h-full relative rounded-xl overflow-hidden">
                                                                                            <img 
                                                                                                key={`tbl-${deal.imageUrl || 'no-img'}`}
                                                                                                src={optimizeImageUrl(deal.imageUrl)} 
                                                                                                alt={deal.title} 
                                                                                                className="w-full h-full object-cover" 
                                                                                                onError={(e) => {
                                                                                                    e.target.style.display = 'none';
                                                                                                    if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                                                                                }}
                                                                                            />
                                                                                            <div style={{ display: 'none' }} className="w-full h-full items-center justify-center bg-gradient-to-br from-orange-100 to-rose-100 text-orange-600 font-black text-xl uppercase shadow-inner">
                                                                                                {(deal.store || 'D').charAt(0)}
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="w-full h-full rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-100 to-rose-100 text-orange-600 font-black text-xl uppercase shadow-inner">
                                                                                            {(deal.store || 'D').charAt(0)}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="min-w-0 flex flex-col justify-center">
                                                                                    <div className="flex items-start gap-2">
                                                                                        <div className="text-sm font-black text-slate-900 line-clamp-2 leading-tight">{deal?.title || 'Untitled deal'}</div>
                                                                                        {duplicateIdSet.has(getDealId(deal)) && (
                                                                                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-800">Dup?</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                                                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 uppercase tracking-wider border border-slate-200">{deal?.store || 'Online Store'}</span>
                                                                                        <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-600 uppercase tracking-wider border border-blue-100">{deal?.category || 'Other'}</span>
                                                                                    </div>
                                                                                    <div className="text-[11px] font-semibold text-slate-400 mt-1.5 truncate max-w-[320px]">
                                                                                        {sanitizeOriginalUrl(deal?.productUrl || deal?.link || '') || 'No product URL'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4 align-top">
                                                                            <div className="flex flex-col gap-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-lg font-black text-slate-900">{getDealDisplayPrice(deal)}</span>
                                                                                    {getDealDisplayDiscount(deal) && getDealDisplayDiscount(deal) !== '0% OFF' && (
                                                                                        <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                                                                                            {getDealDisplayDiscount(deal)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-xs font-semibold text-slate-400 line-through">
                                                                                    {getDealDisplayMrp(deal)}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4 align-top text-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleFeaturedToggle(deal)}
                                                                                className={`inline-flex items-center justify-center p-2 rounded-xl transition-all ${deal.featured
                                                                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 shadow-sm'
                                                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                                                                    }`}
                                                                                title={deal.featured ? "Unfeature deal" : "Feature deal"}
                                                                            >
                                                                                <Flame size={18} fill={deal.featured ? 'currentColor' : 'none'} />
                                                                            </button>
                                                                        </td>
                                                                        <td className="px-4 py-4 align-top text-right">
                                                                            <div className="flex justify-end gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleEditClick(deal)}
                                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                                                    title="Edit Deal"
                                                                                >
                                                                                    <Edit3 size={16} strokeWidth={2.5} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDeleteDeal(deal._id || deal.id)}
                                                                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                                                                    title="Delete Deal"
                                                                                >
                                                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="xl:hidden space-y-4 relative z-10">
                                                {safeArray(filteredDeals).map((rawDeal, index) => {
                                                    const deal = normalizeAdminDeal(rawDeal);
                                                    const dealId = getDealId(deal);
                                                    return (
                                                        <div key={dealId || index} className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-xl p-4 shadow-sm hover:shadow-md transition-shadow">
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
                                                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-slate-200/60 flex-shrink-0 shadow-sm">
                                                                    {deal.imageUrl ? (
                                                                        <div className="w-full h-full relative">
                                                                            <img 
                                                                                key={`mob-${deal.imageUrl || 'no-img'}`}
                                                                                src={optimizeImageUrl(deal.imageUrl)} 
                                                                                alt={deal.title} 
                                                                                className="w-full h-full object-cover" 
                                                                                onError={(e) => {
                                                                                    e.target.style.display = 'none';
                                                                                    if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                                                                }}
                                                                            />
                                                                            <div style={{ display: 'none' }} className="w-full h-full items-center justify-center bg-gradient-to-br from-orange-100 to-rose-100 text-orange-600 font-black text-2xl uppercase shadow-inner">
                                                                                {(deal.store || 'D').charAt(0)}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-rose-100 text-orange-600 font-black text-2xl uppercase shadow-inner">
                                                                            {(deal.store || 'D').charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <h3 className="text-sm font-black text-slate-900 line-clamp-2">{deal?.title || 'Untitled deal'}</h3>
                                                                            <p className="text-xs text-slate-500 mt-1">{deal?.store || 'Online Store'} · {deal?.category || 'Other'}</p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleFeaturedToggle(deal)}
                                                                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${deal?.featured ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
                                                                        >
                                                                            {deal?.featured ? 'Featured' : 'Standard'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="mt-3 flex items-end gap-2 text-xs border-t border-slate-100/60 pt-3">
                                                                        <span className="text-xl font-black text-slate-900">{getDealDisplayPrice(deal)}</span>
                                                                        <span className="text-sm font-semibold text-slate-400 line-through pb-0.5">{getDealDisplayMrp(deal)}</span>
                                                                        {getDealDisplayDiscount(deal) && getDealDisplayDiscount(deal) !== '0% OFF' && (
                                                                            <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-1">
                                                                                {getDealDisplayDiscount(deal)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4 flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditClick(deal)}
                                                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <Pencil size={14} />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteDeal(deal._id || deal.id)}
                                                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {filteredDeals.length === 0 && (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm font-semibold text-slate-500">
                                                    No deals matched the current search / filter settings.
                                                </div>
                                            )}

                                            {/* Pagination UI */}
                                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/60 pt-6 relative z-10">
                                                <div className="text-sm font-semibold text-slate-500 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200/60 shadow-sm">
                                                    Showing <span className="text-slate-900 font-black">{totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-900 font-black">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-slate-900 font-black">{totalCount}</span> deals
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Per page</span>
                                                        <select
                                                            value={pageSize}
                                                            onChange={(e) => {
                                                                setPageSize(Number(e.target.value));
                                                                setCurrentPage(1);
                                                            }}
                                                            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none focus:text-orange-600 transition-colors cursor-pointer"
                                                        >
                                                            <option value={10}>10</option>
                                                            <option value={20}>20</option>
                                                            <option value={50}>50</option>
                                                            <option value={100}>100</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                            disabled={currentPage === 1}
                                                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                                                            aria-label="Previous page"
                                                        >
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        
                                                        {(() => {
                                                            const pages = [];
                                                            const maxVisible = 5;
                                                            let startPage = Math.max(1, currentPage - 2);
                                                            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                                                            
                                                            if (endPage - startPage + 1 < maxVisible) {
                                                                startPage = Math.max(1, endPage - maxVisible + 1);
                                                            }

                                                            if (startPage > 1) {
                                                                pages.push(
                                                                    <button
                                                                        key={1}
                                                                        type="button"
                                                                        onClick={() => setCurrentPage(1)}
                                                                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${currentPage === 1 ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                    >
                                                                        1
                                                                    </button>
                                                                );
                                                                if (startPage > 2) {
                                                                    pages.push(<span key="dots-start" className="text-slate-400 px-1 font-bold">...</span>);
                                                                }
                                                            }

                                                            for (let i = startPage; i <= endPage; i++) {
                                                                pages.push(
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={() => setCurrentPage(i)}
                                                                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${currentPage === i ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                    >
                                                                        {i}
                                                                    </button>
                                                                );
                                                            }

                                                            if (endPage < totalPages) {
                                                                if (endPage < totalPages - 1) {
                                                                    pages.push(<span key="dots-end" className="text-slate-400 px-1 font-bold">...</span>);
                                                                }
                                                                pages.push(
                                                                    <button
                                                                        key={totalPages}
                                                                        type="button"
                                                                        onClick={() => setCurrentPage(totalPages)}
                                                                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${currentPage === totalPages ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                    >
                                                                        {totalPages}
                                                                    </button>
                                                                );
                                                            }

                                                            return pages;
                                                        })()}

                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            disabled={currentPage === totalPages}
                                                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                                                            aria-label="Next page"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
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
                                        <p className="text-sm text-slate-500 font-semibold pl-14">{editMode ? 'Update an existing deal' : 'Fill in the details below to create a new deal'}</p>
                                    </div>
                                    {editMode && (
                                        <button onClick={() => { setEditMode(false); setDealForm(DEFAULT_DEAL_FORM); }}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-all active:scale-95 shadow-sm">
                                            <X size={14} /> Cancel Edit
                                        </button>
                                    )}
                                </div>

                                <div className="mb-8 space-y-6">
                                    {/* Step 4: Perfect Product Fetching UI (Magic Fetch) */}
                                    <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white p-2 shadow-xl shadow-slate-200/40 relative hover:shadow-2xl hover:shadow-slate-200/50 transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 relative">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <Sparkles size={20} className={isFetching ? 'animate-pulse text-orange-500' : ''} />
                                                    </div>
                                                    <input
                                                        id="autoFetchUrl"
                                                        type="text"
                                                        className="w-full bg-transparent py-6 pl-16 pr-6 text-sm font-black placeholder:text-slate-400 focus:outline-none"
                                                        placeholder="Paste any Amazon, Flipkart, Myntra, Croma, Reliance Digital, or FirstCry link..."
                                                        value={autoFetchUrl}
                                                        onChange={e => setAutoFetchUrl(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleFetchDeal(autoFetchUrl);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFetchDeal(autoFetchUrl)}
                                                    disabled={isFetching || !autoFetchUrl}
                                                    className="bg-[#0F172A] hover:bg-[#FF6A00] disabled:bg-slate-200 text-white h-[64px] px-10 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-lg shadow-slate-900/10"
                                                >
                                                    {isFetching ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
                                                    {isFetching ? 'Fetching...' : 'Magic Fetch'}
                                                </button>
                                            </div>
                                            {fetchError && (
                                                <div className="px-6 pb-4 pt-2">
                                                    <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-black px-4 py-2 rounded-xl flex items-center gap-2">
                                                        <AlertCircle size={14} />
                                                        {fetchError}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
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
                                                     </div>
                                                     <input type="text" name="title" className={inputCls} placeholder="e.g. Samsung Galaxy S24 Ultra..."
                                                         value={dealForm.title} onChange={handleChange} required />
                                                 </div>
                                                 <div className="grid grid-cols-2 gap-4">
                                                     <div>
                                                         <div className="flex items-center justify-between mb-1.5">
                                                             <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Store *</label>
                                                         </div>
                                                         <input type="text" name="store" className={inputCls} placeholder="Amazon, Flipkart..."
                                                             value={dealForm.store} onChange={handleChange} required />
                                                     </div>
                                                     <div>
                                                         <div className="flex items-center justify-between mb-1.5">
                                                             <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Category *</label>
                                                         </div>
                                                         <input
                                                             type="text"
                                                             list="category-options"
                                                             name="category"
                                                             className={inputCls}
                                                             placeholder="Select or type a category..."
                                                             value={dealForm.category || ''}
                                                             onChange={handleChange}
                                                             required
                                                         />
                                                         <datalist id="category-options">
                                                             {safeArray(formCategories).map((cat, idx) => (
                                                                 <option key={cat || idx} value={cat} />
                                                             ))}
                                                         </datalist>
                                                     </div>
                                                 </div>
                                                 <div>
                                                     <div className="flex items-center justify-between mb-1.5">
                                                         <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Description</label>
                                                     </div>
                                                     <textarea name="description" className={`${inputCls} min-h-[80px] resize-none`} placeholder="Short product description..."
                                                         value={dealForm.description} onChange={handleChange} />
                                                 </div>
                                            </div>
                                        </div>

                                         {/* Pricing Section */}
                                         <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 space-y-4">
                                             <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                                 <DollarSign size={14} className="text-emerald-500" />
                                                 <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Pricing</span>
                                             </div>

                                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                 {/* MRP */}
                                                 <div>
                                                     <label className="text-xs font-black text-slate-600 uppercase tracking-wide block mb-1.5">
                                                         MRP
                                                     </label>
                                                     <div className="relative">
                                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                                                         <input
                                                             type="number"
                                                             name="mrp"
                                                             value={dealForm.mrp || ""}
                                                             onChange={handleChange}
                                                             placeholder="Enter MRP"
                                                             className={inputCls + " pl-7"}
                                                         />
                                                     </div>
                                                 </div>

                                                 {/* Deal Price */}
                                                 <div>
                                                     <label className="text-xs font-black text-slate-600 uppercase tracking-wide block mb-1.5">
                                                         Deal Price
                                                     </label>
                                                     <div className="relative">
                                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                                                         <input
                                                             type="number"
                                                             name="dealPrice"
                                                             value={dealForm.dealPrice || ""}
                                                             onChange={handleChange}
                                                             placeholder="Enter Deal Price"
                                                             className={inputCls + " pl-7"}
                                                             required
                                                         />
                                                     </div>
                                                 </div>

                                                 {/* Discount */}
                                                 <div>
                                                     <label className="text-xs font-black text-slate-600 uppercase tracking-wide block mb-1.5">
                                                         Discount %
                                                     </label>
                                                     <input
                                                         type="number"
                                                         name="discount"
                                                         value={dealForm.discount || ""}
                                                         onChange={handleChange}
                                                         placeholder="Discount %"
                                                         className={inputCls}
                                                     />
                                                 </div>
                                             </div>

                                             {dealForm.dealPrice && dealForm.mrp && Number(dealForm.mrp) > Number(dealForm.dealPrice) && (
                                                 <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                                     <TrendingUp size={14} className="text-emerald-600" />
                                                     <span className="text-xs font-black text-emerald-700">
                                                         Saving ₹{(Number(dealForm.mrp) - Number(dealForm.dealPrice)).toLocaleString('en-IN')} · {dealForm.discount}% OFF
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
                                                     <div className="flex items-center justify-between mb-1.5">
                                                         <label className="text-xs font-black text-slate-600 uppercase tracking-wide block">Product URL *</label>
                                                         {dealForm.productUrl && (
                                                             <button
                                                                 type="button"
                                                                 onClick={handleFetchDeal}
                                                                 disabled={isFetching}
                                                                 className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:text-orange-700 transition-colors flex items-center gap-1.5"
                                                             >
                                                                 {isFetching ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} fill="currentColor" />}
                                                                 {isFetching ? 'Fetching...' : 'Fetch Deal Details'}
                                                             </button>
                                                         )}
                                                     </div>
                                                     <input
                                                         id="productUrl"
                                                         type="url"
                                                         name="productUrl"
                                                         className={inputCls}
                                                         placeholder="https://www.amazon.in/dp/..."
                                                         value={dealForm.productUrl}
                                                         onChange={handleChange}
                                                         onKeyDown={e => {
                                                             if (e.key === 'Enter') {
                                                                 e.preventDefault();
                                                                 handleFetchDeal(dealForm.productUrl);
                                                             }
                                                         }}
                                                         required
                                                     />
                                                    <p className="mt-2 text-[11px] text-slate-500 font-medium">This stays as the original product URL used for extraction and canonical storage.</p>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide block">Affiliate URL Override</label>
                                                        {dealForm.productUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const generated = buildAffiliateUrl({
                                                                        url: dealForm.productUrl,
                                                                        store: dealForm.store,
                                                                        settings: affiliateSettings,
                                                                        manualOverride: ''
                                                                    });
                                                                    setDealForm(prev => ({ ...prev, affiliateOverrideLink: generated }));
                                                                    showToast?.('Affiliate link generated from settings.', 'success');
                                                                }}
                                                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-1"
                                                            >
                                                                <Zap size={10} fill="currentColor" /> Auto-Generate
                                                            </button>
                                                        )}
                                                    </div>
                                                     <input
                                                         type="url"
                                                         name="affiliateOverrideLink"
                                                         className={inputCls}
                                                         placeholder="Optional manual affiliate URL"
                                                         value={dealForm.affiliateOverrideLink || ''}
                                                         onChange={handleChange}
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
                                                    </div>
                                                     <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                                         <div className="relative flex-1">
                                                             <ImageIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                             <input type="url" name="imageUrl" className={`${inputCls} pl-10`} placeholder="https://cdn.example.com/product.jpg"
                                                                 value={dealForm.imageUrl} onChange={handleChange} required />
                                                         </div>
                                                         <button 
                                                             type="button" 
                                                             onClick={() => {
                                                                 if (dealForm.imageUrl && !dealForm.images?.includes(dealForm.imageUrl)) {
                                                                     setDealForm(prev => ({ ...prev, images: [dealForm.imageUrl, ...(safeArray(prev.images))] }));
                                                                 }
                                                             }}
                                                             className="px-4 py-3 sm:py-0 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-colors shadow-sm flex items-center justify-center gap-2"
                                                         >
                                                             <PlusCircle size={14} /> Add to Selection
                                                         </button>
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
                                                                        className={`relative group/img flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden snap-center cursor-pointer transition-all ${dealForm.imageUrl === imgUrl ? 'ring-4 ring-orange-500 shadow-md scale-105' : 'bg-slate-50 border border-slate-200 hover:border-orange-300'}`}
                                                                        onClick={() => setDealForm({ ...dealForm, imageUrl: imgUrl })}
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
                                                                                    imageUrl: dealForm.imageUrl === imgUrl ? (newImages[0] || '') : dealForm.imageUrl
                                                                                });
                                                                            }}
                                                                            className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity z-30 shadow-lg"
                                                                            title="Remove this image"
                                                                        >
                                                                            <X size={12} strokeWidth={3} />
                                                                        </button>

                                                                        {dealForm.imageUrl === imgUrl && (
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

                                        {/* SEO Overrides */}
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 mt-6">
                                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                                <Search size={14} className="text-blue-500" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">SEO Metadata (Optional Overrides)</span>
                                            </div>
                                            <div className="space-y-4">
                                                 <div>
                                                     <div className="flex items-center justify-between mb-1.5">
                                                         <label className="text-xs font-black text-slate-600 uppercase tracking-wide">SEO Title Override</label>
                                                     </div>
                                                     <input type="text" name="seoTitle" className={inputCls} placeholder={`Auto: ${generateSeoTitle(dealForm).substring(0, 50)}...`}
                                                         value={dealForm.seoTitle || ''} onChange={handleChange} />
                                                 </div>
                                                 <div>
                                                     <div className="flex items-center justify-between mb-1.5">
                                                         <label className="text-xs font-black text-slate-600 uppercase tracking-wide">SEO Description Override</label>
                                                     </div>
                                                     <textarea name="seoDescription" className={`${inputCls} min-h-[60px] resize-none`} placeholder={`Auto: ${generateSeoDescription(dealForm).substring(0, 80)}...`}
                                                         value={dealForm.seoDescription || ''} onChange={handleChange} />
                                                 </div>
                                                 <p className="text-[11px] text-slate-500 font-medium">Leave these blank to let the system auto-generate highly optimized affiliate SEO metadata based on the title, price, and store.</p>
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
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
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
                                                        ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Publishing...</>
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
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50 p-6 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100/50 relative z-10">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Live Preview</span>
                                            </div>

                                            {dealForm.imageUrl ? (
                                                <div className="rounded-3xl overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-100 group/card relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                                                    <div className="relative bg-white h-60 flex items-center justify-center p-8 overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-transparent pointer-events-none" />
                                                        <img src={optimizeImageUrl(dealForm.imageUrl || dealForm.images?.[0])} alt="Preview" className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-md z-10 transition-transform duration-500 group-hover/card:scale-105" />
                                                        {dealForm.discount && (
                                                            <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-orange-500/30 z-20">
                                                                {String(dealForm.discount).endsWith('%') ? dealForm.discount : `${dealForm.discount}%`} OFF
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
                                                                {dealForm.dealPrice ? `₹${Number(dealForm.dealPrice).toLocaleString('en-IN')}` : '₹0'}
                                                            </span>
                                                            {dealForm.mrp && (
                                                                <span className="text-sm font-semibold text-slate-400 line-through mb-1.5">
                                                                    ₹{Number(dealForm.mrp).toLocaleString('en-IN')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button disabled className="w-full bg-slate-900 text-white text-[13px] font-black py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-slate-900/10 opacity-90">
                                                            <span>GET DEAL NOW</span> <ExternalLink size={14} className="opacity-80" />
                                                        </button>

                                                        {/* Live SEO Preview Box */}
                                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <Search size={12} className="text-blue-500" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Engine View</span>
                                                            </div>
                                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                                                <p className="text-[#1a0dab] text-[13px] font-bold line-clamp-1 truncate">{dealForm.seoTitle || generateSeoTitle(dealForm)}</p>
                                                                <p className="text-[#006621] text-[11px] mb-1">dealsphere.com/product/...</p>
                                                                <p className="text-slate-600 text-[11px] leading-snug line-clamp-2">{dealForm.seoDescription || generateSeoDescription(dealForm)}</p>
                                                            </div>
                                                        </div>
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
                                            {dealForm.productUrl && !isLoading && (
                                                <div className="mt-6 space-y-4">
                                                    <DealAutomationChecklist
                                                        form={{ ...dealForm, affiliateLink: affiliatePreviewUrl }}
                                                        isLikelyHttpUrl={isLikelyHttpUrl}
                                                        sanitizeUrl={sanitizeUrl}
                                                        normalizeNumberLike={normalizeNumberLike}
                                                    />
                                                    <DuplicateCandidatesPanel
                                                        candidates={duplicateCandidates}
                                                        onEdit={handleEditClick}
                                                        getDealId={getDealId}
                                                        getDealDisplayPrice={getDealDisplayPrice}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}


                        {activeTab === 'manage-blogs' && (
                            <motion.div
                                key="manage-blogs"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <AdminBlogManager showToast={showToast} />
                            </motion.div>
                        )}

                        {activeTab === 'manage-freebies' && (
                            <motion.div
                                key="manage-freebies"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <AdminFreebieManager showToast={showToast} />
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
                                            {(Array.isArray(affiliateSettings) ? affiliateSettings.length : 0)} synced store{(Array.isArray(affiliateSettings) ? affiliateSettings.length : 0) === 1 ? '' : 's'} · new stores appear here automatically.
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

                                <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 p-6 mb-6">
                                    {(!Array.isArray(affiliateSettings) || affiliateSettings.length === 0) ? (
                                        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                            <ExternalLink size={28} className="mx-auto mb-4 text-slate-300" />
                                            <h3 className="text-xl font-black text-slate-900">No live stores found yet</h3>
                                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                                Add or fetch deals first. Stores with real products will sync into Affiliate Tags automatically.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-5">
                                            {(Array.isArray(affiliateSettings) ? affiliateSettings : []).map((setting) => (
                                                <div key={setting.storeSlug || setting.store} className="rounded-[2.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/20 p-6 transition-all hover:shadow-2xl hover:shadow-slate-200/40 hover:-translate-y-1">
                                                    <div className="mb-6 flex flex-col gap-6 border-b border-slate-100 pb-6 lg:flex-row lg:items-center lg:justify-between">
                                                        <div className="flex items-center gap-5">
                                                            <div className="relative group">
                                                                <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 relative z-10 overflow-hidden p-2">
                                                                    <img
                                                                        src={getStoreLogoUrl(setting.store)}
                                                                        alt={setting.store}
                                                                        className="w-full h-full object-contain"
                                                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${setting.store}&background=random`; }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="text-xl font-black text-slate-900 truncate">{setting.store}</h4>
                                                                    {setting.enabled && !setting.pendingSetup && (
                                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                                                                    <Layers size={10} /> {setting.storeSlug}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${setting.enabled && !setting.pendingSetup ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                                                                {setting.enabled && !setting.pendingSetup ? 'Configured' : 'Pending setup'}
                                                            </span>
                                                            <div className="flex flex-col items-end lg:items-start justify-center gap-1.5">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enabled</label>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only peer"
                                                                        checked={Boolean(setting.enabled)}
                                                                        onChange={e => handleAffiliateSettingChange(setting.storeSlug, 'enabled', e.target.checked)}
                                                                    />
                                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                                    <span className="ml-3 text-sm font-bold text-slate-700">{setting.enabled ? 'On' : 'Off'}</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">

                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Parameter Key</label>
                                                            <input
                                                                type="text"
                                                                className={inputCls}
                                                                placeholder="tag (or 'prefix' for link format)"
                                                                value={setting.paramKey}
                                                                onChange={e => handleAffiliateSettingChange(setting.storeSlug, 'paramKey', e.target.value)}
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Parameter Value</label>
                                                            <input
                                                                type="text"
                                                                className={inputCls}
                                                                placeholder="mytag-21 or https://admitad.com/?url="
                                                                value={setting.paramValue}
                                                                onChange={e => handleAffiliateSettingChange(setting.storeSlug, 'paramValue', e.target.value)}
                                                            />
                                                            <p className="mt-1 text-[9.5px] text-slate-400 font-semibold leading-tight">If using a prefix link, set key to <strong className="text-slate-600">prefix</strong>.</p>
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
                                                {dealForm.productUrl || 'Go to Add Deal and paste a product URL to preview the final affiliate link.'}
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
                                                <input type="number" className={inputCls} value={quickEditDeal.dealPrice || ''} onChange={(event) => setQuickEditDeal(prev => ({ ...prev, dealPrice: Number(event.target.value) || 0 }))} placeholder="Deal price" />
                                                <input type="number" className={inputCls} value={quickEditDeal.price || ''} onChange={(event) => setQuickEditDeal(prev => ({ ...prev, price: Number(event.target.value) || 0, mrp: Number(event.target.value) || 0 }))} placeholder="MRP" />
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
