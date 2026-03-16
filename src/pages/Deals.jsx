/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/static-components */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DealsGrid from '../components/DealsGrid';
import Modal from '../components/Modal';
import { 
    Filter, X, SlidersHorizontal, ShoppingBag, TrendingDown, Zap, ShieldCheck, ArrowRight,
    Clock, Search, Tag, Layers, Package, ChevronRight 
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_MAP, FEATURED_CATEGORIES, getCategoryStyle, normalizeCategory } from '../utils/categoryConstants';

// Shared category styles are now imported from ../utils/categoryConstants

const DEFAULT_CAT_ICON = Package;

const PRICE_RANGES = [
    { label: 'All Prices', min: 0, max: Infinity },
    { label: 'Under ₹1,000', min: 0, max: 1000 },
    { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
    { label: '₹5,000 – ₹20,000', min: 5000, max: 20000 },
    { label: 'Above ₹20,000', min: 20000, max: Infinity },
];

const SORT_OPTIONS = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Biggest Discount', value: 'discount' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
];

const Deals = ({ deals, user, onSearch, wishlist, toggleWishlist, isAddDealOpen, setIsAddDealOpen, handleAddDeal, dealForm, setDealForm, showToast, apiBase }) => {
    const [searchParams] = useSearchParams();
    const [categories, setCategories] = useState(FEATURED_CATEGORIES);
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
    const [selectedStore, setSelectedStore] = useState(searchParams.get('store') || 'All');
    const [priceRange, setPriceRange] = useState(PRICE_RANGES[0]);
    const [sortBy, setSortBy] = useState('newest');
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const feedRef = useRef(null);

    const scrollToFeed = useCallback(() => {
        if (feedRef.current) {
            const yOffset = -100; // Account for sticky navbar
            const y = feedRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        // Initial scroll on mount or path change
        const timer = setTimeout(scrollToFeed, 100);
        return () => clearTimeout(timer);
    }, [scrollToFeed]);

    useEffect(() => {
        const cat = searchParams.get('category');
        const store = searchParams.get('store');
        setSelectedCategory(cat || 'All');
        setSelectedStore(store || 'All');
        // Scroll when filters change
        scrollToFeed();
    }, [searchParams, scrollToFeed]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const baseUrl = apiBase ? apiBase.replace('/user', '') : 'http://localhost:5000/api';
                const r = await fetch(`${baseUrl}/deals/categories`);
                if (r.ok) {
                    const data = await r.json();
                    if (data && data.length > 0) {
                        const normalized = data.map(c => normalizeCategory(c)).filter(c => c && c.trim() !== '');
                        // Merge featured and normalized fetched categories
                        const sortedMerged = [...new Set([...FEATURED_CATEGORIES, ...normalized])];
                        setCategories(sortedMerged);
                    }
                }
            } catch (err) {
                console.error("Deals Categories fetch error:", err);
            }
        };
        fetchCategories();
    }, [apiBase]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsMobileFilterOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const getFilteredDeals = () => {
        let filtered = Array.isArray(deals) ? [...deals.filter(Boolean)] : [];
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(d => {
                const dealCat = normalizeCategory(d.category)?.toLowerCase();
                const selectedCat = selectedCategory.toLowerCase();
                return dealCat === selectedCat || d.category?.toLowerCase().includes(selectedCat);
            });
        }
        if (selectedStore !== 'All') {
            filtered = filtered.filter(d => d.store?.toLowerCase() === selectedStore.toLowerCase());
        }
        if (searchQuery) {
            filtered = filtered.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        filtered = filtered.filter(d => {
            const price = typeof d.price === 'number' ? d.price : Number(String(d.price).replace(/[^0-9.]/g, ''));
            return price >= priceRange.min && price <= priceRange.max;
        });

        filtered.sort((a, b) => {
            const getPrice = (p) => typeof p === 'number' ? p : Number(String(p || 0).replace(/[^0-9.]/g, ''));
            const getDiscount = (d) => {
                if (!d) return 0;
                const match = String(d).match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };

            if (sortBy === 'price_asc') {
                return getPrice(a.price) - getPrice(b.price);
            }
            if (sortBy === 'price_desc') {
                return getPrice(b.price) - getPrice(a.price);
            }
            if (sortBy === 'discount') {
                return getDiscount(b.discount) - getDiscount(a.discount);
            }
            if (sortBy === 'newest') {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                if (dateA !== dateB) return dateB - dateA;
                return 0;
            }
            return 0;
        });

        return filtered;
    };

    const filteredDeals = getFilteredDeals();

    const FilterContent = () => (
        <div className="space-y-12">
            {/* Categories */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-[1000] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" /> Categories
                    </h3>
                    <span className="text-[10px] font-black text-slate-300 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                        {categories.length + 1}
                    </span>
                </div>
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={() => { setSelectedCategory('All'); setIsMobileFilterOpen(false); }}
                        className={`group flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-black transition-all text-left border relative overflow-hidden
                            ${selectedCategory === 'All'
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20'
                                : 'bg-white text-slate-500 border-slate-100 hover:border-orange-200 hover:text-orange-600 hover:shadow-lg hover:shadow-orange-500/5'
                            }`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${selectedCategory === 'All' ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-orange-50 group-hover:text-orange-600'}`}>
                            <ShoppingBag size={18} strokeWidth={2.5} />
                        </div>
                        <span className="flex-1 uppercase tracking-wider">Infinity Feed</span>
                        {selectedCategory === 'All' && <motion.div layoutId="filter-active" className="absolute right-4 w-1.5 h-4 bg-orange-500 rounded-full" />}
                    </button>

                    {categories.map(catName => {
                        const style = getCategoryStyle(catName);
                        const Icon = style.icon;
                        const isActive = selectedCategory === catName;
                        return (
                            <button
                                key={catName}
                                onClick={() => { setSelectedCategory(catName); setIsMobileFilterOpen(false); }}
                                className={`group flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-black transition-all text-left border relative overflow-hidden
                                    ${isActive
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20'
                                        : 'bg-white text-slate-500 border-slate-100 hover:border-orange-200 hover:text-orange-600 hover:shadow-lg hover:shadow-orange-500/5'
                                    }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-white/10' : `${style.bg} ${style.icon_color} group-hover:scale-110 shadow-sm`}`}>
                                    <Icon size={18} strokeWidth={2.5} />
                                </div>
                                <span className="flex-1 uppercase tracking-wider truncate">{catName}</span>
                                {isActive && <motion.div layoutId="filter-active" className="absolute right-4 w-1.5 h-4 bg-orange-500 rounded-full" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Price */}
            <div className="space-y-8">
                <h3 className="text-[11px] font-[1000] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" /> Smart Pricing
                </h3>
                <div className="flex flex-col gap-2.5">
                    {PRICE_RANGES.map(range => (
                        <button
                            key={range.label}
                            onClick={() => { setPriceRange(range); setIsMobileFilterOpen(false); }}
                            className={`group px-6 py-4 rounded-2xl text-[11px] font-black transition-all text-left border uppercase tracking-widest relative overflow-hidden
                                ${priceRange.label === range.label
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20'
                                    : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200 hover:text-blue-600 hover:shadow-lg'
                                }`}
                        >
                            {range.label}
                            {priceRange.label === range.label && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900">
            <SEO title="Explore Deals | DealOrbit" description="Browse hundreds of verified deals across electronics, fashion, gaming and more." />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist.length} wishlist={wishlist} />
            <Modal isOpen={isAddDealOpen} onClose={() => setIsAddDealOpen(false)} title="Add a Deal" onSubmit={handleAddDeal} dealForm={dealForm} setDealForm={setDealForm} />

            {/* ─── Page Header ─── */}
            <div className="bg-white border-b border-slate-100 relative overflow-hidden py-10 md:py-14">
                {/* Mesh Gradients */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-50/60 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-50/60 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />
                
                <div className="w-full mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
                        <div className="space-y-6 max-w-2xl">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="inline-flex items-center gap-2.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl border border-emerald-100"
                            >
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 mr-1"></span>
                                Live Pulse Intelligence
                            </motion.div>
                            <h1 className="text-5xl md:text-7xl font-[1000] text-slate-900 tracking-tight leading-[0.9]">
                                {selectedCategory !== 'All' ? (
                                    <>
                                        Best <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">{selectedCategory}</span>
                                        <span className="block text-slate-400 mt-2">Collections</span>
                                    </>
                                ) : selectedStore !== 'All' ? (
                                    <>
                                        Curated <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">{selectedStore}</span> 
                                        <span className="block text-slate-400 mt-2">Intelligence</span>
                                    </>
                                ) : (
                                    <>
                                        Elite <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Deals</span>
                                        <span className="block text-slate-400 mt-2">Command Center</span>
                                    </>
                                )}
                            </h1>
                            <p className="text-slate-500 text-lg md:text-xl font-medium tracking-tight">
                                {selectedCategory !== 'All' 
                                    ? `Discover the latest price drops and premium offers in ${selectedCategory}.`
                                    : `Analyzing ${filteredDeals.length} premium offers across India's top retailers.`
                                }
                            </p>
                        </div>
                        
                        {/* Search bar */}
                        <div className="relative w-full md:w-[480px] group">
                            <div className="absolute inset-0 bg-orange-500/5 blur-3xl rounded-[2.5rem] opacity-0 group-focus-within:opacity-100 transition-opacity" />
                            <div className="relative flex items-center h-20 bg-white border-2 border-slate-100 rounded-3xl group-focus-within:border-orange-400/50 group-focus-within:shadow-[0_20px_50px_-10px_rgba(249,115,22,0.1)] transition-all overflow-hidden p-2">
                                <div className="w-16 h-full flex items-center justify-center text-slate-400 group-focus-within:text-orange-500">
                                    <Search size={24} strokeWidth={2.5} />
                                </div>
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search global intelligence..."
                                    className="flex-1 bg-transparent border-none text-base font-bold text-slate-900 outline-none placeholder:text-slate-300"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors mr-1">
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Store Pill Strip - Elevated Design */}
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pt-6 pb-4 mt-2 scroll-smooth">
                        <div className="flex items-center gap-2 mr-2 py-1.5 px-3 bg-white/50 backdrop-blur-md rounded-xl border border-slate-200 shrink-0 shadow-sm">
                            <Zap size={14} className="text-orange-500" fill="currentColor" />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Certified</span>
                        </div>
                        
                        <button
                            onClick={() => setSelectedStore('All')}
                            className={`h-11 px-6 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border uppercase tracking-wider flex items-center justify-center
                                ${selectedStore === 'All'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-500 shadow-sm'
                                }`}
                        >
                            Global
                        </button>
                        {[...new Set(deals.map(d => d.store).filter(Boolean))].map(store => {
                            const isActive = selectedStore === store;
                            return (
                                <button
                                    key={store}
                                    onClick={() => setSelectedStore(store)}
                                    className={`group h-11 px-4 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border flex items-center gap-3 uppercase tracking-wide
                                        ${isActive
                                            ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-lg shadow-orange-500/30'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-orange-400 hover:text-orange-500 shadow-sm'
                                        }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm transition-all group-hover:scale-110 ${isActive ? '' : 'border border-slate-100'}`}>
                                        <img 
                                            src={`https://www.google.com/s2/favicons?domain=${store.toLowerCase().replace(/\s/g, '')}.com&sz=64`} 
                                            className="w-full h-full object-contain"
                                            alt=""
                                            onError={e => { e.target.parentElement.innerHTML = `<span class="text-[9px] font-black text-orange-500">${store[0]}</span>`; }}
                                        />
                                    </div>
                                    <span className="hidden sm:inline">{store}</span>
                                    {isActive && <span className="sm:hidden">{store}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ─── Main Content ─── */}
            <div className="flex-grow w-full mx-auto px-4 sm:px-8 lg:px-12 py-10 pb-24 lg:pb-10">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-64 shrink-0">
                        <div className="sticky top-28 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                            <h2 className="text-base font-black text-slate-900 mb-8 flex items-center gap-2">
                                <SlidersHorizontal size={18} className="text-orange-500" /> Filters
                            </h2>
                            <FilterContent />
                        </div>
                    </aside>

                    {/* Feed */}
                    <div ref={feedRef} className="flex-1 min-w-0">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-10 gap-6 flex-wrap">
                            <div className="flex items-center gap-4 text-sm font-bold text-slate-400 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                    <span className="text-slate-900">Live Updates</span>
                                </div>
                                <div className="w-1 h-4 bg-slate-100 rounded-full mx-1" />
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-slate-300" />
                                    <span>Just updated</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                <button
                                    onClick={() => setIsMobileFilterOpen(true)}
                                    className="lg:hidden flex items-center gap-3 h-14 px-8 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm font-black shadow-sm active:scale-95 transition-all"
                                >
                                    <SlidersHorizontal size={18} className="text-orange-500" /> Filters
                                </button>
                                <div className="relative h-14 bg-white border border-slate-200 rounded-2xl shadow-sm px-4 flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sort By</span>
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        className="bg-transparent border-none text-sm font-black text-slate-900 outline-none cursor-pointer pr-2"
                                    >
                                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <DealsGrid deals={filteredDeals} wishlist={wishlist} toggleWishlist={toggleWishlist} />

                        {filteredDeals.length === 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-32 flex flex-col items-center text-center px-6"
                            >
                                <div className="w-32 h-32 rounded-[3.5rem] bg-slate-50 flex items-center justify-center mb-10 relative">
                                    <div className="absolute inset-0 bg-orange-500/5 blur-3xl rounded-full" />
                                    <Search size={56} className="text-slate-200" />
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-xl flex items-center justify-center text-2xl">
                                        🤔
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">No deals found matching your criteria</h3>
                                <p className="text-slate-500 font-medium max-w-sm leading-relaxed mb-12">
                                    Try adjusting your filters or search keywords. You can also reset everything to see all live deals.
                                </p>
                                <button 
                                    onClick={() => { setSelectedCategory('All'); setSelectedStore('All'); setSearchQuery(''); setPriceRange(PRICE_RANGES[0]); }}
                                    className="h-16 px-12 rounded-[2rem] bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-all shadow-2xl active:scale-95"
                                >
                                    Reset All Search Filters
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
            <AnimatePresence>
                {isMobileFilterOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} className="relative w-80 max-w-full bg-white h-full flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <h3 className="text-xl font-black text-slate-900">Filters</h3>
                                <button onClick={() => setIsMobileFilterOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6"><FilterContent /></div>
                            <div className="p-6 border-t border-slate-100">
                                <button onClick={() => setIsMobileFilterOpen(false)} className="w-full h-14 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
                                    Apply ({filteredDeals.length} results)
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default Deals;
