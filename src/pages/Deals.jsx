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

    useEffect(() => {
        const cat = searchParams.get('category');
        const store = searchParams.get('store');
        if (cat) setSelectedCategory(cat);
        if (store) setSelectedStore(store);
    }, [searchParams]);

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
        <div className="space-y-10">
            {/* Categories */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={14} /> Category
                </h3>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => { setSelectedCategory('All'); setIsMobileFilterOpen(false); }}
                        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all text-left border
                ${selectedCategory === 'All'
                                ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                : 'bg-slate-50 text-slate-600 border-transparent hover:bg-orange-50 hover:text-orange-600'
                            }`}
                    >
                        <Layers size={16} strokeWidth={2} />
                        All
                    </button>
                    {categories.map(catName => {
                        const style = getCategoryStyle(catName);
                        const Icon = style.icon;
                        return (
                            <button
                                key={catName}
                                onClick={() => { setSelectedCategory(catName); setIsMobileFilterOpen(false); }}
                                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all text-left border group
                ${selectedCategory === catName
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                        : 'bg-slate-50 text-slate-600 border-transparent hover:bg-orange-50 hover:text-orange-600'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedCategory === catName ? 'bg-white/20' : `${style.bg} ${style.icon_color} group-hover:bg-orange-100`}`}>
                                    <Icon size={14} strokeWidth={2.5} />
                                </div>
                                <span className="flex-1 truncate">{catName}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Price */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Tag size={14} /> Price Range
                </h3>
                <div className="flex flex-col gap-2">
                    {PRICE_RANGES.map(range => (
                        <button
                            key={range.label}
                            onClick={() => { setPriceRange(range); setIsMobileFilterOpen(false); }}
                            className={`px-5 py-3.5 rounded-2xl text-sm font-bold transition-all text-left border
                ${priceRange.label === range.label
                                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-50 text-slate-600 border-transparent hover:bg-blue-50 hover:text-blue-600'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900">
            <SEO title="Explore Deals | DealHunter" description="Browse hundreds of verified deals across electronics, fashion, gaming and more." />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist.length} wishlist={wishlist} />
            <Modal isOpen={isAddDealOpen} onClose={() => setIsAddDealOpen(false)} title="Add a Deal" onSubmit={handleAddDeal} dealForm={dealForm} setDealForm={setDealForm} />

            {/* ─── Page Header ─── */}
            <div className="bg-white border-b border-slate-100 pt-24 pb-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <p className="text-orange-500 text-xs font-black uppercase tracking-widest">Live Database</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4 flex-wrap">
                                {selectedStore !== 'All' ? `${selectedStore} Deals` : 'All Deals'}
                                <span className="text-2xl font-bold text-slate-300">({filteredDeals.length})</span>
                                {selectedStore !== 'All' && (
                                    <button
                                        onClick={() => setSelectedStore('All')}
                                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                                    >
                                        <X size={12} /> Clear Store
                                    </button>
                                )}
                            </h1>
                        </div>
                        {/* Search bar */}
                        <div className="relative w-full md:w-96">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search deals..."
                                className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Category Pill Strip */}
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-0 -mb-px">
                        <button
                            onClick={() => setSelectedCategory('All')}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 flex-shrink-0
                  ${selectedCategory === 'All'
                                    ? 'border-orange-500 text-orange-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <Layers size={16} strokeWidth={2} />
                            All
                        </button>
                        {categories.map(catName => {
                            const style = getCategoryStyle(catName);
                            const Icon = style.icon;
                            return (
                                <button
                                    key={catName}
                                    onClick={() => setSelectedCategory(catName)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-black whitespace-nowrap transition-all border-b-2 flex-shrink-0 group
                  ${selectedCategory === catName
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-slate-400 hover:text-slate-900'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${selectedCategory === catName ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                        <Icon size={12} strokeWidth={2.5} />
                                    </div>
                                    {catName}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ─── Main Content ─── */}
            <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-10 pb-24 lg:pb-10">
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
                    <div className="flex-1 min-w-0">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                            <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                                <Clock size={16} className="text-orange-500" />
                                Updated 2 mins ago
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                <button
                                    onClick={() => setIsMobileFilterOpen(true)}
                                    className="lg:hidden flex items-center gap-2 h-12 px-6 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm"
                                >
                                    <Filter size={16} /> Filters
                                </button>
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                    className="h-12 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 outline-none cursor-pointer shadow-sm"
                                >
                                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <DealsGrid deals={filteredDeals} wishlist={wishlist} toggleWishlist={toggleWishlist} />

                        {filteredDeals.length === 0 && (
                            <div className="py-40 text-center space-y-6">
                                <div className="text-6xl">🔍</div>
                                <h3 className="text-2xl font-black text-slate-900">No deals found</h3>
                                <p className="text-slate-500 font-medium">Try adjusting your filters or search query.</p>
                                <button onClick={() => { setSelectedCategory('All'); setSelectedStore('All'); setSearchQuery(''); setPriceRange(PRICE_RANGES[0]); }}
                                    className="h-12 px-8 rounded-2xl bg-orange-500 text-white font-black text-sm hover:bg-orange-600 transition-colors">
                                    Clear All Filters
                                </button>
                            </div>
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
