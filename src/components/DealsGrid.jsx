import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, ArrowRight, Search, Star, Zap, Flame, Clock3, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMainProductImage, NO_PRODUCT_IMAGE } from '../utils/imageOptimizer';
import { formatPriceDisplay, parsePriceNumber } from '../utils/dealUi';
import { getCardTitle } from '../utils/productTitles';
import { getProductPath } from '../utils/productUrls';

const getStoreStyle = () => ({
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-[#FF6A00]'
});

const clampPositiveNumber = (...candidates) => {
    for (const candidate of candidates.flat()) {
        const parsed = parsePriceNumber(candidate);
        if (parsed !== null && parsed > 0) return parsed;
    }
    return 0;
};

const clampHighestPositiveNumber = (...candidates) => (
    candidates
        .flat()
        .map((candidate) => parsePriceNumber(candidate))
        .filter((parsed) => parsed !== null && parsed > 0)
        .sort((a, b) => b - a)[0] || 0
);

const getDealPricing = (deal = {}) => {
    const dealPrice = deal?.dealPrice || deal?.price || 0;
    const mrp = deal?.mrp || deal?.originalPrice || 0;
    const discount = deal?.discount || "";

    const dealPriceValue = parsePriceNumber(dealPrice);
    const mrpValue = parsePriceNumber(mrp);

    return {
        dealPriceValue,
        mrpValue,
        discount,
        dealPriceLabel: dealPriceValue > 0 ? formatPriceDisplay(dealPriceValue) : (dealPrice || ""),
        mrpLabel: mrpValue > 0 ? formatPriceDisplay(mrpValue) : (mrp || ""),
    };
};

const getDiscountColor = (discountValue) => {
    if (!discountValue) return 'bg-slate-400';
    if (discountValue >= 60) return 'bg-[#FF6A00]';
    if (discountValue >= 40) return 'bg-[#FF6A00]';
    if (discountValue >= 20) return 'bg-amber-500';
    return 'bg-[#22C55E]';
};

const isBestsellerDeal = (deal = {}, reviewCount = 0) => (
    Boolean(deal.isBestseller || deal.badge === 'Bestseller') || reviewCount >= 1000
);

const isTrendingDeal = (deal = {}, discountValue = 0) => (
    Boolean(deal.isTrending || deal.trending || deal.featured) || discountValue >= 35
);

const getReviewCount = (deal = {}) => {
    const parsed = clampPositiveNumber(deal.reviewCount, deal.ratingsCount);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatCompactReviewCount = (count = 0) => {
    if (count >= 100000) return `${Math.round(count / 100000)}L`;
    if (count >= 1000) {
        const rounded = Math.round(count / 100) / 10;
        return `${String(rounded).replace(/\.0$/, '')}K`;
    }
    return String(count);
};

const getUpdatedLabel = (deal = {}) => {
    const stamp = deal.updatedAt || deal.createdAt || deal.viewedAt;
    if (!stamp) return 'updated recently';
    const updatedTime = new Date(stamp).getTime();
    if (!Number.isFinite(updatedTime) || updatedTime <= 0) return 'updated recently';
    const minutes = Math.max(0, Math.round((Date.now() - updatedTime) / 60000));
    if (minutes < 2) return 'updated now';
    if (minutes < 60) return `updated ${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `updated ${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `updated ${days}d ago`;
    return 'price checked';
};

const getShortTitle = (title = '') => getCardTitle(title);

const DealCard = React.memo(({ deal, wishlist = [], toggleWishlist, index = 0 }) => {
    const isSaved = wishlist.some((item) => {
        const wishlistId = item.id || item._id;
        const dealId = deal.id || deal._id;
        return wishlistId && dealId && String(wishlistId) === String(dealId);
    });

    const { dealPriceValue, discountValue, dealPriceLabel, mrpLabel, showZeroDiscount } = getDealPricing(deal);
    const storeName = deal.store || deal.storeName || 'Online Store';
    const storeStyle = getStoreStyle(storeName);
    const shortTitle = deal.cardTitle || getShortTitle(deal.displayTitle || deal.title);
    const rawTitle = deal.originalTitle || deal.rawTitle || deal.title || shortTitle;
    const reviewCount = getReviewCount(deal);
    const updatedLabel = getUpdatedLabel(deal);
    const bestseller = isBestsellerDeal(deal, reviewCount);
    const trending = isTrendingDeal(deal, discountValue);
    const ratingValue = clampPositiveNumber(deal.rating, deal.averageRating, deal.productRating);
    const productDetailsPath = getProductPath(deal);

    return (
        <article
            style={{ animationDelay: `${Math.min(index, 8) * 20}ms` }}
            className={`group relative z-0 flex h-full animate-fade-in-up card-hover-gpu flex-col overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_-20px_rgba(15,23,42,0.45)] hover:z-20 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_28px_60px_-32px_rgba(15,23,42,0.55)] ${deal.isExpired ? 'cursor-not-allowed opacity-60 grayscale' : 'cursor-pointer'}`}
        >
            {!deal.isExpired && (
                <Link
                    to={productDetailsPath}
                    aria-label={`View deal: ${deal.title || shortTitle}`}
                    className="absolute inset-0 z-10 rounded-[inherit]"
                />
            )}

            <div className="relative flex h-[170px] w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white p-5 sm:h-[205px] md:h-[230px] md:p-7">
                {deal.isExpired && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-50/70 backdrop-blur-sm">
                        <span className="rounded-xl bg-slate-800 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                            Offer Expired
                        </span>
                    </div>
                )}

                <div className="relative h-full w-full">
                    <img
                        src={getMainProductImage(deal)}
                        alt={deal.title || shortTitle}
                        loading="lazy"
                        className="h-full w-full object-contain drop-shadow-md transition-transform duration-700 ease-out group-hover:scale-105"
                        onError={(event) => {
                            event.target.onerror = null;
                            event.target.src = NO_PRODUCT_IMAGE;
                        }}
                    />
                </div>

                <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 md:left-4 md:top-4">
                    {deal?.discount && (
                        <div className="flex items-center gap-1 rounded-xl bg-[#FF6A00] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg md:gap-1.5 md:px-3 md:text-[10px]">
                            <Zap size={12} fill="currentColor" />
                            {deal.discount}
                        </div>
                    )}
                    {trending && (
                        <div className="flex w-fit items-center gap-1 rounded-lg bg-[#22C55E] px-2.5 py-1 text-[9px] font-black uppercase tracking-tight text-white shadow-lg shadow-emerald-500/20">
                            <Flame size={12} fill="currentColor" />
                            Trending
                        </div>
                    )}
                    {bestseller && !trending && (
                        <div className="flex w-fit items-center gap-1 rounded-lg bg-[#0F172A] px-2.5 py-1 text-[9px] font-black uppercase tracking-tight text-white shadow-lg shadow-slate-500/20">
                            <Star size={12} fill="currentColor" />
                            Bestseller
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleWishlist?.(deal);
                    }}
                    className={`absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white/95 text-slate-400 shadow-sm backdrop-blur-lg transition-all duration-300 md:right-4 md:top-4 ${isSaved ? 'text-[#FF6A00]' : 'hover:text-[#FF6A00] hover:shadow-lg active:scale-90'}`}
                    aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                    <Heart
                        size={18}
                        fill={isSaved ? 'currentColor' : 'none'}
                        strokeWidth={isSaved ? 0 : 2}
                        className={isSaved ? 'scale-110' : 'scale-100'}
                    />
                </button>
            </div>

            <div className="relative z-0 flex flex-1 flex-col bg-white p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                    {storeName ? (
                        <div className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 ${storeStyle.bg} ${storeStyle.border}`}>
                            <span className={`h-2.5 w-2.5 rounded-full ${storeStyle.dot}`} />
                            <span className={`max-w-[6.8rem] truncate text-[9px] font-black uppercase tracking-widest ${storeStyle.text}`}>
                                {storeName}
                            </span>
                        </div>
                    ) : (
                        <div />
                    )}

                    {ratingValue > 0 ? (
                        <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black text-[#FF6A00]">
                            <Star size={12} fill="currentColor" />
                            {ratingValue.toFixed(1).replace(/\.0$/, '')}
                            {reviewCount > 0 && <span className="text-slate-400">({formatCompactReviewCount(reviewCount)})</span>}
                        </div>
                    ) : reviewCount > 0 ? (
                        <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-tight text-slate-500">
                            {formatCompactReviewCount(reviewCount)} reviews
                        </div>
                    ) : null}
                </div>

                <div className="mb-4 min-h-[3rem]">
                    <h3
                        title={rawTitle}
                        className="line-clamp-2 text-[12px] font-extrabold leading-[1.4] text-slate-900 transition-colors group-hover:text-[#FF6A00] md:text-[13px]"
                    >
                        {shortTitle}
                    </h3>
                </div>

                <div className="mt-auto flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                            {deal?.dealPrice && (
                                <span className="text-[1.5rem] font-black leading-none tracking-tighter text-slate-950 md:text-[1.85rem]">
                                    {deal.dealPrice.toString().startsWith('₹') ? deal.dealPrice : `₹${deal.dealPrice}`}
                                </span>
                            )}
                            {deal?.mrp && (
                                <span className="text-[10px] font-bold tracking-tight text-slate-400 line-through opacity-70 md:text-xs">
                                    {deal.mrp.toString().startsWith('₹') ? deal.mrp : `₹${deal.mrp}`}
                                </span>
                            )}
                        </div>
                        <div className="flex min-h-[1.35rem] flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                            {deal?.discount ? (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-orange-100 bg-orange-50 px-2 py-1 text-[#FF6A00]">
                                    <Zap size={11} fill="currentColor" />
                                    {deal.discount}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[#22C55E]">
                                    <ShieldCheck size={11} />
                                    Price checked
                                </span>
                            )}
                            {updatedLabel && (
                                <span className="inline-flex items-center gap-1 text-slate-400">
                                    <Clock3 size={11} />
                                    {updatedLabel}
                                </span>
                            )}
                            {trending && (
                                <span className="inline-flex items-center gap-1 text-[#22C55E]">
                                    <Flame size={11} fill="currentColor" />
                                    Limited deal
                                </span>
                            )}
                            {!updatedLabel && !trending && (
                                <span className="inline-flex items-center gap-1 text-slate-400">
                                    <ShieldCheck size={11} />
                                    Verified
                                </span>
                            )}
                        </div>
                    </div>

                    <div
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[12px] font-black uppercase tracking-wider transition-all duration-500 ${deal.isExpired ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-[#FF6A00] to-[#FF8C42] text-white shadow-[0_18px_34px_-16px_rgba(255,106,0,0.9)] hover:-translate-y-1 hover:shadow-[0_22px_42px_-16px_rgba(255,106,0,1)] active:scale-[0.97]'}`}
                    >
                        {deal.isExpired ? 'Sold Out' : 'Grab Deal'}
                        {!deal.isExpired && <ArrowRight size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />}
                    </div>
                </div>
            </div>
        </article>
    );
});

const DealsGrid = React.memo(({ deals = [], wishlist = [], toggleWishlist, initialCount = 30, increment = 30 }) => {
    const validDeals = useMemo(
        () => (Array.isArray(deals) ? deals : []).filter((deal) => deal && (deal.title || deal.store)),
        [deals]
    );
    const [visibleCount, setVisibleCount] = useState(() => Math.min(initialCount, validDeals.length || initialCount));
    const loadMoreRef = useRef(null);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return undefined;
        const target = loadMoreRef.current;
        if (!target) return undefined;

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setVisibleCount((count) => Math.min(count + increment, validDeals.length));
            }
        }, { rootMargin: '700px 0px' });

        observer.observe(target);
        return () => observer.disconnect();
    }, [increment, validDeals.length]);

    const effectiveVisibleCount = Math.min(visibleCount, validDeals.length);
    const visibleDeals = validDeals.slice(0, effectiveVisibleCount);

    if (validDeals.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative col-span-full flex min-h-[500px] flex-col items-center justify-center overflow-hidden rounded-[3rem] border border-dashed border-slate-200 bg-white px-6 py-24 text-center"
            >
                <div className="absolute left-0 top-0 h-32 w-32 rounded-full bg-slate-50/50 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-slate-50/50 blur-3xl" />

                <motion.div
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative z-10 mb-10 flex h-28 w-28 items-center justify-center rounded-[2.5rem] border border-white bg-slate-50 shadow-[inset_0_4px_12px_rgba(0,0,0,0.03)]"
                >
                    <Search size={44} className="text-slate-200" strokeWidth={1} />
                </motion.div>
                <h3 className="mb-4 text-3xl font-black tracking-tight text-slate-900">No live deals found</h3>
                <p className="mb-12 max-w-sm text-lg font-medium leading-relaxed text-slate-500">
                    Our feed is empty right now. New verified deals will appear here as soon as they go live.
                </p>
                <a
                    href="/deals"
                    className="btn-primary rounded-2xl px-10 py-5 text-xs font-black uppercase tracking-widest"
                >
                    Browse All Deals
                </a>
            </motion.div>
        );
    }

    return (
        <div id="deals-grid" className="grid grid-cols-2 gap-4 overflow-visible py-2 content-visibility-auto sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visibleDeals.map((deal, index) => (
                <DealCard
                    key={deal.id || deal._id || index}
                    deal={deal}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    index={index}
                />
            ))}
            {effectiveVisibleCount < validDeals.length && (
                <div ref={loadMoreRef} className="col-span-full flex justify-center py-4">
                    <button
                        type="button"
                        onClick={() => setVisibleCount((count) => Math.min(count + increment, validDeals.length))}
                        className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:text-[#FF6A00]"
                    >
                        Load more deals
                    </button>
                </div>
            )}
        </div>
    );
});

export default DealsGrid;
