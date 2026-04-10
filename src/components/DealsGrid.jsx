import React from 'react';
import { Heart, ArrowRight, Search, Star, Zap, Flame, Clock3, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMainProductImage, NO_PRODUCT_IMAGE } from '../utils/imageOptimizer';
import { formatPriceDisplay, parsePriceNumber } from '../utils/dealUi';
import { getCardTitle } from '../utils/productTitles';
import useHasHydrated from '../hooks/useHasHydrated';

const storeColors = {
    Amazon: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
    Flipkart: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
    Myntra: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-400' },
    Blinkit: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
    Meesho: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400' },
    Ajio: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
    Nykaa: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-400' },
    Croma: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' }
};

const getStoreStyle = (store) => storeColors[store] || {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400'
};

const clampPositiveNumber = (...candidates) => {
    for (const candidate of candidates.flat()) {
        const parsed = parsePriceNumber(candidate);
        if (parsed !== null && parsed > 0) {
            return parsed;
        }
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
    const pricing = deal.pricing || {};
    let dealPriceValue = clampPositiveNumber(
        pricing.dealPrice,
        pricing.currentPrice,
        pricing.salePrice,
        deal.dealPrice,
        deal.currentPrice,
        deal.salePrice,
        pricing.price,
        deal.price
    );

    let mrpValue = clampHighestPositiveNumber(
        pricing.mrp,
        pricing.originalPrice,
        pricing.listPrice,
        pricing.strikePrice,
        deal.mrp,
        deal.listPrice,
        deal.strikePrice,
        deal.wasPrice,
        deal.originalPrice
    );

    if (dealPriceValue > 0 && mrpValue > 0 && mrpValue < dealPriceValue) {
        [dealPriceValue, mrpValue] = [mrpValue, dealPriceValue];
    }

    if (dealPriceValue <= 0 || mrpValue <= dealPriceValue) {
        mrpValue = 0;
    }

    const computedDiscount = mrpValue > dealPriceValue && mrpValue > 0
        ? Math.round(((mrpValue - dealPriceValue) / mrpValue) * 100)
        : 0;

    const discountValue = computedDiscount > 0 ? computedDiscount : 0;

    return {
        dealPriceValue,
        mrpValue,
        discountValue,
        dealPriceLabel: dealPriceValue > 0 ? formatPriceDisplay(dealPriceValue) : '',
        mrpLabel: mrpValue > dealPriceValue ? formatPriceDisplay(mrpValue) : ''
    };
};

const getDiscountColor = (discountValue) => {
    if (!discountValue) return 'bg-slate-400';
    if (discountValue >= 60) return 'bg-red-600';
    if (discountValue >= 40) return 'bg-orange-500';
    if (discountValue >= 20) return 'bg-amber-500';
    return 'bg-green-600';
};

const isBestsellerDeal = (deal = {}, reviewCount = 0) => (
    Boolean(deal.isBestseller || deal.bestseller || deal.badge === 'Bestseller')
    || reviewCount >= 1000
);

const isTrendingDeal = (deal = {}, discountValue = 0) => (
    Boolean(deal.isTrending || deal.trending || deal.featured)
    || discountValue >= 35
);

const getReviewCount = (deal = {}) => {
    if (Array.isArray(deal.reviews)) return deal.reviews.length;
    const parsed = clampPositiveNumber(deal.reviewCount, deal.reviewsCount, deal.ratingsCount);
    return parsed > 0 ? Math.round(parsed) : 0;
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

const getShortTitle = (title = '') => {
    return getCardTitle(title);
    /*
        .split(/[|•]/)[0]
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) return 'Elite Product Deal';
    if (normalized.length <= 64) return normalized;

    const words = normalized.split(' ').filter(Boolean);
    const compactWords = [];

    for (const word of words) {
        const candidate = [...compactWords, word].join(' ');
        if (compactWords.length >= 8 || candidate.length > 62) break;
        compactWords.push(word);
    }

    const compactTitle = compactWords.join(' ').trim();
    return compactTitle && compactTitle.length < normalized.length
        ? `${compactTitle}...`
        : normalized;
};

*/
};
const DealCard = React.memo(({ deal, wishlist = [], toggleWishlist, index = 0 }) => {
    const navigate = useNavigate();
    const hasHydrated = useHasHydrated();
    const isSaved = wishlist.some((item) => {
        const wishlistId = item.id || item._id;
        const dealId = deal.id || deal._id;
        return wishlistId && dealId && String(wishlistId) === String(dealId);
    });

    const { dealPriceValue, discountValue, dealPriceLabel, mrpLabel } = getDealPricing(deal);
    const storeName = deal.store || deal.storeName || 'Online Store';
    const storeStyle = getStoreStyle(storeName);
    const shortTitle = deal.cardTitle || getShortTitle(deal.displayTitle || deal.title);
    const rawTitle = deal.originalTitle || deal.rawTitle || deal.title || shortTitle;
    const reviewCount = getReviewCount(deal);
    const updatedLabel = getUpdatedLabel(deal);
    const bestseller = isBestsellerDeal(deal, reviewCount);
    const trending = isTrendingDeal(deal, discountValue);
    const ratingValue = clampPositiveNumber(deal.rating, deal.averageRating, deal.productRating);
    const productDetailsPath = `/product/${deal.id || deal._id}`;

    const navigateToProductDetails = () => {
        navigate(productDetailsPath);
    };

    const handleGetDeal = (event) => {
        event.preventDefault();
        event.stopPropagation();
        navigateToProductDetails();
    };

    return (
        <motion.article
            initial={hasHydrated ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.04, ease: 'easeOut' }}
            whileHover={{ y: -6, scale: 1.01 }}
            onClick={() => !deal.isExpired && navigateToProductDetails()}
            onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && !deal.isExpired) {
                    event.preventDefault();
                    navigateToProductDetails();
                }
            }}
            tabIndex={0}
            role="button"
            aria-label={`View deal: ${deal.title || shortTitle}`}
            className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white shadow-[0_8px_28px_-20px_rgba(15,23,42,0.45)] transition-all duration-500 hover:border-blue-200 hover:shadow-[0_28px_60px_-32px_rgba(15,23,42,0.55)] md:rounded-[2.2rem] ${deal.isExpired ? 'cursor-not-allowed opacity-60 grayscale' : 'cursor-pointer'}`}
        >
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
                    {discountValue > 0 && (
                        <div className={`${getDiscountColor(discountValue)} flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg md:gap-1.5 md:px-3 md:text-[10px]`}>
                            <Zap size={12} fill="currentColor" />
                            {discountValue}% OFF
                        </div>
                    )}
                    {trending && (
                        <div className="flex w-fit items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-tight text-white shadow-lg shadow-orange-500/20">
                            <Flame size={12} fill="currentColor" />
                            Trending
                        </div>
                    )}
                    {bestseller && !trending && (
                        <div className="flex w-fit items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-tight text-white shadow-lg shadow-blue-500/20">
                            <Star size={12} fill="currentColor" />
                            Bestseller
                        </div>
                    )}
                </div>

                <button
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleWishlist?.(deal);
                    }}
                    className={`absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white/95 text-slate-400 shadow-sm backdrop-blur-lg transition-all duration-300 md:right-4 md:top-4 ${isSaved ? 'text-red-500' : 'hover:text-red-500 hover:shadow-lg active:scale-90'}`}
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

            <div className="relative z-10 flex flex-1 flex-col bg-white p-4 sm:p-5">
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
                        <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black text-orange-600">
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
                        className="line-clamp-2 text-[12px] font-extrabold leading-[1.4] text-slate-900 transition-colors group-hover:text-blue-600 md:text-[13px]"
                    >
                        {shortTitle}
                    </h3>
                </div>

                <div className="mt-auto flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[1.5rem] font-black leading-none tracking-tighter text-slate-950 md:text-[1.85rem]">
                                {dealPriceLabel || 'Price unavailable'}
                            </span>
                            {mrpLabel && (
                                <span className="text-[10px] font-bold tracking-tight text-slate-400 line-through opacity-70 md:text-xs">
                                    {mrpLabel}
                                </span>
                            )}
                        </div>
                        <div className="flex min-h-[1.35rem] flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 border ${discountValue > 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {discountValue > 0 && dealPriceValue > 0 ? (
                                    <>
                                        <Zap size={11} fill="currentColor" />
                                        {discountValue}% OFF
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={11} />
                                        Price checked
                                    </>
                                )}
                            </span>
                            {updatedLabel && (
                                <span className="inline-flex items-center gap-1 text-slate-400">
                                    <Clock3 size={11} />
                                    {updatedLabel}
                                </span>
                            )}
                            {trending && (
                                <span className="inline-flex items-center gap-1 text-orange-500">
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

                    <button
                        type="button"
                        onClick={deal.isExpired ? (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        } : handleGetDeal}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[12px] font-black uppercase tracking-wider transition-all duration-500 ${deal.isExpired ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-orange-500 via-orange-500 to-rose-500 text-white shadow-[0_18px_34px_-16px_rgba(249,115,22,1)] hover:-translate-y-1 hover:from-slate-950 hover:via-slate-950 hover:to-blue-950 hover:shadow-[0_22px_42px_-16px_rgba(2,6,23,0.95)] active:scale-[0.97]'}`}
                    >
                        {deal.isExpired ? 'Sold Out' : 'Grab Deal'}
                        {!deal.isExpired && <ArrowRight size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />}
                    </button>
                </div>
            </div>
        </motion.article>
    );
});

