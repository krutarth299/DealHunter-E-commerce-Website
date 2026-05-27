import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    Clock,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPriceDisplay, parsePriceNumber } from '../utils/dealUi';
import { getMainProductImage, NO_PRODUCT_IMAGE } from '../utils/imageOptimizer';
import { getDisplayTitle } from '../utils/productTitles';
import { getProductPath } from '../utils/productUrls';
import useHasHydrated from '../hooks/useHasHydrated';

const HERO_GRADIENT = 'linear-gradient(135deg, #FF9B54 0%, #FFC989 48%, #FF8A3D 100%)';

const getDiscountNum = (discount) => {
    if (!discount) return null;
    const match = String(discount).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
};

const getDealNumbers = (deal) => {
    const dealPrice = parsePriceNumber(deal?.dealPrice || deal?.price || deal?.pricing?.dealPrice || deal?.pricing?.price);
    const mrp = parsePriceNumber(
        deal?.originalPrice ||
            deal?.mrp ||
            deal?.pricing?.mrp ||
            deal?.pricing?.originalPrice ||
            deal?.listPrice ||
            deal?.compareAtPrice
    );
    const hasExplicitMrp = [
        deal?.originalPrice,
        deal?.mrp,
        deal?.pricing?.mrp,
        deal?.pricing?.originalPrice,
        deal?.listPrice,
        deal?.compareAtPrice
    ].some((value) => (parsePriceNumber(value) || 0) > 0);
    const discount = mrp > dealPrice && dealPrice > 0 ? Math.round(((mrp - dealPrice) / mrp) * 100) : getDiscountNum(deal?.discount);
    return {
        dealPrice,
        mrp,
        hasExplicitMrp,
        discount: Number.isFinite(discount) ? discount : null,
    };
};

const HeroStickyContent = ({ slide, label }) => (
    <>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 p-1.5 ring-1 ring-white/15">
            {slide.image ? (
                <img src={slide.image} alt="" className="h-full w-full object-contain" loading="lazy" decoding="async" />
            ) : (
                <ShoppingBag size={20} className="text-white/80" />
            )}
        </div>
        <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                {slide.store || 'DealSphere'}
            </p>
            <p className="mt-1 truncate text-[10px] font-black leading-none tracking-tight text-white">
                {slide.title || 'Mega Deals - Save More Today'}
            </p>
        </div>
        <div className="flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C42] px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20">
            {label}
            <ArrowRight size={14} strokeWidth={3} />
        </div>
    </>
);

