/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/static-components */
import React, { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DealsGrid from '../components/DealsGrid';
import { 
    Filter, X, SlidersHorizontal, ShoppingBag, TrendingDown, Zap, ShieldCheck, ArrowRight,
    Clock, Search, Tag, Layers, Package, ChevronRight, Star, ExternalLink, Flame, BadgePercent
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_MAP, FEATURED_CATEGORIES, getCategoryStyle, normalizeCategory } from '../utils/categoryConstants';
import { formatPriceDisplay, parsePriceNumber } from '../utils/dealUi';
import { getCardTitle } from '../utils/productTitles';
import { getMainProductImage, NO_PRODUCT_IMAGE } from '../utils/imageOptimizer';
import { getProductPath } from '../utils/productUrls';

// Shared category styles are now imported from ../utils/categoryConstants

const DEFAULT_CAT_ICON = Package;

const PRICE_RANGES = [
    { label: 'All Prices', min: 0, max: Infinity },
    { label: 'Under ₹1,000', min: 0, max: 1000 },
    { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
    { label: '₹5,000 – ₹20,000', min: 5000, max: 20000 },
    { label: 'Above ₹20,000', min: 20000, max: Infinity },
];

const DISCOUNT_FILTERS = [
    { label: 'All Discounts', value: 0 },
    { label: '20%+ OFF', value: 20 },
    { label: '50%+ OFF', value: 50 },
    { label: '70%+ OFF', value: 70 },
];

const SORT_OPTIONS = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Biggest Discount', value: 'discount' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
];

const parseDealPrice = (deal = {}) => {
    const pricing = deal.pricing || {};
    const candidates = [
        pricing.dealPrice,
        pricing.currentPrice,
        pricing.salePrice,
        deal.dealPrice,
        deal.currentPrice,
        deal.salePrice,
        deal.price
    ];

    for (const candidate of candidates) {
        const parsed = parsePriceNumber(candidate);
        if (parsed !== null && parsed > 0) return parsed;
    }

    return 0;
};

const parseDealMrp = (deal = {}) => {
    const pricing = deal.pricing || {};
    return [
        pricing.mrp,
        pricing.originalPrice,
        pricing.listPrice,
        deal.mrp,
        deal.originalPrice,
        deal.listPrice
    ]
        .map((candidate) => parsePriceNumber(candidate))
        .filter((price) => price !== null && price > 0)
        .sort((a, b) => b - a)[0] || 0;
};

const parseDealDiscount = (deal = {}) => {
    const dealPrice = parseDealPrice(deal);
    const mrp = parseDealMrp(deal);

    if (dealPrice > 0 && mrp > dealPrice) {
        return Math.round(((mrp - dealPrice) / mrp) * 100);
    }

    const parsed = Number(String(deal.discountPercent || deal.discount || '').match(/\d+/)?.[0] || 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const shouldShowDealMrp = (deal = {}, dealPrice = 0, mrp = 0) => {
    const pricing = deal.pricing || {};
    const hasExplicitMrp = [
        pricing.mrp,
        pricing.originalPrice,
        pricing.listPrice,
        deal.mrp,
        deal.originalPrice,
        deal.listPrice
    ].some((candidate) => (parsePriceNumber(candidate) || 0) > 0);
    return Boolean(mrp > 0 && dealPrice > 0 && (mrp > dealPrice || (mrp === dealPrice && hasExplicitMrp)));
};

const getDealTimestamp = (deal = {}) => {
    const time = new Date(deal.createdAt || deal.updatedAt || deal.publishedAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
};

const getDealIdentity = (deal = {}) => String(deal._id || deal.id || deal.productUrl || deal.link || '');

const getDealPath = (deal = {}) => getProductPath(deal);

const getUpdatedLabel = (deal = {}) => {
    const time = new Date(deal.updatedAt || deal.createdAt || deal.viewedAt || 0).getTime();
    if (!Number.isFinite(time) || time <= 0) return 'Price verified';
    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (minutes < 2) return 'Updated now';
    if (minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `Updated ${hours}h ago`;
    return `Updated ${Math.round(hours / 24)}d ago`;
};

const getTopDeals = (deals = [], limit = 3) => (
    deals
        .filter((deal) => deal && (deal.title || deal.displayTitle) && parseDealPrice(deal) > 0)
        .sort((a, b) => {
            const scoreA = parseDealDiscount(a) * 4 + (a.featured ? 120 : 0) + (a.isTrending ? 80 : 0) + Math.min(parseDealPrice(a) / 1000, 30);
            const scoreB = parseDealDiscount(b) * 4 + (b.featured ? 120 : 0) + (b.isTrending ? 80 : 0) + Math.min(parseDealPrice(b) / 1000, 30);
            return scoreB - scoreA;
        })
        .slice(0, limit)
);

const SpotlightDealCard = ({ deal, rank = 0 }) => {
    const dealPrice = parseDealPrice(deal);
    const mrp = parseDealMrp(deal);
    const discount = parseDealDiscount(deal);
    const store = deal.store || deal.storeName || 'Online Store';
    const title = deal.cardTitle || getCardTitle(deal.displayTitle || deal.title);
    const badge = rank === 0 ? 'Featured Deal' : discount >= 50 ? 'Best Discount' : 'Trending';

    return (
        <Link
            to={getDealPath(deal)}
            className="group relative z-0 flex h-full min-h-[34rem] flex-col overflow-visible rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.32)] no-underline transition-all hover:z-20 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_32px_70px_-42px_rgba(15,23,42,0.75)] md:p-5"
        >
            <div className="absolute left-5 top-5 z-20 rounded-2xl bg-slate-950 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-xl">
                {badge}
            </div>
            {discount > 0 && (
                <div className="absolute right-5 top-5 z-20 rounded-2xl bg-[#FF6A00] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-orange-500/25">
                    {discount}% OFF
                </div>
            )}

            <div className="mb-5 flex h-52 shrink-0 items-center justify-center rounded-[1.7rem] bg-slate-50 p-6">
                <img
                    src={getMainProductImage(deal)}
                    alt={deal.title || title}
                    className="h-full w-full object-contain drop-shadow-lg transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = NO_PRODUCT_IMAGE;
                    }}
                />
            </div>

            <div className="flex flex-1 flex-col">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700">
                        <ShieldCheck size={12} className="shrink-0" />
                        <span className="truncate">{store}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400">{getUpdatedLabel(deal)}</span>
                </div>

                <h3 className="mb-5 line-clamp-2 min-h-[3rem] overflow-hidden text-lg font-black leading-snug tracking-tight text-slate-950 group-hover:text-[#FF6A00]">
                    {title}
                </h3>

                <div className="mt-auto">
                    <div className="mb-4 flex min-h-[3.65rem] flex-wrap items-end gap-2">
                        <span className="text-3xl font-black leading-none tracking-tighter text-slate-950">{formatPriceDisplay(dealPrice)}</span>
                        {shouldShowDealMrp(deal, dealPrice, mrp) && (
                            <span className="text-sm font-bold text-slate-400 line-through">{formatPriceDisplay(mrp)}</span>
                        )}
                    </div>
                    <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C42] px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all group-hover:brightness-95 group-active:scale-95">
                        Open Details
                        <ChevronRight size={15} strokeWidth={3} />
                    </span>
                </div>
            </div>
        </Link>
    );
};

const CompactTrendingCard = ({ deal }) => {
    const dealPrice = parseDealPrice(deal);
    const discount = parseDealDiscount(deal);
    const store = deal.store || deal.storeName || 'Online Store';
    const title = deal.cardTitle || getCardTitle(deal.displayTitle || deal.title);

    return (
        <Link
            to={getDealPath(deal)}
            className="group flex min-w-[18rem] items-center gap-4 rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_22px_48px_-34px_rgba(15,23,42,0.9)] sm:min-w-[22rem]"
        >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.5rem] bg-slate-50 p-3">
                <img
                    src={getMainProductImage(deal)}
                    alt={deal.title || title}
                    loading="lazy"
                    className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110"
                    onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = NO_PRODUCT_IMAGE;
                    }}
                />
                {discount > 0 && (
                    <span className="absolute left-2 top-2 rounded-lg bg-[#FF6A00] px-2 py-1 text-[8px] font-black text-white shadow-lg">
                        {discount}%
                    </span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <Flame size={11} className="text-[#22C55E]" fill="currentColor" />
                    <span className="truncate">{store}</span>
                </div>
                <h3 className="line-clamp-2 min-h-[2.35rem] text-sm font-black leading-snug tracking-tight text-slate-950 group-hover:text-[#FF6A00]">
                    {title}
                </h3>
                <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xl font-black tracking-tighter text-slate-950">{formatPriceDisplay(dealPrice)}</span>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition-colors group-hover:bg-[#FF6A00]">
                        <ChevronRight size={16} strokeWidth={3} />
                    </span>
                </div>
            </div>
        </Link>
    );
};

const TrendingDealsRail = ({ deals = [] }) => {
    if (deals.length < 3) return null;

    return (
        <section className="mb-12 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[#0B1220] p-5 text-white shadow-[0_32px_80px_-55px_rgba(2,6,23,1)] sm:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#FF6A00]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#FF6A00] ring-1 ring-[#FF6A00]/20">
                        <Flame size={13} fill="currentColor" />
                        Trending Row
                    </p>
                    <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Deals shoppers are opening now</h2>
                </div>
                <p className="max-w-xs text-sm font-semibold leading-relaxed text-slate-300">
                    Quick-scan high-confidence offers with strong price and discount signals.
                </p>
            </div>

            <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 no-scrollbar sm:-mx-7 sm:px-7">
                {deals.map((deal) => (
                    <CompactTrendingCard key={getDealIdentity(deal)} deal={deal} />
                ))}
            </div>
        </section>
    );
};

const InlineDealHighlights = ({ deals = [] }) => {
    if (deals.length === 0) return null;

    return (
        <section className="rounded-[2.75rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-slate-50 p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#FF6A00]">
                        <BadgePercent size={14} />
                        Marketplace Highlight
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">More stand-out deals</h2>
                </div>
                <p className="max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
                    A quick break in the grid so the best remaining offers do not get buried.
                </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
                {deals.map((deal, index) => (
                    <SpotlightDealCard key={getDealIdentity(deal) || index} deal={deal} rank={index + 1} />
                ))}
            </div>
        </section>
    );
};

const Deals = ({ deals, user, onSearch, wishlist, toggleWishlist, categories: globalCategories, dealsLoading = false, dealsError = '' }) => {
    const [searchParams] = useSearchParams();
    
    const categories = React.useMemo(() => {
        const normalizedGlobal = (globalCategories || []).map(c => normalizeCategory(c)).filter(Boolean);
        return [...new Set([...FEATURED_CATEGORIES, ...normalizedGlobal])];
    }, [globalCategories]);

    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
    const [selectedStore, setSelectedStore] = useState(searchParams.get('store') || 'All');
    const [priceRange, setPriceRange] = useState(PRICE_RANGES[0]);
    const [sortBy, setSortBy] = useState('newest');
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [selectedDiscount, setSelectedDiscount] = useState(DISCOUNT_FILTERS[0]);
    const [customMaxPrice, setCustomMaxPrice] = useState(0);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const feedRef = useRef(null);
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const allDeals = useMemo(() => (Array.isArray(deals) ? deals.filter(Boolean) : []), [deals]);
    const liveStores = useMemo(() => [...new Set(allDeals.map(d => d.store || d.storeName).filter(Boolean))].sort(), [allDeals]);
    const priceSliderMax = useMemo(() => {
        const max = Math.max(...allDeals.map(parseDealPrice), 0);
        if (max <= 0) return 100000;
        return Math.max(1000, Math.ceil(max / 1000) * 1000);
    }, [allDeals]);
    const effectiveMaxPrice = customMaxPrice > 0 ? customMaxPrice : Infinity;

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
        const search = searchParams.get('search');
        setSelectedCategory(cat || 'All');
        setSelectedStore(store || 'All');
        setSearchQuery(search || '');
        // Scroll when filters change
        scrollToFeed();
    }, [searchParams, scrollToFeed]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsMobileFilterOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredDeals = useMemo(() => {
        let filtered = [...allDeals];
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(d => {
                const dealCat = normalizeCategory(d.category)?.toLowerCase();
                const selectedCat = selectedCategory.toLowerCase();
                return dealCat === selectedCat || d.category?.toLowerCase().includes(selectedCat);
            });
        }
        if (selectedStore !== 'All') {
            filtered = filtered.filter(d => (d.store || d.storeName)?.toLowerCase() === selectedStore.toLowerCase());
        }
        if (deferredSearchQuery) {
            const query = deferredSearchQuery.toLowerCase().trim();
            filtered = filtered.filter(d => {
                const haystack = [
                    d.title,
                    d.displayTitle,
                    d.cardTitle,
                    d.store,
                    d.storeName,
                    d.category
                ].filter(Boolean).join(' ').toLowerCase();
                return haystack.includes(query);
            });
        }
        filtered = filtered.filter(d => {
            const price = parseDealPrice(d);
            const maxPrice = Math.min(priceRange.max, effectiveMaxPrice);
            return price >= priceRange.min && price <= maxPrice;
        });

        if (selectedDiscount.value > 0) {
            filtered = filtered.filter(d => parseDealDiscount(d) >= selectedDiscount.value);
        }

        filtered.sort((a, b) => {
            if (sortBy === 'price_asc') {
                return parseDealPrice(a) - parseDealPrice(b);
            }
            if (sortBy === 'price_desc') {
                return parseDealPrice(b) - parseDealPrice(a);
            }
            if (sortBy === 'discount') {
                return parseDealDiscount(b) - parseDealDiscount(a);
            }
            if (sortBy === 'newest') {
                const dateA = getDealTimestamp(a);
                const dateB = getDealTimestamp(b);
                if (dateA !== dateB) return dateB - dateA;
                return 0;
            }
            return 0;
        });

        return filtered;
    }, [allDeals, deferredSearchQuery, effectiveMaxPrice, priceRange.max, priceRange.min, selectedCategory, selectedDiscount.value, selectedStore, sortBy]);
    const featuredDeals = useMemo(() => getTopDeals(filteredDeals, filteredDeals.length > 8 ? 3 : 0), [filteredDeals]);
    const featuredIdentitySet = useMemo(() => new Set(featuredDeals.map(getDealIdentity)), [featuredDeals]);
    const gridDeals = featuredDeals.length > 0
        ? filteredDeals.filter((deal) => !featuredIdentitySet.has(getDealIdentity(deal)))
        : filteredDeals;
    const trendingDeals = useMemo(() => getTopDeals(gridDeals, Math.min(6, gridDeals.length)), [gridDeals]);
    const trendingIdentitySet = useMemo(() => new Set(trendingDeals.map(getDealIdentity)), [trendingDeals]);
    const gridDealsPostTrending = gridDeals.filter(deal => !trendingIdentitySet.has(getDealIdentity(deal)));

    const gridSections = useMemo(() => {
        const firstPage = gridDealsPostTrending.slice(0, 12);
        const remaining = gridDealsPostTrending.slice(12);
        const inlineHighlights = remaining.length > 8 ? getTopDeals(remaining, 2) : [];
        const inlineHighlightIds = new Set(inlineHighlights.map(getDealIdentity));
        const finalGrid = inlineHighlights.length > 0
            ? remaining.filter((deal) => !inlineHighlightIds.has(getDealIdentity(deal)))
            : remaining;

        return {
            firstPage,
            inlineHighlights,
            finalGrid
        };
    }, [gridDealsPostTrending]);
    const searchSuggestions = useMemo(() => {
        const query = deferredSearchQuery.trim().toLowerCase();
        if (!query || query.length < 2) return [];

        const seen = new Set();
        return allDeals
            .map((deal) => ({
                id: getDealIdentity(deal),
                label: deal.cardTitle || getCardTitle(deal.displayTitle || deal.title || ''),
                store: deal.store || deal.storeName || 'Store',
                category: normalizeCategory(deal.category) || 'Deals',
                image: getMainProductImage(deal),
                price: parseDealPrice(deal)
            }))
            .filter((item) => {
                const key = `${item.label}::${item.store}`.toLowerCase();
                const matches = `${item.label} ${item.store} ${item.category}`.toLowerCase().includes(query);
                if (!matches || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 6);
    }, [allDeals, deferredSearchQuery]);
    const activeListingLabel = selectedCategory !== 'All'
        ? `${selectedCategory} Deals`
        : selectedStore !== 'All'
            ? `${selectedStore} Deals`
            : 'Latest Verified Deals';
    const activeListingDescription = selectedCategory !== 'All'
        ? `Compare verified ${selectedCategory.toLowerCase()} deals with live deal price, MRP, discount percentage and direct store links on DealSphere.`
        : selectedStore !== 'All'
            ? `Browse live ${selectedStore} deals, verified discounts, price drops and coupons with clean Buy Now links on DealSphere.`
            : 'Browse verified deals, coupons, live discounts and price drops across electronics, fashion, beauty, home, appliances and more.';
    const dealsCanonical = selectedCategory !== 'All'
        ? `/deals?category=${encodeURIComponent(selectedCategory)}`
        : selectedStore !== 'All'
            ? `/deals?store=${encodeURIComponent(selectedStore)}`
            : '/deals';

    useEffect(() => {
        console.info(`[DEALS_RENDER] page=deals count=${Array.isArray(filteredDeals) ? filteredDeals.length : 0} loading=${dealsLoading} error=${dealsError ? 'yes' : 'no'}`);
    }, [filteredDeals, dealsLoading, dealsError]);

    const FilterContent = () => (
        <div className="space-y-12">
            {/* Categories */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-[1000] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full" /> Categories
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
                                : 'bg-white text-slate-500 border-slate-200 hover:border-orange-200 hover:text-[#FF6A00] hover:shadow-lg hover:shadow-orange-500/5'
                            }`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${selectedCategory === 'All' ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-orange-50 group-hover:text-[#FF6A00]'}`}>
                            <ShoppingBag size={18} strokeWidth={2.5} />
                        </div>
                        <span className="flex-1 uppercase tracking-wider">Infinity Feed</span>
                        {selectedCategory === 'All' && <motion.div layoutId="filter-active" className="absolute right-4 w-1.5 h-4 bg-[#FF6A00] rounded-full" />}
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
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-orange-200 hover:text-[#FF6A00] hover:shadow-lg hover:shadow-orange-500/5'
                                    }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-white/10' : `${style.bg} ${style.icon_color} group-hover:scale-110 shadow-sm`}`}>
                                    <Icon size={18} strokeWidth={2.5} />
                                </div>
                                <span className="flex-1 uppercase tracking-wider truncate">{catName}</span>
                                {isActive && <motion.div layoutId="filter-active" className="absolute right-4 w-1.5 h-4 bg-[#FF6A00] rounded-full" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stores */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-[1000] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#22C55E] rounded-full" /> Stores
                    </h3>
                    <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                        {liveStores.length}
                    </span>
                </div>
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={() => { setSelectedStore('All'); setIsMobileFilterOpen(false); }}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all
                            ${selectedStore === 'All'
                                ? 'border-[#22C55E] bg-[#22C55E] text-white shadow-xl shadow-emerald-600/20'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-[#22C55E]'
                            }`}
                    >
                        All live stores
                        <ShoppingBag size={16} />
                    </button>
                    {liveStores.map((store) => (
                        <button
                            key={store}
                            onClick={() => { setSelectedStore(store); setIsMobileFilterOpen(false); }}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all
                                ${selectedStore === store
                                    ? 'border-[#22C55E] bg-[#22C55E] text-white shadow-xl shadow-emerald-600/20'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-[#22C55E]'
                                }`}
                        >
                            <span className="truncate">{store}</span>
                            <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[9px]">
                                {allDeals.filter((deal) => (deal.store || deal.storeName) === store).length}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Price */}
            <div className="space-y-8">
                <h3 className="text-[11px] font-[1000] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-[#FF6A00] rounded-full" /> Smart Pricing
                </h3>
                <div className="flex flex-col gap-2.5">
                    {PRICE_RANGES.map(range => (
                        <button
                            key={range.label}
                            onClick={() => { setPriceRange(range); setIsMobileFilterOpen(false); }}
                            className={`group px-6 py-4 rounded-2xl text-[11px] font-black transition-all text-left border uppercase tracking-widest relative overflow-hidden
                                ${priceRange.label === range.label
                                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xl shadow-slate-900/20'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-orange-200 hover:text-[#FF6A00] hover:shadow-lg'
                                }`}
                        >
                            {range.label}
                            {priceRange.label === range.label && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>
                    ))}
                </div>
                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max price</span>
                        <span className="rounded-xl bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-700">
                            {customMaxPrice > 0 ? formatPriceDisplay(customMaxPrice) : 'No limit'}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={priceSliderMax}
                        step={priceSliderMax > 50000 ? 1000 : 500}
                        value={customMaxPrice}
                        onChange={(event) => setCustomMaxPrice(Number(event.target.value))}
                        className="w-full accent-[#FF6A00]"
                    />
                    {customMaxPrice > 0 && (
                        <button
                            type="button"
                            onClick={() => setCustomMaxPrice(0)}
                            className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF6A00]"
                        >
                            Clear price cap
                        </button>
                    )}
                </div>
            </div>

            {/* Discount */}
            <div className="space-y-8">
                <h3 className="text-[11px] font-[1000] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-[#22C55E] rounded-full" /> Discount
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                    {DISCOUNT_FILTERS.map(filter => (
                        <button
                            key={filter.label}
                            onClick={() => { setSelectedDiscount(filter); setIsMobileFilterOpen(false); }}
                            className={`rounded-2xl border px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest transition-all
                                ${selectedDiscount.value === filter.value
                                    ? 'border-[#FF6A00] bg-[#FF6A00] text-white shadow-xl shadow-orange-500/20'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-[#FF6A00]'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900 relative">
            <SEO
                title={activeListingLabel}
                description={activeListingDescription}
                canonical={dealsCanonical}
                itemList={filteredDeals}
                breadcrumbs={[
                    { name: 'Home', url: '/' },
                    { name: activeListingLabel, url: dealsCanonical }
                ]}
            />
            <Navbar user={user} onSearch={onSearch} wishlistCount={wishlist.length} wishlist={wishlist} />

            {/* ─── Page Header ─── */}
            <div className="bg-white border-b border-slate-100 relative overflow-hidden py-10 md:py-14">
                {/* Mesh Gradients */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-50/60 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-slate-100/70 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />
                
                <div className="w-full mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
                        <div className="space-y-6 max-w-2xl">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="inline-flex items-center gap-2.5 bg-emerald-50 text-[#22C55E] text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl border border-emerald-100"
                            >
                                <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22C55E] mr-1"></span>
                                Live Pulse Intelligence
                            </motion.div>
                            <h1 className="text-5xl md:text-7xl font-[1000] text-slate-900 tracking-tight leading-[0.9]">
                                {selectedCategory !== 'All' ? (
                                    <>
                                        Best <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF8C42]">{selectedCategory}</span>
                                        <span className="block text-slate-400 mt-2">Collections</span>
                                    </>
                                ) : selectedStore !== 'All' ? (
                                    <>
                                        Curated <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF8C42]">{selectedStore}</span> 
                                        <span className="block text-slate-400 mt-2">Intelligence</span>
                                    </>
                                ) : (
                                    <>
                                        Elite <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF8C42]">Deals</span>
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
                            <div className="relative flex items-center h-20 bg-white border-2 border-slate-100 rounded-3xl group-focus-within:border-[#FF6A00]/40 group-focus-within:shadow-[0_20px_50px_-10px_rgba(255,106,0,0.1)] transition-all overflow-hidden p-2">
                                <div className="w-16 h-full flex items-center justify-center text-slate-400 group-focus-within:text-[#FF6A00]">
                                    <Search size={24} strokeWidth={2.5} />
                                </div>
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
                                    placeholder="Search deals, stores or categories..."
                                    className="flex-1 bg-transparent border-none text-base font-bold text-slate-900 outline-none placeholder:text-slate-300"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors mr-1">
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                            <AnimatePresence>
                                {isSearchFocused && searchSuggestions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-40 overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-3 shadow-2xl shadow-slate-950/10"
                                    >
                                        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Instant suggestions</p>
                                        <div className="space-y-1">
                                            {searchSuggestions.map((suggestion) => (
                                                <button
                                                    key={`${suggestion.id}-${suggestion.label}`}
                                                    type="button"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => {
                                                        setSearchQuery(suggestion.label);
                                                        setIsSearchFocused(false);
                                                    }}
                                                    className="flex w-full items-center gap-4 rounded-3xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                                                >
                                                    <div className="h-14 w-14 shrink-0 rounded-2xl bg-slate-50 p-2">
                                                        <img
                                                            src={suggestion.image}
                                                            alt=""
                                                            className="h-full w-full object-contain"
                                                            onError={(event) => {
                                                                event.currentTarget.onerror = null;
                                                                event.currentTarget.src = NO_PRODUCT_IMAGE;
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-black text-slate-900">{suggestion.label}</p>
                                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                            {suggestion.store} · {suggestion.category}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        {suggestion.price > 0 && (
                                                            <p className="mb-1 text-sm font-black tracking-tighter text-slate-950">
                                                                {formatPriceDisplay(suggestion.price)}
                                                            </p>
                                                        )}
                                                        <Search size={16} className="ml-auto text-orange-500" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    {/* Store Pill Strip - Elevated Design */}
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pt-6 pb-4 mt-2 scroll-smooth">
                        <div className="flex items-center gap-2 mr-2 py-1.5 px-3 bg-white/60 backdrop-blur-md rounded-xl border border-slate-200 shrink-0 shadow-sm">
                            <Zap size={14} className="text-[#FF6A00]" fill="currentColor" />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#FF6A00]">Active Stores</span>
                        </div>
                        
                        <button
                            onClick={() => setSelectedStore('All')}
                            className={`h-11 px-6 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border uppercase tracking-wider flex items-center justify-center
                                ${selectedStore === 'All'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                                    : 'bg-white/70 backdrop-blur-md text-slate-500 border-slate-200 hover:border-orange-200 hover:text-[#FF6A00] shadow-sm'
                                }`}
                        >
                            Global
                        </button>
                        {liveStores.map(store => {
                            const isActive = selectedStore === store;
                            return (
                                <button
                                    key={store}
                                    onClick={() => setSelectedStore(store)}
                                    className={`group h-11 px-4 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border flex items-center gap-3 uppercase tracking-wide
                                        ${isActive
                                            ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF8C42] text-white border-transparent shadow-lg shadow-orange-500/30'
                                            : 'bg-white/70 backdrop-blur-md text-slate-600 border-slate-200 hover:border-orange-200 hover:text-[#FF6A00] shadow-sm'
                                        }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm transition-all group-hover:scale-110 ${isActive ? '' : 'border border-slate-100'}`}>
                                        <img 
                                            src={`https://www.google.com/s2/favicons?domain=${store.toLowerCase().replace(/\s/g, '')}.com&sz=64`} 
                                            className="w-full h-full object-contain"
                                            alt=""
                                            onError={e => { e.target.parentElement.innerHTML = `<span class="text-[9px] font-black text-[#FF6A00]">${store[0]}</span>`; }}
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
                        <div className="sticky top-28 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm max-h-[calc(100vh-9rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            <h2 className="text-base font-black text-slate-900 mb-8 flex items-center gap-2">
                                <SlidersHorizontal size={18} className="text-[#FF6A00]" /> Filters
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
                                    <div className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse" />
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
                                    <SlidersHorizontal size={18} className="text-[#FF6A00]" /> Filters
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

                        {dealsError && (
                            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
                                {dealsError}
                            </div>
                        )}

                        {!dealsLoading && featuredDeals.length > 0 && (
                            <section className="mb-12">
                                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6A00]">
                                            <Flame size={13} fill="currentColor" />
                                            First-row picks
                                        </p>
                                        <h2 className="text-3xl font-black tracking-tight text-slate-950">Featured deals worth opening</h2>
                                    </div>
                                    <p className="max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
                                        Ranked by verified price, discount strength, freshness and store signal.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                                    {featuredDeals.map((deal, index) => (
                                        <SpotlightDealCard key={getDealIdentity(deal) || index} deal={deal} rank={index} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {!dealsLoading && filteredDeals.length > 0 && (
                            <TrendingDealsRail deals={trendingDeals} />
                        )}

                        {dealsLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                                {Array.from({ length: 12 }).map((_, index) => (
                                    <div key={index} className="h-[360px] rounded-[2.2rem] border border-slate-100 bg-white p-5 animate-pulse">
                                        <div className="h-44 rounded-2xl bg-slate-100 mb-5" />
                                        <div className="h-4 rounded bg-slate-100 mb-3" />
                                        <div className="h-4 rounded bg-slate-100 w-4/5 mb-6" />
                                        <div className="h-6 rounded bg-slate-100 w-2/5 mb-2" />
                                        <div className="h-12 rounded-2xl bg-slate-100 mt-8" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredDeals.length > 0 ? (
                            <div className="space-y-12">
                                {gridSections.firstPage.length > 0 && (
                                    <DealsGrid deals={gridSections.firstPage} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                                )}
                                <InlineDealHighlights deals={gridSections.inlineHighlights} />
                                {gridSections.finalGrid.length > 0 && (
                                    <DealsGrid deals={gridSections.finalGrid} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                                )}
                            </div>
                        ) : (
                            null
                        )}

                        {!dealsLoading && filteredDeals.length === 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-32 flex flex-col items-center text-center px-6"
                            >
                                <div className="w-32 h-32 rounded-[3.5rem] bg-slate-50 flex items-center justify-center mb-10 relative">
                                    <div className="absolute inset-0 bg-orange-500/5 blur-3xl rounded-full" />
                                    <Search size={56} className="text-slate-200" />
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-xl flex items-center justify-center text-2xl">
                                        😕
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">No deals found matching your criteria</h3>
                                <p className="text-slate-500 font-medium max-w-sm leading-relaxed mb-12">
                                    Try adjusting your filters or search keywords. You can also reset everything to see all live deals.
                                </p>
                                <button 
                                    onClick={() => {
                                        setSelectedCategory('All');
                                        setSelectedStore('All');
                                        setSearchQuery('');
                                        setPriceRange(PRICE_RANGES[0]);
                                        setSelectedDiscount(DISCOUNT_FILTERS[0]);
                                        setCustomMaxPrice(0);
                                    }}
                                    className="h-16 px-12 rounded-[2rem] bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-[#FF6A00] transition-all shadow-2xl active:scale-95"
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
                                <button onClick={() => setIsMobileFilterOpen(false)} className="w-full h-14 bg-gradient-to-r from-[#FF6A00] to-[#FF8C42] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-95 transition-colors shadow-lg shadow-orange-500/20">
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