const DealsGrid = React.memo(({ deals = [], wishlist = [], toggleWishlist }) => {
    const validDeals = (Array.isArray(deals) ? deals : []).filter((deal) => deal && (deal.title || deal.store));

    if (validDeals.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative col-span-full flex min-h-[500px] flex-col items-center justify-center overflow-hidden rounded-[3.5rem] border border-dashed border-slate-200 bg-white px-6 py-24 text-center"
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
                <h3 className="mb-4 text-3xl font-black tracking-tight text-slate-900">No Intel Matches</h3>
                <p className="mb-12 max-w-sm text-lg font-medium leading-relaxed text-slate-500">
                    Our sensors could not find any deals matching your current search parameters.
                </p>
                <a
                    href="/deals"
                    className="rounded-2xl bg-slate-900 px-10 py-5 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-900/10 transition-all hover:translate-y-[-4px] hover:bg-orange-500 hover:shadow-orange-500/30 active:scale-95"
                >
                    Clear Search Grid
                </a>
            </motion.div>
        );
    }

    return (
        <div id="deals-grid" className="grid grid-cols-2 gap-4 content-visibility-auto optimize-gpu sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {validDeals.map((deal, index) => (
                <DealCard
                    key={deal.id || deal._id || index}
                    deal={deal}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    index={index}
                />
            ))}
        </div>
    );
});

export default DealsGrid;
