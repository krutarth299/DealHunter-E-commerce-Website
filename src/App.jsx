import React, { useState, useEffect, useContext, useRef, useMemo, useCallback, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/authContextDefinition';
import ScrollToTop from './components/ScrollToTop';
import { CheckCircle2, Info, AlertCircle, X, Loader2 } from 'lucide-react';
import { WishlistAnimationProvider } from './context/WishlistAnimationContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import { getSocket } from './utils/socket';
import { normalizeDealForUi, normalizeDealsForUi } from './utils/dealUi';

const lazyWithRetry = (factory, key) => React.lazy(async () => {
  const reloadKey = `dealsphere:lazy-retried:${key}`;

  try {
    const module = await factory();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(reloadKey);
    }
    return module;
  } catch (error) {
    const message = String(error?.message || '');
    const isDynamicImportFailure =
      message.includes('Failed to fetch dynamically imported module')
      || message.includes('Importing a module script failed')
      || message.includes('error loading dynamically imported module');

    if (typeof window !== 'undefined' && isDynamicImportFailure && !window.sessionStorage.getItem(reloadKey)) {
      window.sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
      return new Promise(() => { });
    }

    throw error;
  }
});


const Home = lazyWithRetry(() => import('./pages/Home'), 'Home');
const Deals = lazyWithRetry(() => import('./pages/Deals'), 'Deals');
const Stores = lazyWithRetry(() => import('./pages/Stores'), 'Stores');
const StoreDetails = lazyWithRetry(() => import('./pages/StoreDetails'), 'StoreDetails');
const ProductDetails = lazyWithRetry(() => import('./pages/ProductDetails'), 'ProductDetails');
const Wishlist = lazyWithRetry(() => import('./pages/Wishlist'), 'Wishlist');
const Blog = lazyWithRetry(() => import('./pages/Blog'), 'Blog');
const BlogPost = lazyWithRetry(() => import('./pages/BlogPost'), 'BlogPost');
const CategoryDetails = lazyWithRetry(() => import('./pages/CategoryDetails'), 'CategoryDetails');
const InfoPage = lazyWithRetry(() => import('./pages/InfoPage'), 'InfoPage');
const AdminPanel = lazyWithRetry(() => import('./pages/AdminPanel'), 'AdminPanel');
import { AFFILIATE_STORE_PROFILES } from './config/storeProfiles';

const RouteFallback = ({ label = 'Loading page...' }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-6 py-5 text-sm font-black text-slate-600 shadow-sm">
      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
      {label}
    </div>
  </div>
);

const AdminRouteFallback = () => <RouteFallback label="Loading admin workspace..." />;
const PublicRouteFallback = () => <RouteFallback label="Loading DealSphere..." />;


const getBrowserStorage = () => {
  if (typeof window === 'undefined') return null;
  const storage = window.localStorage;
  return storage && typeof storage.getItem === 'function' ? storage : null;
};

const readBrowserStorage = (key) => {
  try {
    return getBrowserStorage()?.getItem(key) || null;
  } catch {
    return null;
  }
};

const DEALS_CACHE_META_KEY = 'cached_deals_meta';
const DEALS_CACHE_KEY = 'cached_deals';
const DEALS_CACHE_VERSION = 3;
const LIVE_DEALS_REFRESH_MS = 2 * 60 * 1000;
const LIVE_DATA_CHANGED_EVENT = 'dealsphere:data-changed';
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
  extractionWarning: '',
  featured: false,
  isExpired: false
};

const writeBrowserStorage = (key, value) => {
  try {
    getBrowserStorage()?.setItem(key, value);
  } catch {
    // Storage can be unavailable in private mode or during server render.
  }
};

const removeBrowserStorage = (key) => {
  try {
    getBrowserStorage()?.removeItem(key);
  } catch {
    // Storage can be unavailable in private mode or during server render.
  }
};

const readDealsCacheMeta = () => {
  const raw = readBrowserStorage(DEALS_CACHE_META_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getCachedDealsSnapshot = () => {
  const cachedDealsRaw = readBrowserStorage(DEALS_CACHE_KEY);
  const cacheMeta = readDealsCacheMeta();

  if (!cachedDealsRaw || !cacheMeta || cacheMeta.version !== DEALS_CACHE_VERSION) {
    removeBrowserStorage(DEALS_CACHE_KEY);
    removeBrowserStorage(DEALS_CACHE_META_KEY);
    return null;
  }

  try {
    const parsedDeals = JSON.parse(cachedDealsRaw);
    if (!Array.isArray(parsedDeals)) return null;

    return {
      deals: normalizeDealsForUi(parsedDeals),
      meta: cacheMeta
    };
  } catch {
    removeBrowserStorage(DEALS_CACHE_KEY);
    removeBrowserStorage(DEALS_CACHE_META_KEY);
    return null;
  }
};

const emitLiveDataChanged = (detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LIVE_DATA_CHANGED_EVENT, { detail }));
};