const HeroSkeleton = () => (
    <section className="w-full overflow-hidden border-b border-[#E2E8F0] bg-white">
        <div className="relative overflow-hidden" style={{ backgroundImage: HERO_GRADIENT }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
            <div className="relative mx-auto flex min-h-[430px] max-w-7xl flex-col justify-center gap-8 px-4 py-10 sm:min-h-[560px] sm:px-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl animate-pulse space-y-4">
                    <div className="h-7 w-40 rounded-full bg-white/20" />
                    <div className="h-14 w-full max-w-xl rounded-3xl bg-white/20" />
                    <div className="h-6 w-4/5 rounded-2xl bg-white/15" />
                    <div className="flex flex-wrap gap-3 pt-2">
                        <div className="h-16 w-32 rounded-2xl bg-white/15" />
                        <div className="h-16 w-32 rounded-2xl bg-white/15" />
                    </div>
                </div>
                <div className="h-[280px] w-full max-w-[460px] animate-pulse rounded-[2.3rem] border border-white/10 bg-white/12 p-4 sm:h-[360px]" />
            </div>
        </div>
    </section>
);

const Hero = ({ deals = [], isLoading = false }) => {
    const [current, setCurrent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const hasHydrated = useHasHydrated();
    const shouldRunEntryAnimation = hasHydrated || current > 0;
    const loadStartRef = useRef(0);

    useEffect(() => {
        if (!loadStartRef.current) {
            loadStartRef.current = typeof performance !== 'undefined' ? performance.now() : 1;
        }
    }, []);

    const slides = useMemo(() => {
        const featuredDeals = (Array.isArray(deals) ? deals : [])
            .filter((deal) => deal && (deal.image || (Array.isArray(deal.images) && deal.images.length > 0)) && (deal.price || deal.dealPrice))
            .sort((a, b) => {
                const aFeatured = Boolean(a.featured || a.isTrending);
                const bFeatured = Boolean(b.featured || b.isTrending);
                if (aFeatured && !bFeatured) return -1;
                if (!aFeatured && bFeatured) return 1;
                return (getDiscountNum(b.discount) || 0) - (getDiscountNum(a.discount) || 0);
            })
            .slice(0, 5);

        return featuredDeals.map((deal) => {
            const { dealPrice, mrp, hasExplicitMrp, discount } = getDealNumbers(deal);
            const discountLabel = discount && discount > 0 ? `${discount}% OFF` : 'Live Offer';
            const priceLabel = dealPrice > 0 ? formatPriceDisplay(dealPrice) : '';
            const trustLine = deal.store ? `Verified live deal at ${deal.store}` : 'Verified live deal';
            const image = getMainProductImage(deal);

            return {
                badge: discount >= 50 ? 'Hot Deal' : 'Best Pick',
                title: getDisplayTitle(deal.displayTitle || deal.title),
                rawTitle: deal.originalTitle || deal.rawTitle || deal.title,
                discountLabel,
                priceLabel,
                trustLine,
                cta: 'Grab Deal',
                href: (deal.id || deal._id) ? getProductPath(deal) : '/deals',
                isExternal: false,
                image,
                stat: deal.store ? `Verified on ${deal.store}` : 'Verified deal',
                store: deal.store,
                mrpLabel: mrp > 0 && dealPrice > 0 && (mrp > dealPrice || (mrp === dealPrice && hasExplicitMrp)) ? formatPriceDisplay(mrp) : '',
            };
        });
    }, [deals]);

    const storeCount = useMemo(() => new Set(slides.map((item) => item.store).filter(Boolean)).size, [slides]);

    useEffect(() => {
        if (!slides.length) return;
        const durationMs = loadStartRef.current
            ? Math.round((typeof performance !== 'undefined' ? performance.now() : loadStartRef.current) - loadStartRef.current)
            : 0;
        console.log(`[SLIDER_LOAD] ${JSON.stringify({
            slideCount: slides.length,
            firstSlideTitle: slides[0]?.title || '',
            durationMs
        })}`);
    }, [slides]);

    useEffect(() => {
        if (slides.length <= 1 || isPaused) return undefined;
        const timer = setInterval(() => setCurrent((prev) => (prev + 1) % slides.length), 5500);
        return () => clearInterval(timer);
    }, [slides.length, isPaused]);

    useEffect(() => {
        const firstImage = slides[0]?.image;
        if (!firstImage || typeof window === 'undefined') return;
        const preload = new window.Image();
        preload.decoding = 'async';
        preload.fetchPriority = 'high';
        preload.src = firstImage;
    }, [slides]);

    const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

    const slide = slides[current] || slides[0];
    const showMobileStickyCta = Boolean(slide);

    if (isLoading && !slides.length) {
        return <HeroSkeleton />;
    }

    if (!slides.length) {
        return (
            <section className="w-full overflow-hidden border-b border-[#E2E8F0] bg-white">
                <div className="relative overflow-hidden" style={{ backgroundImage: HERO_GRADIENT }}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
                    <div className="relative mx-auto flex min-h-[430px] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center text-white sm:min-h-[560px] sm:px-8">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/85">
                            <Zap size={13} fill="currentColor" />
                            Mega Deals
                        </div>
                        <h1 className="max-w-4xl text-[clamp(2.05rem,6vw,4.2rem)] font-[1000] leading-[0.98] tracking-[-0.06em]">
                            Mega Deals - Save More Today
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/80 sm:text-base">
                            Fresh verified offers from live stores, styled cleanly and updated in real time.
                        </p>
                        <Link to="/deals" className="btn-primary mt-8 h-12 rounded-2xl px-7 text-[11px] font-black uppercase tracking-[0.18em]">
                            Browse Live Deals
                            <ArrowRight size={14} strokeWidth={3} />
                        </Link>
                    </div>
                </div>
                <div className="border-b border-[#E2E8F0] bg-white">
                    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-3 py-3 text-sm font-semibold text-[#64748B] md:flex md:flex-wrap md:items-center md:justify-center md:gap-6 md:px-6 md:py-4 lg:px-8">
                        {[
                            { icon: ShieldCheck, label: 'Real catalog only', color: 'text-[#22C55E]' },
                            { icon: Zap, label: 'No placeholder promos', color: 'text-[#FF6A00]' },
                            { icon: Sparkles, label: 'Connected to live deals', color: 'text-[#64748B]' },
                            { icon: Clock, label: 'Updates when deals go live', color: 'text-[#64748B]' },
                        ].map(({ icon: Icon, label, color }) => (
                            <div key={label} className="flex items-center gap-1.5 rounded-xl bg-[#F8FAFC] px-2.5 py-2 md:bg-transparent md:px-0 md:py-0">
                                <Icon size={15} className={color} />
                                <span className="text-[9px] font-bold leading-tight md:text-xs">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            className="group relative w-full select-none overflow-hidden bg-white pt-0"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="relative min-h-[560px] overflow-hidden sm:min-h-[640px] lg:min-h-[680px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current}
                        initial={shouldRunEntryAnimation ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset }) => {
                            if (offset.x < -50) nextSlide();
                            if (offset.x > 50) prevSlide();
                        }}
                        className="absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing"
                        style={{ backgroundImage: HERO_GRADIENT }}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_28%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]" />

                        <div className="relative z-10 mx-auto flex min-h-[560px] w-full max-w-7xl items-center px-4 py-8 sm:px-8 lg:px-12">
                            <div className="grid w-full items-center gap-10 lg:grid-cols-[1.08fr,0.92fr] lg:gap-12">
                                {/* Left */}
                                <div className="text-center text-white lg:text-left">
                                    <motion.div
                                        initial={shouldRunEntryAnimation ? { y: -14, opacity: 0 } : false}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="mb-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
                                    >
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-lg shadow-xl">
                                            <Zap size={12} fill="currentColor" />
                                            Live Deal
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/18 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-50">
                                            <div className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-300" />
                                            Verified deal
                                        </span>
                                    </motion.div>

                                    <motion.h1
                                        initial={shouldRunEntryAnimation ? { y: 18, opacity: 0 } : false}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.08 }}
                                        className="mx-auto max-w-[16ch] text-[clamp(2rem,5.5vw,4rem)] font-[1000] leading-[0.98] tracking-[-0.06em] text-balance lg:mx-0"
                                    >
                                        Mega Deals - Save More Today
                                    </motion.h1>

                                    <motion.div
                                        initial={shouldRunEntryAnimation ? { y: 18, opacity: 0 } : false}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.14 }}
                                        className="mx-auto mt-4 max-w-[36rem] lg:mx-0"
                                    >
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                                            Featured product
                                        </p>
                                        <h2
                                            title={slide.rawTitle || slide.title}
                                            className="mt-2 line-clamp-2 max-w-[16ch] text-[clamp(1.3rem,3.7vw,2.5rem)] font-[1000] leading-[1.1] tracking-[-0.045em] text-balance text-white"
                                        >
                                            {slide.title}
                                        </h2>
                                    </motion.div>

                                    <motion.div
                                        initial={shouldRunEntryAnimation ? { y: 18, opacity: 0 } : false}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="mx-auto mt-5 max-w-[36rem] lg:mx-0"
                                    >
                                        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                                            <div className="rounded-xl border border-white/14 bg-white/8 px-3 py-2 text-left backdrop-blur-xl">
                                                <p className="text-[7px] font-black uppercase tracking-[0.22em] text-white/52">
                                                    Discount
                                                </p>
                                                <p className="mt-1 text-sm font-black tracking-tight text-white sm:text-base">
                                                    {slide.discountLabel}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-white/14 bg-white/8 px-3 py-2 text-left backdrop-blur-xl">
                                                <p className="text-[7px] font-black uppercase tracking-[0.22em] text-white/52">
                                                    Deal price
                                                </p>
                                                <p className="mt-1 text-sm font-black tracking-tight text-white sm:text-base">
                                                    {slide.priceLabel || 'Price live on product page'}
                                                </p>
                                            </div>
                                            {slide.mrpLabel && (
                                                <div className="rounded-xl border border-white/14 bg-white/8 px-3 py-2 text-left backdrop-blur-xl">
                                                    <p className="text-[7px] font-black uppercase tracking-[0.22em] text-white/52">
                                                        MRP
                                                    </p>
                                                    <p className="mt-1 text-sm font-black tracking-tight text-white/76 line-through sm:text-base">
                                                        {slide.mrpLabel}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm font-semibold leading-relaxed text-white/80 md:text-base">
                                            {slide.trustLine}
                                        </p>
                                    </motion.div>

                                    <motion.div
                                        initial={shouldRunEntryAnimation ? { y: 22, opacity: 0 } : false}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.26 }}
                                        className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
                                    >
                                        {slide.isExternal ? (
                                            <a
                                                href={slide.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-primary h-12 rounded-2xl px-8 text-[11px] font-black uppercase tracking-[0.18em]"
                                            >
                                                {slide.cta}
                                                <ExternalLink size={14} />
                                            </a>
                                        ) : (
                                            <Link
                                                to={slide.href}
                                                className="btn-primary h-12 rounded-2xl px-8 text-[11px] font-black uppercase tracking-[0.18em]"
                                            >
                                                {slide.cta}
                                                <ArrowRight size={14} />
                                            </Link>
                                        )}
                                        <Link
                                            to="/deals"
                                            className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/22 bg-white/6 px-8 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-lg transition-all hover:bg-white/12 hover:translate-y-[-1px]"
                                        >
                                            View Details
                                        </Link>
                                    </motion.div>
                                </div>

                                {/* Right */}
                                <motion.div
                                    initial={shouldRunEntryAnimation ? { x: 40, opacity: 0 } : false}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.24, duration: 0.8 }}
                                    className="relative flex justify-center"
                                >
                                    <div className="relative w-full max-w-[490px] rounded-[2rem] border border-white/14 bg-white/10 p-3 shadow-[0_22px_42px_-28px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:rounded-[2.5rem] sm:p-4 lg:p-5">
                                        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/14 bg-white/8 p-3 sm:rounded-[1.85rem] sm:p-4">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_42%)]" />
                                            <div className="flex min-h-[290px] items-center justify-center sm:min-h-[360px]">
                                                <img
                                                    src={slide.image}
                                                    alt={slide.title}
                                                    className="max-h-[310px] w-full object-contain drop-shadow-[0_18px_38px_rgba(0,0,0,0.28)] transition-transform duration-700 group-hover:scale-[1.02] sm:max-h-[420px]"
                                                    loading={current === 0 ? 'eager' : 'lazy'}
                                                    fetchPriority={current === 0 ? 'high' : 'auto'}
                                                    decoding="async"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = NO_PRODUCT_IMAGE;
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {slide.store && (
                                            <div className="absolute -bottom-2.5 right-2.5 flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-1.5 shadow-md shadow-slate-200/50 sm:-bottom-3 sm:right-3 sm:rounded-[1rem]">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F8FAFC] p-1">
                                                    <img
                                                        src={`https://www.google.com/s2/favicons?domain=${slide.store?.toLowerCase() || 'amazon'}.com&sz=64`}
                                                        alt=""
                                                        className="h-full w-full object-contain"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[7px] font-black uppercase tracking-[0.16em] leading-none text-[#94A3B8]">
                                                        Marketplace
                                                    </span>
                                                    <span className="text-[10px] font-[1000] leading-tight text-[#0F172A] sm:text-[10px]">
                                                        {slide.store}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {slides.length > 1 && (
                    <>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                prevSlide();
                            }}
                            className="absolute left-4 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/18 bg-white/10 text-white/85 opacity-0 backdrop-blur-md transition-all hover:bg-white/18 group-hover:opacity-100 sm:flex"
                            aria-label="Previous slide"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                nextSlide();
                            }}
                            className="absolute right-4 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/18 bg-white/10 text-white/85 opacity-0 backdrop-blur-md transition-all hover:bg-white/18 group-hover:opacity-100 sm:flex"
                            aria-label="Next slide"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </>
                )}

                {slides.length > 1 && (
                    <div className="absolute left-1/2 z-20 flex -translate-x-1/2 gap-2" style={{ bottom: '13px' }}>
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setCurrent(index);
                                    setIsPaused(true);
                                }}
                                className="group/dot relative -m-1 p-2"
                                aria-label={`Go to slide ${index + 1}`}
                            >
                                <div
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                        index === current ? 'w-6.5 bg-white' : 'w-2 bg-white/28 group-hover/dot:bg-white/55'
                                    }`}
                                    style={{
                                        boxShadow: index === current ? '0 0 10px rgba(255,255,255,0.6)' : 'none',
                                        transform: index === current ? 'scale(1.03)' : 'scale(1)',
                                    }}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {showMobileStickyCta && (
                <div className="pointer-events-none fixed inset-x-0 bottom-[5.45rem] z-40 px-3 md:hidden">
                    {slide.isExternal ? (
                        <a
                            href={slide.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pointer-events-auto mx-auto flex h-[3.9rem] max-w-md items-center gap-3 rounded-[1.55rem] border border-white/10 bg-slate-950 px-3 text-white no-underline shadow-[0_22px_52px_-22px_rgba(2,6,23,0.95)] transition-transform active:scale-[0.98]"
                        >
                            <HeroStickyContent slide={slide} label="Grab Deal" />
                        </a>
                    ) : (
                        <Link
                            to={slide.href}
                            className="pointer-events-auto mx-auto flex h-[3.9rem] max-w-md items-center gap-3 rounded-[1.55rem] border border-white/10 bg-slate-950 px-3 text-white shadow-[0_22px_52px_-22px_rgba(2,6,23,0.95)] transition-transform active:scale-[0.98]"
                        >
                            <HeroStickyContent slide={slide} label="Grab Deal" />
                        </Link>
                    )}
                </div>
            )}

            <div className="border-b border-[#E2E8F0] bg-white">
                <div className="mx-auto grid max-w-7xl grid-cols-2 items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#64748B] md:flex md:flex-wrap md:justify-between md:gap-6 md:px-6 md:py-4 lg:px-8">
                    {[
                        { icon: ShieldCheck, label: `${slides.length} live hero deals`, color: 'text-[#22C55E]' },
                        { icon: Zap, label: `${storeCount || 1} active stores`, color: 'text-[#FF6A00]' },
                        { icon: Sparkles, label: 'Top discounts first', color: 'text-[#64748B]' },
                        { icon: Clock, label: 'Backed by current catalog', color: 'text-[#64748B]' },
                    ].map(({ icon: Icon, label, color }) => (
                        <div key={label} className="flex items-center gap-1.5 rounded-xl bg-[#F8FAFC] px-2.5 py-2 md:bg-transparent md:px-0 md:py-0">
                            <Icon size={15} className={color} />
                            <span className="text-[9px] font-bold leading-tight md:text-xs">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Hero;
