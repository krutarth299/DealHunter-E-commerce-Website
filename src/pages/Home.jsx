import React from 'react';
import DealsGrid from '../components/DealsGrid';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { TrendingDown, ArrowRight, Zap, ShieldCheck, Package, Clock, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Hero from '../components/Hero';
import { Link, useNavigate } from 'react-router-dom';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import SEO from '../components/SEO';
import { FEATURED_CATEGORIES, getCategoryStyle, normalizeCategory } from '../utils/categoryConstants';
import { selectBalancedDeals } from '../utils/dealCollections';
import useHasHydrated from '../hooks/useHasHydrated';
import { getMainProductImage, NO_PRODUCT_IMAGE } from '../utils/imageOptimizer';
import { formatPriceDisplay, parsePriceNumber } from '../utils/dealUi';
import { getCardTitle } from '../utils/productTitles';

const getDealKey = (deal = {}) => String(deal._id || deal.id || deal.productUrl || deal.link || deal.title || '');

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

const getDiscountPercent = (deal = {}) => {
    const price = getPrimaryPrice(deal);
    const mrp = getOriginalPrice(deal);
    if (price && mrp && mrp > price) return Math.round(((mrp - price) / mrp) * 100);
    return Math.max(0, Math.round(Number(deal.discount || deal.discountPercent || deal.pricing?.discount || 0)));
};

const getFeaturedDeals = (deals = []) => (
    [...deals]
        .filter((deal) => deal && (deal.title || deal.displayTitle) && getPrimaryPrice(deal))
        .sort((a, b) => {
            const scoreA = (a.featured ? 25 : 0) + getDiscountPercent(a);
            const scoreB = (b.featured ? 25 : 0) + getDiscountPercent(b);
            return scoreB - scoreA;
        })
        .slice(0, 3)
);

const FeaturedDealCard = ({ deal, index }) => {
    const price = getPrimaryPrice(deal);
    const mrp = getOriginalPrice(deal);
    const discount = getDiscountPercent(deal);
    const title = getCardTitle(deal.displayTitle || deal.title);
    const storeName = deal.store || deal.storeName || 'Online Store';
    const productPath = `/product/${deal.id || deal._id}`;
    const rating = parsePriceNumber(deal.rating || deal.averageRating || deal.productRating);
    const ctaClassName = "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,1)] transition-all hover:-translate-y-1 hover:from-slate-950 hover:to-blue-950 hover:shadow-[0_18px_38px_-18px_rgba(2,6,23,1)] active:scale-[0.97]";

    return (
        <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className="group relative flex h-full min-h-[34rem] flex-col overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.9)] transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_32px_75px_-45px_rgba(15,23,42,0.95)]"
        >
            <Link to={productPath} className="flex flex-1 flex-col">
                <div className="relative mb-5 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.8rem] bg-slate-50 p-6">
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
                    {discount > 0 && (
                        <div className="absolute right-4 top-4 rounded-2xl bg-orange-500 px-3 py-2 text-[10px] font-black text-white shadow-lg">
                            {discount}% OFF
                        </div>
                    )}
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">
                        {storeName}
                    </span>
                    {rating > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600">
                            <Star size={12} fill="currentColor" />
                            {rating.toFixed(1).replace(/\.0$/, '')}
                        </span>
                    )}
                </div>

                <h3 className="mb-5 line-clamp-2 min-h-[3rem] overflow-hidden text-base font-black leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-blue-700 md:min-h-[3.2rem] md:text-lg">
                    {title}
                </h3>

                <div className="mt-auto mb-5 flex min-h-[3.65rem] flex-wrap items-end gap-2">
                    <span className="text-3xl font-black leading-none tracking-tighter text-slate-950">
                        {price ? formatPriceDisplay(price) : 'Live price'}
                    </span>
                    {mrp && mrp > price && (
                        <span className="pb-1 text-sm font-bold text-slate-400 line-through">
                            {formatPriceDisplay(mrp)}
                        </span>
                    )}
                </div>
            </Link>

            <Link to={productPath} className={ctaClassName}>
                Grab Deal
                <ArrowRight size={14} strokeWidth={3} />
            </Link>
        </motion.article>
    );
};

