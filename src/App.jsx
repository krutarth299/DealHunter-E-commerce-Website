import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Deals from './pages/Deals';
import Stores from './pages/Stores';
import ProductDetails from './pages/ProductDetails';
import Wishlist from './pages/Wishlist';
import AdminPanel from './pages/AdminPanel';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import { INITIAL_DEALS } from './data/initialDeals';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import { motion } from 'framer-motion';
import { Flame, CheckCircle2, Info, AlertCircle, X, Loader2 } from 'lucide-react';
import { WishlistAnimationProvider } from './context/WishlistAnimationContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import Modal from './components/Modal';
import { io } from 'socket.io-client';

// socket initialized inside useEffect to avoid SSR crashes
let socket;

const API_BASE_URL = 'http://127.0.0.1:5000/api';


export function AppContent({ preloadedDeals = null, preloadedCategories = null }) {
  const { user, logout, loading, apiBase } = useContext(AuthContext);
  
  const [deals, setDeals] = useState(() => {
    // 1. High-priority Server Injected Prop (Hydration)
    if (preloadedDeals && Array.isArray(preloadedDeals) && preloadedDeals.length > 0) return preloadedDeals;
    // 2. High-priority Window Global (Dynamic Hydration)
    if (typeof window !== 'undefined' && window.__INITIAL_DATA__ && Array.isArray(window.__INITIAL_DATA__)) return window.__INITIAL_DATA__;
    
    // 3. Medium-priority Cache
    const cached = typeof window !== 'undefined' ? localStorage.getItem('cached_deals') : null;
    if (cached) {
        try { return JSON.parse(cached); } catch(e) { /* corrupted */ }
    }
    // 4. Fallback Static Data
    return INITIAL_DEALS;
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
    const fetchDeals = async () => {
      try {
        const baseUrl = apiBase.replace('/user', '');
        const [dealsRes, catsRes] = await Promise.all([
            fetch(`${baseUrl}/deals`),
            fetch(`${baseUrl}/deals/categories`)
        ]);
        
        if (dealsRes.ok) {
            const d = await dealsRes.json();
            if (d.length > 0) {
                setDeals(d);
                localStorage.setItem('cached_deals', JSON.stringify(d));
            }
        }
        if (catsRes.ok) {
            const c = await catsRes.json();
            if (c.length > 0) setCategories(c);
        }
      } catch (err) {
        console.error("Failed to sync app data:", err);
      }
    };

    if (apiBase) fetchDeals();

    // Socket.io Real-time Listeners (Client-side ONLY)
    if (typeof window !== 'undefined' && !socket) {
        socket = io('http://127.0.0.1:5000');
    }

    if (socket) {
        socket.on('newDeal', (newDeal) => {
          setDeals(prev => {
            const next = [newDeal, ...prev.filter(d => (d._id || d.id) !== (newDeal._id || newDeal.id))];
            localStorage.setItem('cached_deals', JSON.stringify(next));
            return next;
          });
          showToast('New deal just went live! 🔥', 'info');
        });

        socket.on('updateDeal', (updatedDeal) => {
          setDeals(prev => {
            const next = prev.map(d => (d._id || d.id) === (updatedDeal._id || updatedDeal.id) ? updatedDeal : d);
            localStorage.setItem('cached_deals', JSON.stringify(next));
            return next;
          });
        });

        socket.on('deleteDeal', (dealId) => {
          setDeals(prev => {
            const next = prev.filter(d => (d._id || d.id) !== dealId);
            localStorage.setItem('cached_deals', JSON.stringify(next));
            return next;
          });
        });

        return () => {
          socket.off('newDeal');
          socket.off('updateDeal');
          socket.off('deleteDeal');
        };
    }
  }, [apiBase]);

  // Add Deal Form State (Shared)
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState({
    title: '', store: '', price: '', originalPrice: '', discount: '', image: '', images: [], link: '', category: '', featured: false
  });

  const handleAddDeal = async (e, directData = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const token = 'anonymous'; // Auth system removed
    const dealsApi = apiBase.replace('/user', '') + '/deals';

    const payload = directData || {
      ...dealForm,
      rating: (Math.random() * 2 + 3).toFixed(1)
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
        const newDeal = await response.json();
        // Notify other components (like Navbar) about the new deal
        window.dispatchEvent(new CustomEvent('newDealAdded', { detail: newDeal }));
        
        // Add new deal to top of list
        setDeals(prev => [newDeal, ...prev]);
        showToast('Deal published successfully!', 'success');
        setIsAddDealOpen(false);
        // Reset form
        setDealForm({ title: '', store: '', price: '', originalPrice: '', discount: '', image: '', images: [], link: '', category: '', description: '', featured: false });
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

  const filteredDeals = (deals || []).filter(deal =>
    deal && (
      (deal.title && deal.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.store && deal.store.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.category && deal.category.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const [wishlist, setWishlist] = useState(() => {
    const storedWishlist = localStorage.getItem('wishlist');
    return storedWishlist ? JSON.parse(storedWishlist) : [];
  });


  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
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
    setCategories
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
          <Route path="/stores" element={<Stores {...sharedProps} />} />
          <Route path="/product/:id" element={<ProductDetails {...sharedProps} deals={deals} />} />

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
