import React, { useState, useEffect, useContext, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Deals from './pages/Deals';
import Stores from './pages/Stores';
import ProductDetails from './pages/ProductDetails';
import Wishlist from './pages/Wishlist';
import AdminPanel from './pages/AdminPanel';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Coupons from './pages/Coupons';
import CouponStore from './pages/CouponStore';
import { INITIAL_DEALS } from './data/initialDeals';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/authContextDefinition';
import ScrollToTop from './components/ScrollToTop';
import { motion } from 'framer-motion';
import { Flame, CheckCircle2, Info, AlertCircle, X, Loader2 } from 'lucide-react';
import { WishlistAnimationProvider } from './context/WishlistAnimationContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import Modal from './components/Modal';
import { io } from 'socket.io-client';
import { normalizeDealForUi, normalizeDealsForUi } from './utils/dealUi';

// socket initialized inside useEffect to avoid SSR crashes
let socket;

const API_BASE_URL = 'http://127.0.0.1:5000/api';

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

export function AppContent({ preloadedDeals = null, preloadedCategories = null }) {
  const { user, logout, loading, apiBase } = useContext(AuthContext);
  const hasPreloadedDeals = Array.isArray(preloadedDeals) && preloadedDeals.length > 0;
  const hasWindowDeals = typeof window !== 'undefined' && Array.isArray(window.__INITIAL_DATA__) && window.__INITIAL_DATA__.length > 0;
  const hasCachedDeals = Boolean(readBrowserStorage('cached_deals'));
  
  const [deals, setDeals] = useState(() => {
    // 1. High-priority Server Injected Prop (Hydration)
    if (preloadedDeals && Array.isArray(preloadedDeals) && preloadedDeals.length > 0) return normalizeDealsForUi(preloadedDeals);
    // 2. High-priority Window Global (Dynamic Hydration)
    if (typeof window !== 'undefined' && window.__INITIAL_DATA__ && Array.isArray(window.__INITIAL_DATA__)) return normalizeDealsForUi(window.__INITIAL_DATA__);
    
    // 3. Medium-priority Cache
    const cached = readBrowserStorage('cached_deals');
    if (cached) {
        try { return normalizeDealsForUi(JSON.parse(cached)); } catch(e) { /* corrupted */ }
    }
    // 4. Fallback Static Data
    return normalizeDealsForUi(INITIAL_DEALS);
  });
  const dealsRef = useRef(deals);
  const [dealsState, setDealsState] = useState({
    loading: !(hasPreloadedDeals || hasWindowDeals || hasCachedDeals),
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

  const [searchQuery, setSearchQuery] = useState('');

  // Global Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  // Global Custom Event Listener for Toasts
  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e.detail && e.detail.message) {
        showToast(e.detail.message, e.detail.type || 'info');
      }
    };
    window.addEventListener('showToast', handleCustomToast);
    return () => window.removeEventListener('showToast', handleCustomToast);
  }, []);

  // Sync Deals & Categories from Server & Handle Real-time Updates
  useEffect(() => {
    dealsRef.current = deals;
  }, [deals]);

  useEffect(() => {
    const fetchDeals = async () => {
      setDealsState(prev => ({ ...prev, loading: true, error: '' }));
      try {
        const baseUrl = apiBase.replace('/user', '');
        const [dealsRes, catsRes] = await Promise.all([
            fetch(`${baseUrl}/deals`),
            fetch(`${baseUrl}/deals/categories`)
        ]);
        
        if (dealsRes.ok) {
            const d = await dealsRes.json();
            const apiDeals = Array.isArray(d) ? d : [];
            const normalizedDeals = normalizeDealsForUi(apiDeals);
            console.info(`[DEALS_FRONTEND] source=api fetched=${normalizedDeals.length}`);

            if (normalizedDeals.length > 0 || dealsRef.current.length === 0) {
                setDeals(normalizedDeals);
                if (normalizedDeals.length > 0) {
                  writeBrowserStorage('cached_deals', JSON.stringify(normalizedDeals));
                } else {
                  removeBrowserStorage('cached_deals');
                }
            } else {
                console.warn(`[DEALS_FRONTEND] API returned 0 deals; preserving existing=${dealsRef.current.length}`);
            }
            setDealsState({ loading: false, error: '', source: 'api' });
        } else {
            setDealsState(prev => ({ ...prev, loading: false, error: `Failed to load deals (${dealsRes.status})` }));
        }
        if (catsRes.ok) {
            const c = await catsRes.json();
            if (Array.isArray(c)) setCategories(c);
        }
      } catch (err) {
        console.error("Failed to sync app data:", err);
        setDealsState(prev => ({ ...prev, loading: false, error: 'Failed to load live deals.' }));
      }
    };

    if (apiBase) fetchDeals();

    // Socket.io Real-time Listeners (Client-side ONLY)
    if (typeof window !== 'undefined' && !socket) {
        socket = io('http://127.0.0.1:5000');
    }

    if (socket) {
        socket.on('newDeal', (newDeal) => {
          const normalizedDeal = normalizeDealForUi(newDeal);
          setDeals(prev => {
            const next = [normalizedDeal, ...prev.filter(d => (d._id || d.id) !== (normalizedDeal._id || normalizedDeal.id))];
            writeBrowserStorage('cached_deals', JSON.stringify(next));
            return next;
          });
          showToast('New deal just went live! 🔥', 'info');
        });

        socket.on('updateDeal', (updatedDeal) => {
          const normalizedDeal = normalizeDealForUi(updatedDeal);
          setDeals(prev => {
            const next = prev.map(d => (d._id || d.id) === (normalizedDeal._id || normalizedDeal.id) ? normalizedDeal : d);
            writeBrowserStorage('cached_deals', JSON.stringify(next));
            return next;
          });
        });

        socket.on('deleteDeal', (dealId) => {
          setDeals(prev => {
            const next = prev.filter(d => (d._id || d.id) !== dealId);
            writeBrowserStorage('cached_deals', JSON.stringify(next));
            return next;
          });
        });

        const notifyCouponPages = () => {
          window.dispatchEvent(new CustomEvent('dealsphere:coupons-changed'));
        };

        socket.on('newCoupon', notifyCouponPages);
        socket.on('updateCoupon', notifyCouponPages);
        socket.on('deleteCoupon', notifyCouponPages);

        return () => {
          socket.off('newDeal');
          socket.off('updateDeal');
          socket.off('deleteDeal');
          socket.off('newCoupon', notifyCouponPages);
          socket.off('updateCoupon', notifyCouponPages);
          socket.off('deleteCoupon', notifyCouponPages);
        };
    }
  }, [apiBase]);

  // Add Deal Form State (Shared)
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState({
    title: '', store: '', price: '', originalPrice: '', discount: '', image: '', images: [], videos: [], link: '', affiliateOverrideLink: '', affiliateLink: '', category: '', description: '', extractionWarning: '', featured: false, isExpired: false
  });

  const handleAddDeal = async (e, directData = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const token = 'anonymous'; // Auth system removed
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
          'auth-token': token
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newDeal = normalizeDealForUi(await response.json());
        // Notify other components (like Navbar) about the new deal
        window.dispatchEvent(new CustomEvent('newDealAdded', { detail: newDeal }));
        
        // Add new deal to top of list
        setDeals(prev => [newDeal, ...prev.filter(d => (d._id || d.id) !== (newDeal._id || newDeal.id))]);
        showToast('Deal published successfully!', 'success');
        setIsAddDealOpen(false);
        // Reset form
        setDealForm({ title: '', store: '', price: '', originalPrice: '', discount: '', image: '', images: [], videos: [], link: '', affiliateOverrideLink: '', affiliateLink: '', category: '', description: '', extractionWarning: '', featured: false, isExpired: false });
        return true;
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to publish deal', 'error');
        return false;
      }
    } catch (err) {
      console.error("Error adding deal:", err);
      showToast('Connection error', 'error');
      return false;
    }
  };

  const publicDeals = (deals || []).filter(deal =>
    deal
    && Boolean(deal.title)
    && Boolean(deal.productUrl || deal.link || deal._id || deal.id)
  );

  const filteredDeals = publicDeals.filter(deal =>
    deal && (
      (deal.title && deal.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((deal.store || deal.storeName) && String(deal.store || deal.storeName).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.category && deal.category.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

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

  const toggleWishlist = (product) => {
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
  };

  const clearWishlist = () => {
    setWishlist([]);
    showToast('Wishlist cleared', 'info');
  };



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

  const sharedProps = {
    user,
    onAddDealClick: () => setIsAddDealOpen(true),
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
    dealsLoading: dealsState.loading,
    dealsError: dealsState.error
  };

  return (
    <>
      <ScrollToTop />
      <div id="main-app-container" className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home {...sharedProps} deals={filteredDeals} onSearch={setSearchQuery} />} />
          <Route path="/home" element={<Home {...sharedProps} deals={filteredDeals} onSearch={setSearchQuery} />} />

          {/* Dedicated Admin Panel Routes - Protected */}
          {/* Admin Panel made accessible without login */}
          <Route path="/admin/*" element={<AdminPanel {...sharedProps} deals={deals} setDeals={setDeals} />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          <Route path="/deals" element={<Deals {...sharedProps} deals={filteredDeals} onSearch={setSearchQuery} />} />
          <Route path="/wishlist" element={<Wishlist {...sharedProps} wishlist={wishlist} wishlistCount={wishlist.length} />} />
          <Route path="/blog" element={<Blog {...sharedProps} />} />
          <Route path="/blog/:slug" element={<BlogPost {...sharedProps} />} />
          <Route path="/coupons" element={<Coupons {...sharedProps} />} />
          <Route path="/coupons/:storeSlug" element={<CouponStore {...sharedProps} deals={publicDeals} />} />
          <Route path="/stores" element={<Stores {...sharedProps} deals={publicDeals} />} />
          <Route path="/product/:id" element={<ProductDetails {...sharedProps} deals={publicDeals} />} />

          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
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