const Home = ({ deals, user, onSearch, setIsAddDealOpen, wishlist, toggleWishlist, apiBase, categories: globalCategories, dealsLoading = false, dealsError = '' }) => {
    const navigate = useNavigate();
    const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
    const hasHydrated = useHasHydrated();

    const categories = React.useMemo(() => {
        const normalizedGlobal = (globalCategories || []).map(c => normalizeCategory(c)).filter(Boolean);
        return [...new Set([...FEATURED_CATEGORIES, ...normalizedGlobal])];
    }, [globalCategories]);
    const homepageDeals = React.useMemo(() => selectBalancedDeals(deals, { limit: 12 }), [deals]);
    const featuredHomepageDeals = React.useMemo(() => getFeaturedDeals(homepageDeals), [homepageDeals]);
    const featuredDealKeys = React.useMemo(() => new Set(featuredHomepageDeals.map(getDealKey)), [featuredHomepageDeals]);
    const mainGridDeals = React.useMemo(() => {
        if (homepageDeals.length < 9 || featuredDealKeys.size === 0) return homepageDeals;
        return homepageDeals.filter((deal) => !featuredDealKeys.has(getDealKey(deal)));
    }, [featuredDealKeys, homepageDeals]);

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900 overflow-x-hidden">
            <SEO
                title="Verified Online Deals, Coupons & Price Drops"
                description="Shop verified online deals, live discounts, coupons and price drops from Amazon, Flipkart, Myntra and other trusted stores."
                itemList={homepageDeals}
            />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main className="flex-grow pb-48 md:pb-0">
                <Hero deals={deals} />

                {/* ─── Shop by Category ─── */}
                <section className="py-14 md:py-16 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-9 gap-5">
                        <div className="space-y-2 text-center md:text-left">
                            <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-50 px-3 py-1 rounded-full border border-orange-100 mb-2 inline-block">Curated Collections</span>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Shop by Category</h2>
                            <p className="text-slate-500 text-sm md:text-base font-semibold max-w-xl">Jump straight into live, store-verified deals by the product type you need.</p>
                        </div>
                        <motion.button 
                            whileHover={{ x: 5 }}
                            onClick={() => navigate('/deals')} 
                            className="flex items-center justify-center gap-2 text-sm font-black text-slate-500 hover:text-orange-500 transition-colors group"
                        >
                            VIEW ALL <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all"><ArrowRight size={14} /></div>
                        </motion.button>
                    </div>

                    <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 sm:gap-5">
                        {categories.map((catName, i) => {
                            const style = getCategoryStyle(catName);
                            const Icon = style.icon;
                            return (
                                <motion.button
                                    key={catName}
                                    initial={hasHydrated ? { opacity: 0, y: 20 } : false}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/deals?category=' + encodeURIComponent(catName))}
                                    className="relative flex flex-col items-center group cursor-pointer"
                                >
                                    <div className={`relative w-full aspect-square rounded-[1.35rem] ${style.bg} border border-slate-200/70 flex flex-col items-center justify-center transition-all duration-500 group-hover:shadow-[0_18px_36px_-20px_rgba(15,23,42,0.6)] group-hover:border-blue-200 overflow-hidden shadow-sm md:rounded-[1.65rem]`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                        <div className={`relative z-10 w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white shadow-md shadow-slate-200/50 flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 ease-out`}>
                                            <Icon size={24} className={style.icon_color} strokeWidth={2.4} />
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-1 group-hover:translate-x-1 transition-transform">
                                            <div className={`w-1 h-1 rounded-full ${style.icon_color} opacity-20`} />
                                            <div className={`w-1 h-1 rounded-full ${style.icon_color} opacity-10`} />
                                        </div>
                                    </div>
                                    <span className="mt-3 text-[9px] sm:text-[10px] font-black text-slate-900 border-b-2 border-transparent group-hover:border-orange-500 group-hover:text-orange-600 transition-all uppercase tracking-widest px-1 text-center leading-tight">
                                        {catName.split(' & ').map((part, idx) => (
                                            <React.Fragment key={part + idx}>
                                                {part}
                                                {idx === 0 && catName.includes(' & ') && <br />}
                                            </React.Fragment>
                                        ))}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>

                {/* ─── Featured Grid ─── */}
                {featuredHomepageDeals.length >= 2 && (
                    <section className="py-12 bg-white border-y border-slate-100">
                        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 ring-1 ring-orange-100">
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
                                    className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:-translate-y-1 hover:bg-orange-500 hover:shadow-xl hover:shadow-orange-500/20"
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

                <section id="deals-grid" className="py-14 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-9">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-10 rounded-full bg-blue-500" />
                            <div>
                                <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Explore</p>
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Live Deals Worth Clicking</h2>
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
                    {dealsLoading ? (
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
                            <p className="text-slate-500 font-medium mt-3">We couldn’t find any active deals to show on the homepage yet.</p>
                        </div>
                    )}
                </section>

                {/* ─── Recently Viewed ─── */}
                {recentlyViewed && recentlyViewed.length > 0 && (
                    <section className="py-14 md:py-16 bg-white border-y border-slate-100 overflow-hidden">
                        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between mb-9">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[1.35rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                        <Clock size={26} />
                                    </div>
                                    <div>
                                        <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Your Activity</p>
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

                {/* ─── Why DealSphere ─── */}
                <section className="py-24 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 mt-6">
                    <div className="max-w-3xl mx-auto mb-20 text-center">
                        <span className="text-orange-500 text-xs font-black uppercase tracking-[0.3em] mb-4 block">The DealSphere Edge</span>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">Save 10x Faster.</span></h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {[
                            { icon: ShieldCheck, color: 'text-emerald-500', title: 'Verified Deals Only', desc: 'Every deal is manually reviewed and verified by our expert team before going live on the platform.' },
                            { icon: Zap, color: 'text-orange-500', title: 'Real-time Price Watch', desc: 'Our advanced price trackers scan millions of pages every 5 minutes to catch every single price drop.' },
                            { icon: TrendingDown, color: 'text-blue-500', title: 'Best Price Log', desc: 'We show you the historical price charts so you know if you are truly getting the lowest price ever.' },
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group p-10 rounded-[3rem] bg-white border border-slate-100 hover:border-transparent hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col items-center text-center"
                            >
                                <div className={`w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-8 rotate-3 group-hover:rotate-12 transition-transform duration-500`}>
                                    <feature.icon size={36} className={feature.color} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-4">{feature.title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Home;
