import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import DealsGrid from '../components/DealsGrid';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { TrendingDown, ArrowRight, Zap, ShieldCheck, Package, Clock, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Hero from '../components/Hero';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import SEO from '../components/SEO';
import { FEATURED_CATEGORIES, getCategoryStyle, normalizeCategory } from '../utils/categoryConstants';
import { selectBalancedDeals } from '../utils/dealCollections';
import useHasHydrated from '../hooks/useHasHydrated';
import { getMainProductImage, NO_PRODUCT_IMAGE } from '../utils/imageOptimizer';
import { formatPriceDisplay, parsePriceNumber } from '../utils/dealUi';
import { getCardTitle } from '../utils/productTitles';
import { getProductPath } from '../utils/productUrls';


const getDealKey = (deal = {}) => String(deal._id || deal.id || deal.productUrl || deal.link || deal.title || '');
const CATEGORY_SECTION_ID = 'shop-by-category';

const getPrimaryPrice = (deal = {}) => (
    parsePriceNumber(deal.pricing?.dealPrice || deal.pricing?.currentPrice || deal.dealPrice || deal.currentPrice || deal.price)
);

const getOriginalPrice = (deal = {}) => {
    const candidates = [
        deal.pricing?.mrp,
        deal.pricing?.originalPrice,
        deal.mrp,
        deal.originalPrice
    ].map(parsePriceNumber).filter((value) => value && value > 0);
    return candidates.sort((a, b) => b - a)[0] || null;
};

const shouldShowMrp = (deal = {}, price = 0, mrp = 0) => {
    const hasExplicitMrp = [
        deal.pricing?.mrp,
        deal.pricing?.originalPrice,
        deal.mrp,
        deal.originalPrice
    ].some((value) => (parsePriceNumber(value) || 0) > 0);
    return Boolean(mrp && price && (mrp > price || (mrp === price && hasExplicitMrp)));
};

const getDiscountPercent = (deal = {}) => {
    const price = getPrimaryPrice(deal);
    const mrp = getOriginalPrice(deal);
    if (price && mrp && mrp > price) return Math.round(((mrp - price) / mrp) * 100);
    return Math.max(0, Math.round(Number(deal.discount || deal.discountPercent || deal.pricing?.discount || 0)));
};

const getDealFreshnessScore = (deal = {}) => {
    const stamp = new Date(deal.updatedAt || deal.publishedAt || deal.createdAt || 0).getTime();
    if (!Number.isFinite(stamp) || stamp <= 0) return 0;
    const ageHours = Math.max(0, (Date.now() - stamp) / 36e5);
    if (ageHours < 2) return 30;
    if (ageHours < 12) return 24;
    if (ageHours < 24) return 18;
    if (ageHours < 72) return 12;
    if (ageHours < 168) return 6;
    return 0;
};

const getDealQualityScore = (deal = {}) => {
    const discount = getDiscountPercent(deal);
    const price = getPrimaryPrice(deal);
    const rating = Number(deal.rating || deal.averageRating || deal.productRating || 0) || 0;
    const hasImage = Boolean(getMainProductImage(deal) && getMainProductImage(deal) !== NO_PRODUCT_IMAGE);
    const storeTrusted = Boolean(deal.isVerified || deal.verified || deal.featured || deal.isTrending || deal.trending);

    return (
        (discount * 2.2)
        + (price > 0 ? 10 : 0)
        + getDealFreshnessScore(deal)
        + (rating > 0 ? Math.min(rating * 4, 16) : 0)
        + (hasImage ? 8 : 0)
        + (storeTrusted ? 14 : 0)
    );
};

const isLiveHomepageDeal = (deal = {}) => Boolean(
    deal
    && !deal.isExpired
    && (deal.isActive !== false)
    && (deal.isPublished !== false || deal.published === true || deal.visible === true || deal.isVisible === true || deal.featured === true)
    && (deal.title || deal.displayTitle)
    && getPrimaryPrice(deal) > 0
    && getMainProductImage(deal) !== NO_PRODUCT_IMAGE
);

const getFeaturedDeals = (deals = [], limit = 3) => (
    [...deals]
        .filter(isLiveHomepageDeal)
        .sort((a, b) => {
            const explicitFeaturedA = a.featured ? 80 : 0;
            const explicitFeaturedB = b.featured ? 80 : 0;
            const scoreA = explicitFeaturedA + getDealQualityScore(a);
            const scoreB = explicitFeaturedB + getDealQualityScore(b);
            return scoreB - scoreA;
        })
        .slice(0, limit)
);

const getBestDealsToday = (deals = [], limit = 4) => (
    [...deals]
        .filter(isLiveHomepageDeal)
        .sort((a, b) => {
            const discountDelta = getDiscountPercent(b) - getDiscountPercent(a);
            if (discountDelta !== 0) return discountDelta;

            const qualityDelta = getDealQualityScore(b) - getDealQualityScore(a);
            if (qualityDelta !== 0) return qualityDelta;

            const freshA = new Date(a.updatedAt || a.publishedAt || a.createdAt || 0).getTime();
            const freshB = new Date(b.updatedAt || b.publishedAt || b.createdAt || 0).getTime();
            if (freshA !== freshB) return freshB - freshA;

            return getPrimaryPrice(a) - getPrimaryPrice(b);
        })
        .slice(0, limit)
);

const slugify = (value = '') => (
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item'
);

const dedupeDeals = (items = []) => {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter((deal) => {
        const key = [
            getDealKey(deal),
            String(deal.store || deal.storeName || '').trim().toLowerCase(),
            String(deal.title || deal.displayTitle || '').trim().toLowerCase()
        ].join('|');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const FeaturedDealCard = React.memo(({ deal, index }) => {
    const price = getPrimaryPrice(deal);
    const mrp = getOriginalPrice(deal);
    const discount = getDiscountPercent(deal);
    const isFlipkartStore = String(deal.store || deal.storeName || '').toLowerCase().includes('flipkart');
    const title = getCardTitle(deal.displayTitle || deal.title);
    const storeName = deal.store || deal.storeName || 'Online Store';
    const productPath = getProductPath(deal);
    const rating = parsePriceNumber(deal.rating || deal.averageRating || deal.productRating);
    const ctaClassName = "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C42] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_16px_34px_-18px_rgba(255,106,0,1)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-18px_rgba(255,106,0,1)] active:scale-[0.97]";

    return (
        <div
            style={{ animationDelay: `${index * 0.08}s` }}
            className="group relative z-0 flex h-full min-h-[28rem] flex-col overflow-visible rounded-[1.8rem] border border-slate-200 bg-white p-3 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.9)] transition-all hover:z-20 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_32px_75px_-45px_rgba(15,23,42,0.95)] md:min-h-[34rem] md:rounded-[2.2rem] md:p-4 animate-fade-in-up opacity-0 will-change-transform"
        >
            <Link
                to={productPath}
                className="flex h-full flex-1 flex-col no-underline"
            >
                <div className="relative mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.45rem] bg-slate-50 p-4 md:mb-5 md:rounded-[1.8rem] md:p-6">
                    <img
                        src={getMainProductImage(deal)}
                        alt={deal.title || title}
                        className="h-full w-full object-contain drop-shadow-lg transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        onError={(event) => {
                            event.target.onerror = null;
                            event.target.src = NO_PRODUCT_IMAGE;
                        }}
                    />
                    <div className="absolute left-4 top-4 rounded-2xl bg-slate-950/90 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                        Featured
                    </div>
                    {(discount > 0 || (isFlipkartStore && price && mrp)) && (
                        <div className="absolute right-4 top-4 rounded-2xl bg-[#FF6A00] px-3 py-2 text-[10px] font-black text-white shadow-lg">
                            {discount || 0}% OFF
                        </div>
                    )}
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-700">
                        {storeName}
                    </span>
                    {rating > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600">
                            <Star size={12} fill="currentColor" />
                            {rating.toFixed(1).replace(/\.0$/, '')}
                        </span>
                    )}
                </div>

                <h3 className="mb-4 line-clamp-2 min-h-[2.65rem] overflow-hidden text-sm font-black leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-[#FF6A00] md:mb-5 md:min-h-[3.2rem] md:text-lg">
                    {title}
                </h3>

                <div className="mt-auto mb-4 flex min-h-[3.2rem] flex-wrap items-end gap-2 md:mb-5 md:min-h-[3.65rem]">
                    <span className="text-2xl font-black leading-none tracking-tighter text-slate-950 md:text-3xl">
                        {price ? formatPriceDisplay(price) : 'Live price'}
                    </span>
                    {shouldShowMrp(deal, price, mrp) && (
                        <span className="pb-1 text-sm font-bold text-slate-400 line-through">
                            {formatPriceDisplay(mrp)}
                        </span>
                    )}
                </div>

                <div className={`${ctaClassName} mt-auto`}>
                    Grab Deal
                    <ArrowRight size={14} strokeWidth={3} />
                </div>
            </Link>
        </div>
    );
});

const Home = ({ deals, user, onSearch, setIsAddDealOpen, wishlist, toggleWishlist, categories: globalCategories, dealsLoading = false, dealsError = '', showToast, homepageSnapshot = null }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
    const hasHydrated = useHasHydrated();
    const categories = useMemo(() => {
        const normalizedGlobal = (homepageSnapshot?.categories || globalCategories || []).map(c => normalizeCategory(c)).filter(Boolean);
        return [...new Set([...FEATURED_CATEGORIES, ...normalizedGlobal])];
    }, [globalCategories, homepageSnapshot?.categories]);
    const sourceDeals = useMemo(() => {
        const liveDeals = Array.isArray(deals) ? deals : [];
        const snapshotDeals = Array.isArray(homepageSnapshot?.deals) ? homepageSnapshot.deals : [];
        return dedupeDeals([...liveDeals, ...snapshotDeals]);
    }, [deals, homepageSnapshot]);
    const uniqueDeals = useMemo(() => dedupeDeals(sourceDeals), [sourceDeals]);
    const homepageDeals = useMemo(() => selectBalancedDeals(uniqueDeals, { limit: 12 }), [uniqueDeals]);
    const liveDealPool = useMemo(() => (
        uniqueDeals.filter(isLiveHomepageDeal)
    ), [uniqueDeals]);
    const heroDeals = useMemo(() => getFeaturedDeals(liveDealPool, 5), [liveDealPool]);
    const heroDealKeys = useMemo(() => new Set(heroDeals.map(getDealKey)), [heroDeals]);
    
    // Pick featured deals that are NOT in the hero slider
    const featuredHomepageDeals = useMemo(() => {
        const remaining = liveDealPool.filter(d => !heroDealKeys.has(getDealKey(d)));
        return getFeaturedDeals(remaining, 3);
    }, [liveDealPool, heroDealKeys]);
    
    const featuredDealKeys = useMemo(() => new Set(featuredHomepageDeals.map(getDealKey)), [featuredHomepageDeals]);
    
    const mainGridDeals = useMemo(() => {
        // Exclude both hero and featured deals from the main grid
        return homepageDeals.filter(deal => !heroDealKeys.has(getDealKey(deal)) && !featuredDealKeys.has(getDealKey(deal)));
    }, [homepageDeals, heroDealKeys, featuredDealKeys]);
    
    const bestDealsToday = useMemo(() => getBestDealsToday(liveDealPool, 4), [liveDealPool]);

    const goToCategory = useCallback((catName) => {
        navigate('/category/' + encodeURIComponent(slugify(catName)), {
            state: {
                returnTo: '/',
                scrollToSection: CATEGORY_SECTION_ID,
                source: 'home-category'
            }
        });
    }, [navigate]);

    const categoryScrollHandledRef = useRef(false);

    useEffect(() => {
        const scrollToSection = location.state?.scrollToSection;
        if (!scrollToSection || categoryScrollHandledRef.current) return;

        const target = document.getElementById(scrollToSection);
        if (!target) return;

        categoryScrollHandledRef.current = true;
        const frame = window.requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [location.state]);

    return (
            <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 overflow-x-hidden relative">
            {/* Premium Mesh Gradients */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-50/60 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute top-[20%] left-0 w-[600px] h-[600px] bg-blue-50/40 blur-[120px] rounded-full -translate-x-1/2 pointer-events-none" />
            
            <SEO
                title="Verified Online Deals & Price Drops"
                description="Shop verified online deals, live discounts and price drops from all active DealSphere stores."
                itemList={homepageDeals}
            />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main className="flex-grow pb-64 md:pb-0 relative z-10">
                <Hero deals={heroDeals} isLoading={dealsLoading && heroDeals.length === 0} />

                {/* Shop by Category */}
                <section id={CATEGORY_SECTION_ID} className="py-8 md:py-16 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-9 gap-4 md:gap-5">
                        <div className="space-y-2 text-center md:text-left">
                            <span className="text-[#FF6A00] text-[10px] font-black uppercase tracking-[0.2em] bg-orange-50 px-3 py-1 rounded-full border border-orange-100 mb-2 inline-block">Curated Collections</span>
                            <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Shop by Category</h2>
                            <p className="text-slate-500 text-sm md:text-base font-semibold max-w-xl">Jump straight into live, store-verified deals by the product type you need.</p>
                        </div>
                        <button 
                            onClick={() => navigate('/deals')} 
                            className="flex items-center justify-center gap-2 text-sm font-black text-slate-500 hover:text-[#FF6A00] transition-all hover:translate-x-1.5 duration-300 group"
                        >
                            VIEW ALL <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-[#FF6A00] group-hover:text-white transition-all"><ArrowRight size={14} /></div>
                        </button>
                    </div>

                    <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 sm:gap-5">
                        {categories.map((catName, i) => {
                            const style = getCategoryStyle(catName);
                            const Icon = style.icon;
                            return (
                                <button
                                    key={catName}
                                    style={hasHydrated ? { animationDelay: `${i * 0.04}s` } : {}}
                                    onClick={() => goToCategory(catName)}
                                    className={`relative flex flex-col items-center group cursor-pointer transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.95] will-change-transform ${hasHydrated ? 'animate-fade-in-up opacity-0' : ''}`}
                                >
                                    <div className={`relative w-full aspect-square rounded-[1.35rem] ${style.bg} border border-slate-200/70 flex flex-col items-center justify-center transition-all duration-500 group-hover:shadow-[0_18px_36px_-20px_rgba(15,23,42,0.6)] group-hover:border-orange-200 overflow-hidden shadow-sm md:rounded-[1.65rem]`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                        <div className={`relative z-10 w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-white shadow-md shadow-slate-200/50 flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 ease-out`}>
                                            <Icon size={22} className={style.icon_color} strokeWidth={2.4} />
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-1 group-hover:translate-x-1 transition-transform">
                                            <div className={`w-1 h-1 rounded-full ${style.icon_color} opacity-20`} />
                                            <div className={`w-1 h-1 rounded-full ${style.icon_color} opacity-10`} />
                                        </div>
                                    </div>
                                    <span className="mt-3 text-[9px] sm:text-[10px] font-black text-slate-900 border-b-2 border-transparent group-hover:border-[#FF6A00] group-hover:text-[#FF6A00] transition-all uppercase tracking-widest px-1 text-center leading-tight">
                                        {catName.split(' & ').map((part, idx) => (
                                            <React.Fragment key={part + idx}>
                                                {part}
                                                {idx === 0 && catName.includes(' & ') && <br />}
                                            </React.Fragment>
                                        ))}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Featured Grid */}
                {featuredHomepageDeals.length > 0 && (
                    <section className="py-8 md:py-12 bg-white/70 backdrop-blur-xl border-y border-slate-100">
                        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="mb-6 md:mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 ring-1 ring-orange-100 shadow-sm">
                                        <Zap size={12} fill="currentColor" />
                                        Editor Picks
                                    </span>
                                    <h2 className="text-3xl font-black leading-none tracking-tight text-slate-950 md:text-5xl">
                                        Featured Deals
                                    </h2>
                                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500 md:text-base">
                                        High-discount, store-linked deals picked from the same live product feed shown across DealSphere.
                                    </p>
                                </div>
                                <Link
                                    to="/deals"
                                    className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:-translate-y-1 hover:bg-[#FF6A00] hover:shadow-xl hover:shadow-orange-500/20"
                                >
                                    Explore More
                                    <ArrowRight size={14} strokeWidth={3} />
                                </Link>
                            </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {featuredHomepageDeals.map((deal, index) => (
                            <FeaturedDealCard key={getDealKey(deal) || index} deal={deal} index={index} />
                        ))}
                    </div>
                </div>
            </section>
        )}

                <section id="deals-grid" className="py-8 md:py-14 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 md:gap-5 md:flex-row md:items-end md:justify-between mb-6 md:mb-9">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-10 rounded-full bg-[#FF6A00]" />
                            <div>
                                <p className="text-[#FF6A00] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Explore</p>
                                <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight md:leading-none">Live Deals Worth Clicking</h2>
                                <p className="mt-3 max-w-2xl text-sm md:text-base font-semibold text-slate-500">
                                    Compare store, price, MRP and discount before jumping to the source product page.
                                </p>
                            </div>
                        </div>
                        {homepageDeals.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">
                                {homepageDeals.length} featured now
                            </div>
                        )}
                    </div>
                    {dealsError && (
                        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
                            {dealsError}
                        </div>
                    )}
                    {dealsLoading && deals.length === 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                            {Array.from({ length: 10 }).map((_, index) => (
                                <div key={index} className="h-[360px] rounded-[2.2rem] border border-slate-100 bg-white p-5 animate-pulse">
                                    <div className="h-44 rounded-2xl bg-slate-100 mb-5" />
                                    <div className="h-4 rounded bg-slate-100 mb-3" />
                                    <div className="h-4 rounded bg-slate-100 w-4/5 mb-6" />
                                    <div className="h-6 rounded bg-slate-100 w-2/5 mb-2" />
                                    <div className="h-12 rounded-2xl bg-slate-100 mt-8" />
                                </div>
                            ))}
                        </div>
                    ) : mainGridDeals.length > 0 ? (
                        <DealsGrid deals={mainGridDeals} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                    ) : (
                        <div className="rounded-[2.5rem] border border-dashed border-slate-200 bg-white px-8 py-20 text-center">
                            <Package size={28} className="mx-auto mb-4 text-slate-300" />
                            <h3 className="text-2xl font-black text-slate-900">No live deals available right now</h3>
                            <p className="text-slate-500 font-medium mt-3">We couldn't find any active deals to show on the homepage right now.</p>
                        </div>
                    )}
                </section>

                {bestDealsToday.length > 0 && (
                    <section className="py-8 md:py-12 bg-white/70 backdrop-blur-xl border-y border-slate-100">
                        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="mb-6 md:mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 ring-1 ring-orange-100 shadow-sm">
                                        <TrendingDown size={12} />
                                        Ranked by discount
                                    </span>
                                    <h2 className="text-3xl font-black leading-none tracking-tight text-slate-950 md:text-5xl">
                                        Best Deals Today
                                    </h2>
                                </div>
                                <Link
                                    to="/deals"
                                    className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:-translate-y-1 hover:bg-[#FF6A00]"
                                >
                                    Shop More Deals
                                    <ArrowRight size={14} strokeWidth={3} />
                                </Link>
                            </div>
                            <DealsGrid deals={bestDealsToday} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                        </div>
                    </section>
                )}

                {/* Recently Viewed */}
                {recentlyViewed && recentlyViewed.length > 0 && (
                    <section className="overflow-visible py-8 md:py-16 bg-white/70 backdrop-blur-xl border-y border-slate-100">
                        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex flex-col gap-4 md:gap-5 md:flex-row md:items-center md:justify-between mb-6 md:mb-9">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[1.35rem] bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6A00] shadow-sm">
                                        <Clock size={26} />
                                    </div>
                                    <div>
                                        <p className="text-[#FF6A00] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Your Activity</p>
                                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Recently Viewed Products</h2>
                                        <p className="mt-2 text-sm font-semibold text-slate-500">Pick up where you left off. Your viewed deals stay only in this browser.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={clearRecentlyViewed}
                                    className="w-fit rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-900 hover:text-white"
                                >
                                    Clear history
                                </button>
                            </div>
                            <DealsGrid deals={recentlyViewed.slice(0, 5)} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                        </div>
                    </section>
                )}

                {/* Why DealSphere */}
                <section className="py-12 md:py-24 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 mt-2 md:mt-6">
                    <div className="max-w-3xl mx-auto mb-10 md:mb-20 text-center">
                        <span className="text-[#FF6A00] text-xs font-black uppercase tracking-[0.3em] mb-4 block">The DealSphere Edge</span>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF8C42]">Save 10x Faster.</span></h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-10">
                        {[
                            { icon: ShieldCheck, color: 'text-[#22C55E]', title: 'Verified Deals Only', desc: 'Every deal is checked before it appears here, so the homepage stays reliable.' },
                            { icon: Zap, color: 'text-[#FF6A00]', title: 'Live Price Tracking', desc: 'Price drops are refreshed from live catalog data so what you see stays current.' },
                            { icon: TrendingDown, color: 'text-[#0F172A]', title: 'Price History View', desc: "Historical snapshots help you judge whether today's price is genuinely strong." },
                        ].map((feature, i) => (
                            <div
                                key={i}
                                style={{ animationDelay: `${i * 0.1}s` }}
                                className="group p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white border border-slate-100 hover:border-transparent hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col items-center text-center animate-fade-in-up opacity-0 will-change-transform"
                            >
                                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[1.6rem] md:rounded-[2rem] bg-slate-50 flex items-center justify-center mb-5 md:mb-8 rotate-3 group-hover:rotate-12 transition-transform duration-500`}>
                                    <feature.icon size={30} className={feature.color} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-4">{feature.title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Home;