export function AppContent({ preloadedDeals = null, preloadedCategories = null }) {
  console.count("APP RENDER");
  const authContext = useContext(AuthContext);
  const { user, logout, loading, apiBase } = authContext || { user: null, logout: () => { }, loading: false, apiBase: '' };
  const cachedDealsSnapshot = getCachedDealsSnapshot();
  const cachedDealsMeta = cachedDealsSnapshot?.meta || null;
  const cachedDealsUpdatedAt = cachedDealsMeta?.updatedAt;
  const cachedDealsMetaVersion = cachedDealsMeta?.version;
  const hasPreloadedDeals = Array.isArray(preloadedDeals) && preloadedDeals.length > 0;
  const hasWindowDeals = typeof window !== 'undefined' && Array.isArray(window.__INITIAL_DATA__) && window.__INITIAL_DATA__.length > 0;
  const hasCachedDeals = Boolean(cachedDealsSnapshot?.deals?.length);
  const hasPreloadedCategories = Array.isArray(preloadedCategories) && preloadedCategories.length > 0;
  const hasWindowCategories = typeof window !== 'undefined' && Array.isArray(window.__INITIAL_CATEGORIES__) && window.__INITIAL_CATEGORIES__.length > 0;

  const [deals, setDeals] = useState(() => {
    // 1. High-priority Server Injected Prop (Hydration)
    if (preloadedDeals && Array.isArray(preloadedDeals) && preloadedDeals.length > 0) return normalizeDealsForUi(preloadedDeals);
    // 2. High-priority Window Global (Dynamic Hydration)
    if (typeof window !== 'undefined' && window.__INITIAL_DATA__ && Array.isArray(window.__INITIAL_DATA__) && window.__INITIAL_DATA__.length > 0) return normalizeDealsForUi(window.__INITIAL_DATA__);

    // 3. Medium-priority Cache
    if (cachedDealsSnapshot?.deals?.length) return cachedDealsSnapshot.deals;
    // 4. No static fallback: the live API/database is the source of truth.
    return [];
  });
  const [coupons, setCoupons] = useState([]);
  const dealsRef = useRef(deals);
  const [dealsState, setDealsState] = useState({
    loading: false,
    error: '',
    source: hasPreloadedDeals ? 'ssr' : hasWindowDeals ? 'window' : hasCachedDeals ? 'cache' : 'fallback'
  });

  const [categories, setCategories] = useState(() => {
    // 1. High-priority Server Injected Prop (Hydration)
    if (preloadedCategories && Array.isArray(preloadedCategories) && preloadedCategories.length > 0) return preloadedCategories;
    // 2. High-priority Window Global (Dynamic Hydration)
    if (typeof window !== 'undefined' && window.__INITIAL_CATEGORIES__ && Array.isArray(window.__INITIAL_CATEGORIES__)) return window.__INITIAL_CATEGORIES__;
    return [];
  });
  const [homepageSnapshot, setHomepageSnapshot] = useState(() => ({
    deals: hasPreloadedDeals ? normalizeDealsForUi(preloadedDeals) : hasWindowDeals ? normalizeDealsForUi(window.__INITIAL_DATA__ || []) : cachedDealsSnapshot?.deals || [],
    categories: hasPreloadedCategories ? preloadedCategories : hasWindowCategories ? (window.__INITIAL_CATEGORIES__ || []) : [],
    stores: [],
    updatedAt: cachedDealsUpdatedAt || null
  }));

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState(DEFAULT_DEAL_FORM);

  // Global Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ show: true, message, type });
    toastTimerRef.current = window.setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  // Global Custom Event Listener for Toasts
  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e.detail && e.detail.message) {
        showToast(e.detail.message, e.detail.type || 'info');
      }
    };
    const handleLocalDataChange = (e) => {
      const { entity, action, id, deal } = e.detail || {};
      if (entity === 'deal') {
        if (action === 'deleted' && id) {
          setDeals(prev => {
            const next = prev.filter(d => String(d._id || d.id) !== String(id));
            writeBrowserStorage(DEALS_CACHE_KEY, JSON.stringify(next));
            writeBrowserStorage(DEALS_CACHE_META_KEY, JSON.stringify({ updatedAt: Date.now(), version: DEALS_CACHE_VERSION }));
            return next;
          });
          setHomepageSnapshot((snapshot) => ({
            ...snapshot,
            deals: snapshot.deals.filter(d => String(d._id || d.id) !== String(id)),
            updatedAt: Date.now()
          }));
        } else if (action === 'updated' && id && deal) {
          const normalizedDeal = normalizeDealsForUi([deal])[0];
          if (normalizedDeal) {
            setDeals(prev => {
              const next = [normalizedDeal, ...prev.filter(d => String(d._id || d.id) !== String(id))];
              writeBrowserStorage(DEALS_CACHE_KEY, JSON.stringify(next));
              writeBrowserStorage(DEALS_CACHE_META_KEY, JSON.stringify({ updatedAt: Date.now(), version: DEALS_CACHE_VERSION }));
              return next;
            });
            setHomepageSnapshot((snapshot) => ({
              ...snapshot,
              deals: [normalizedDeal, ...snapshot.deals.filter(d => String(d._id || d.id) !== String(id))],
              updatedAt: Date.now()
            }));
          }
        }
      }
    };
    window.addEventListener('showToast', handleCustomToast);
    window.addEventListener('dealsphere:data-changed', handleLocalDataChange);
    return () => {
      window.removeEventListener('showToast', handleCustomToast);
      window.removeEventListener('dealsphere:data-changed', handleLocalDataChange);
    };
  }, [showToast]);

  // Sync Deals & Categories from Server & Handle Real-time Updates
  useEffect(() => {
    dealsRef.current = deals;
  }, [deals]);

  const fetchHomepageSnapshot = useCallback(async ({ silent = false } = {}) => {
    if (!apiBase) return null;

    if (!silent) {
      setDealsState(prev => ({ ...prev, loading: true, error: '' }));
    }

    const baseUrl = apiBase.replace('/user', '');
    const snapshotResponse = await fetch(`${baseUrl}/deals/homepage?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    const snapshotRaw = await snapshotResponse.text().catch(() => '');
    let snapshotData = {};
    if (snapshotRaw) {
      try {
        const parsed = JSON.parse(snapshotRaw);
        snapshotData = parsed.success && parsed.data ? parsed.data : parsed;
      } catch (e) {
        console.error('Failed to parse homepage JSON', e);
      }
    }

    if (!snapshotResponse.ok) {
      throw new Error(snapshotData?.message || `Failed to load homepage snapshot (${snapshotResponse.status})`);
    }

    const normalizedDeals = normalizeDealsForUi(Array.isArray(snapshotData?.deals) ? snapshotData.deals : []);
    const normalizedCategories = Array.isArray(snapshotData?.categories) ? snapshotData.categories : [];
    const normalizedStores = Array.isArray(snapshotData?.stores) ? snapshotData.stores : [];

    const normalizedCoupons = Array.isArray(snapshotData?.coupons) ? snapshotData.coupons : [];

    console.log("[COUPONS_RAW]", snapshotData?.coupons);
    console.log("[COUPONS_NORMALIZED]", normalizedCoupons);

    console.info(`[HOMEPAGE_FETCH] deals=${normalizedDeals.length} coupons=${normalizedCoupons.length} stores=${normalizedStores.length} categories=${normalizedCategories.length}`);
    console.info(`[DEALS_FRONTEND] source=homepage-api fetched=${normalizedDeals.length}`);

    setDeals(normalizedDeals);
    setCoupons(normalizedCoupons);
    setCategories(normalizedCategories);
    setHomepageSnapshot({
      deals: normalizedDeals,
      categories: normalizedCategories,
      stores: normalizedStores,
      updatedAt: snapshotData?.updatedAt || Date.now()
    });

    if (normalizedDeals.length > 0) {
      writeBrowserStorage(DEALS_CACHE_KEY, JSON.stringify(normalizedDeals));
      writeBrowserStorage(DEALS_CACHE_META_KEY, JSON.stringify({ updatedAt: Date.now(), version: DEALS_CACHE_VERSION }));
    } else {
      removeBrowserStorage(DEALS_CACHE_KEY);
      removeBrowserStorage(DEALS_CACHE_META_KEY);
    }

    const visibleStores = [...new Set(normalizedDeals.map((deal) => String(deal.store || deal.storeName || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    console.info(`[HOMEPAGE_RENDER] visible stores=${visibleStores.join(', ') || 'none'} count=${normalizedDeals.length}`);
    setDealsState(prev => ({
      ...prev,
      loading: false,
      error: '',
      source: 'homepage-api'
    }));
    return snapshotData;
  }, [apiBase]);

  const hasFetchedInitialDeals = useRef(false);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        await fetchHomepageSnapshot();
      } catch (err) {
        console.error("Failed to sync app data:", err);
        setDealsState(prev => ({ ...prev, loading: false, error: err.message || 'Failed to load live homepage data.' }));
      }
    };

    const cacheFresh = Boolean(
      cachedDealsMetaVersion === DEALS_CACHE_VERSION
      && Number.isFinite(cachedDealsUpdatedAt)
      && (Date.now() - cachedDealsUpdatedAt < LIVE_DEALS_REFRESH_MS)
    );

    const shouldSkipInitialFetch = hasPreloadedDeals || hasWindowDeals || (hasCachedDeals && cacheFresh);

    if (apiBase && !hasFetchedInitialDeals.current) {
      hasFetchedInitialDeals.current = true;
      if (dealsRef.current.length === 0) {
        fetchDeals();
      } else if (shouldSkipInitialFetch) {
        setDealsState(prev => ({ ...prev, loading: false, source: hasPreloadedDeals ? 'ssr' : hasWindowDeals ? 'window' : 'cache' }));
      }
    }

    // Socket.io Real-time Listeners (Client-side ONLY)
    const socket = typeof window !== 'undefined' ? getSocket() : null;

    if (socket) {

      socket.on('newDeal', (newDeal) => {
        const normalizedDeal = normalizeDealForUi(newDeal);

        setDeals(prev => {
          const next = [
            normalizedDeal,
            ...prev.filter(d =>
              (d._id || d.id) !== (normalizedDeal._id || normalizedDeal.id)
            )
          ];
          writeBrowserStorage(DEALS_CACHE_KEY, JSON.stringify(next));
          writeBrowserStorage(DEALS_CACHE_META_KEY, JSON.stringify({ updatedAt: Date.now(), version: DEALS_CACHE_VERSION }));
          return next;
        });
        setHomepageSnapshot((snapshot) => ({
          ...snapshot,
          deals: [normalizedDeal, ...snapshot.deals.filter(d => (d._id || d.id) !== (normalizedDeal._id || normalizedDeal.id))],
          updatedAt: Date.now()
        }));
        emitLiveDataChanged({ entity: 'deal', action: 'added', id: normalizedDeal._id || normalizedDeal.id });
      });

      socket.on('updateDeal', (updatedDeal) => {
        const normalizedDeal = normalizeDealForUi(updatedDeal);
        setDeals(prev => {
          // Remove the deal from its current position and put it at the very top
          const next = [normalizedDeal, ...prev.filter(d => (d._id || d.id) !== (normalizedDeal._id || normalizedDeal.id))];
          writeBrowserStorage(DEALS_CACHE_KEY, JSON.stringify(next));
          writeBrowserStorage(DEALS_CACHE_META_KEY, JSON.stringify({ updatedAt: Date.now(), version: DEALS_CACHE_VERSION }));
          return next;
        });
        setHomepageSnapshot((snapshot) => ({
          ...snapshot,
          deals: [normalizedDeal, ...snapshot.deals.filter(d => (d._id || d.id) !== (normalizedDeal._id || normalizedDeal.id))],
          updatedAt: Date.now()
        }));
        emitLiveDataChanged({ entity: 'deal', action: 'updated', id: normalizedDeal._id || normalizedDeal.id });
      });

      socket.on('deleteDeal', (dealId) => {
        setDeals(prev => {
          const next = prev.filter(d => (d._id || d.id) !== dealId);
          writeBrowserStorage(DEALS_CACHE_KEY, JSON.stringify(next));
          writeBrowserStorage(DEALS_CACHE_META_KEY, JSON.stringify({ updatedAt: Date.now(), version: DEALS_CACHE_VERSION }));
          return next;
        });
        setHomepageSnapshot((snapshot) => ({
          ...snapshot,
          deals: snapshot.deals.filter(d => (d._id || d.id) !== dealId),
          updatedAt: Date.now()
        }));
        emitLiveDataChanged({ entity: 'deal', action: 'deleted', id: dealId });
      });

      return () => {
        socket.off('newDeal');
        socket.off('updateDeal');
        socket.off('deleteDeal');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, fetchHomepageSnapshot]);

  const publicDeals = useMemo(() => (deals || []).filter(deal =>
    deal
    && Boolean(deal.title)
    && Boolean(deal.productUrl || deal.link || deal._id || deal.id)
  ), [deals]);

  useEffect(() => {
    const visibleStores = [...new Set(publicDeals.map((deal) => String(deal.store || deal.storeName || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    console.info(`[UI_RENDER] visible stores=${visibleStores.join(', ') || 'none'} count=${publicDeals.length}`);
  }, [publicDeals]);

  const normalizedSearchQuery = searchQuery.toLowerCase();
  const filteredDeals = useMemo(() => publicDeals.filter(deal =>
    deal && (
      !normalizedSearchQuery ||
      (deal.title && deal.title.toLowerCase().includes(normalizedSearchQuery)) ||
      ((deal.store || deal.storeName) && String(deal.store || deal.storeName).toLowerCase().includes(normalizedSearchQuery)) ||
      (deal.category && deal.category.toLowerCase().includes(normalizedSearchQuery))
    )
  ), [normalizedSearchQuery, publicDeals]);

  const [wishlist, setWishlist] = useState(() => {
    const storedWishlist = readBrowserStorage('wishlist');
    if (!storedWishlist) return [];

    try {
      const parsedWishlist = JSON.parse(storedWishlist);
      return Array.isArray(parsedWishlist) ? parsedWishlist : [];
    } catch {
      return [];
    }
  });


  useEffect(() => {
    writeBrowserStorage('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Clear search query when navigating to certain pages
  useEffect(() => {
    // Determine path simply since useLocation isn't directly here
  }, [setSearchQuery]);

  const toggleWishlist = useCallback((product) => {
    setWishlist(prev => {
      const prodId = product.id || product._id;
      if (!prodId) return prev; // Cannot toggle item without ID

      const exists = prev.find(item => {
        const itemId = item.id || item._id;
        return itemId && String(itemId) === String(prodId);
      });

      if (exists) {
        showToast('Removed from Wishlist', 'info');
        return prev.filter(item => {
          const itemId = item.id || item._id;
          return itemId && String(itemId) !== String(prodId);
        });
      }
      showToast('Added to Wishlist ❤️', 'success');
      return [...prev, product];
    });
  }, [showToast]);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
    showToast('Wishlist cleared', 'info');
  }, [showToast]);

  const handleAddDeal = useCallback(async (e, directData = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!apiBase) return false;

    const dealsApi = apiBase.replace('/user', '') + '/deals';
    const payload = directData || {
      ...dealForm,
      rating: Number(dealForm.rating || 0) || 0
    };

    try {
      const response = await fetch(dealsApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': 'anonymous'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        showToast(error.message || 'Failed to publish deal', 'error');
        return false;
      }

      const newDeal = normalizeDealForUi(await response.json());
      window.dispatchEvent(new CustomEvent('newDealAdded', { detail: newDeal }));
      setDeals(prev => [newDeal, ...prev.filter(d => (d._id || d.id) !== (newDeal._id || newDeal.id))]);
      emitLiveDataChanged({ entity: 'deal', action: 'created', id: newDeal._id || newDeal.id, source: 'manual-create' });
      showToast('Deal published successfully!', 'success');
      setIsAddDealOpen(false);
      setDealForm(DEFAULT_DEAL_FORM);
      return true;
    } catch (err) {
      console.error('Error adding deal:', err);
      showToast('Connection error', 'error');
      return false;
    }
  }, [apiBase, dealForm, showToast]);

  const slugify = (value = '') => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const normalizedStoreSlugs = useMemo(() => (
    new Set(Object.keys(AFFILIATE_STORE_PROFILES).map((store) => slugify(store)))
  ), []);



  const handleAddDealClick = useCallback(() => setIsAddDealOpen(true), []);

  const sharedProps = useMemo(() => ({
    user,
    onAddDealClick: handleAddDealClick,
    isAddDealOpen,
    setIsAddDealOpen,
    handleAddDeal,
    dealForm,
    setDealForm,
    wishlistCount: wishlist.length,
    wishlist,
    toggleWishlist,
    clearWishlist,
    showToast,
    apiBase,
    categories,
    setCategories,
    coupons,
    setCoupons,
    dealsLoading: dealsState.loading,
    dealsError: dealsState.error
  }), [
    user,
    handleAddDealClick,
    isAddDealOpen,
    handleAddDeal,
    dealForm,
    wishlist,
    toggleWishlist,
    clearWishlist,
    showToast,
    apiBase,
    categories,
    coupons,
    dealsState.loading,
    dealsState.error
  ]);

  // Optimized Hydration Loading System:
  // If we have no data at all (not even cached/default), we show a clean loading screen on the CLIENT.
  // We NEVER show the loading screen during SSR (server-side rendering) to ensure the Page Source is complete.
  const isServer = typeof window === 'undefined';
  const hasData = (deals && deals.length > 0) || (categories && categories.length > 0);

  // loading is from AuthContext, deals/hasData is our content
  if (loading && !isServer && !hasData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Initializing DealSphere</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-blue-600 animate-bounce" />
              <div className="w-1 h-1 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const SeoAliasRedirect = ({ mode = 'offers' }) => {
    const { slug } = useParams();
    const normalizedSlug = slugify(slug);

    if (normalizedStoreSlugs.has(normalizedSlug)) {
      return <Navigate to={`/store/${encodeURIComponent(normalizedSlug)}`} replace />;
    }

    if (mode === 'deals' || mode === 'offers' || mode === 'coupons') {
      return <Navigate to={`/category/${encodeURIComponent(normalizedSlug)}`} replace />;
    }

    return <Navigate to="/deals" replace />;
  };

  return (
    <>
      <ScrollToTop />
      <div id="main-app-container" className="min-h-screen">
        <Suspense fallback={<PublicRouteFallback />}>
          <Routes>
            <Route path="/" element={<Home {...sharedProps} deals={filteredDeals} homepageSnapshot={homepageSnapshot} onSearch={setSearchQuery} />} />
            <Route path="/home" element={<Home {...sharedProps} deals={filteredDeals} homepageSnapshot={homepageSnapshot} onSearch={setSearchQuery} />} />
            <Route path="/blogs" element={<Navigate to="/blog" replace />} />
            <Route path="/categories" element={<Navigate to="/deals" replace />} />
            <Route path="/about" element={<InfoPage {...sharedProps} page="about" />} />
            <Route path="/contact" element={<InfoPage {...sharedProps} page="contact" />} />
            <Route path="/privacy-policy" element={<InfoPage {...sharedProps} page="privacy" />} />
            <Route path="/terms" element={<InfoPage {...sharedProps} page="terms" />} />
            <Route path="/category/:slug" element={<CategoryDetails {...sharedProps} deals={publicDeals} />} />
            <Route path="/store/:storeName" element={<StoreDetails {...sharedProps} />} />
            <Route path="/today-deals" element={<Navigate to="/deals" replace />} />
            <Route path="/:slug-deals" element={<SeoAliasRedirect mode="deals" />} />
            <Route path="/:slug-offers" element={<SeoAliasRedirect mode="offers" />} />

            {/* Dedicated Admin Panel Routes - Protected */}
            {/* Admin Panel made accessible without login */}
            <Route path="/admin/*" element={(
              <Suspense fallback={<AdminRouteFallback />}>
                <AdminPanel {...sharedProps} deals={deals} setDeals={setDeals} />
              </Suspense>
            )} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            <Route path="/deals" element={<Deals {...sharedProps} deals={filteredDeals} onSearch={setSearchQuery} />} />
            <Route path="/wishlist" element={<Wishlist {...sharedProps} wishlist={wishlist} wishlistCount={wishlist.length} />} />
            <Route path="/blog" element={<Blog {...sharedProps} />} />
            <Route path="/blog/:slug" element={<BlogPost {...sharedProps} />} />
            <Route path="/stores" element={<Stores {...sharedProps} deals={publicDeals} />} />
            <Route path="/deal/:id" element={<ProductDetails {...sharedProps} deals={publicDeals} />} />
            <Route path="/product/:id" element={<ProductDetails {...sharedProps} deals={publicDeals} />} />

            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>

      {/* Global Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
          <div className="bg-slate-900 border border-slate-700 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
            {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-rose-400" />}
            {toast.type === 'info' && <Info size={18} className="text-blue-400" />}
            {toast.type === 'loading' && <Loader2 size={18} className="text-blue-400 animate-spin" />}
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
            <button onClick={() => setToast({ show: false, message: '', type: 'info' })} className="ml-2 text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic SEO Data Container for Client-Side Routing */}
    </>
  );
}

export function App({ children }) {
  return (
    <AuthProvider>
      <WishlistAnimationProvider>
        <RecentlyViewedProvider>
          {children}
        </RecentlyViewedProvider>
      </WishlistAnimationProvider>
    </AuthProvider>
  );
}

export default App;
