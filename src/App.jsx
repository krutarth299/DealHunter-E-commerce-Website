import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
const Home = React.lazy(() => import('./pages/Home'));
const Deals = React.lazy(() => import('./pages/Deals'));
const Stores = React.lazy(() => import('./pages/Stores'));
const ProductDetails = React.lazy(() => import('./pages/ProductDetails'));
const Wishlist = React.lazy(() => import('./pages/Wishlist'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const Blog = React.lazy(() => import('./pages/Blog'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
import { INITIAL_DEALS } from './data/initialDeals';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/authContextDefinition';
import ScrollToTop from './components/ScrollToTop';
import { motion } from 'framer-motion';
import { Flame, CheckCircle2, Info, AlertCircle, X, Loader2 } from 'lucide-react';
import { WishlistAnimationProvider } from './context/WishlistAnimationContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import Modal from './components/Modal';

const API_BASE_URL = 'http://localhost:5000/api';

function SeoServerData({ deals }) {
  const location = useLocation();
  const dealMatch = location.pathname.match(/^\/product\/([a-zA-Z0-9_-]+)/);

  let dealsToRender = deals;
  if (dealMatch) {
    const matchedDeal = deals.find(d => (d._id || d.id) === dealMatch[1]);
    if (matchedDeal) {
      dealsToRender = [matchedDeal];
    }
  }

  if (!dealsToRender || dealsToRender.length === 0) return null;

  return (
    <div id="seo-server-data" style={{ display: 'none', visibility: 'hidden', height: 0, overflow: 'hidden' }} aria-hidden="true">
      {dealsToRender.map(deal => (
        <article className="seo-deal-item" data-id={deal._id || deal.id} key={deal._id || deal.id}>
          <h2>{deal.title}</h2>
          <p>Store: {deal.store}</p>
          <p>Price: {deal.price} <del>{deal.originalPrice}</del></p>
          <p>Discount: {deal.discount}</p>
          <p>Category: {deal.category}</p>
          <img src={deal.image} alt={deal.title} />
        </article>
      ))}
    </div>
  );
}

function AppContent() {
  const { user, logout, loading, apiBase } = useContext(AuthContext);
  const [deals, setDeals] = useState(INITIAL_DEALS);
  const [searchQuery, setSearchQuery] = useState('');

  // Global Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

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

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  // Global 2D Spatial Arrow Key Navigation - Optimized
  // Removed heavy spatial navigation for performance optimization

  // Sync Deals from Server
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch(`${apiBase.replace('/user', '')}/deals`);
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        setDeals(data.length > 0 ? data : INITIAL_DEALS);
      } catch (err) {
        console.error("Failed to fetch deals:", err);
        setDeals(INITIAL_DEALS);
      }
    };
    if (apiBase) fetchDeals();
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

  const filteredDeals = deals.filter(deal =>
    (deal.title && deal.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (deal.store && deal.store.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (deal.category && deal.category.toLowerCase().includes(searchQuery.toLowerCase()))
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



  const location = useLocation();
  const isBot = location.search.includes('seo=true');

  // Global Loading Spinner removed or simplified
  if (loading && !isBot) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
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
    apiBase
  };

  return (
    <>
      <ScrollToTop />
      <React.Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" strokeWidth={3} />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Orbit Loading...</span>
            </div>
        </div>
      }>
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
          <Route path="/login" element={<Login {...sharedProps} />} />
          <Route path="/signup" element={<Signup {...sharedProps} />} />

          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </React.Suspense>

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
      <SeoServerData deals={deals} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <WishlistAnimationProvider>
        <RecentlyViewedProvider>
          <Router>
            <AppContent />
          </Router>
        </RecentlyViewedProvider>
      </WishlistAnimationProvider>
    </AuthProvider>
  );
}

export default App;
