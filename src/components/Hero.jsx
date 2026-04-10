import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, TrendingDown, Zap, ShieldCheck, Clock, ExternalLink, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMainProductImage, NO_PRODUCT_IMAGE } from '../utils/imageOptimizer';
import { getDisplayTitle } from '../utils/productTitles';
import useHasHydrated from '../hooks/useHasHydrated';

/* ─── helpers ─────────────────────────────────────── */
const formatPrice = (p) => {
    if (!p && p !== 0) return null;
    const num = parseFloat(String(p).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : `₹${num.toLocaleString('en-IN')}`;
};

const getDiscountNum = (d) => {
    if (!d) return null;
    const match = String(d).match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
};

/* Category → gradient color mapping */
const CATEGORY_BG = {
    Electronics: 'from-orange-500 to-red-600',
    Fashion: 'from-violet-600 to-purple-700',
    Gaming: 'from-blue-600 to-indigo-700',
    Grocery: 'from-emerald-600 to-teal-700',
    Food: 'from-amber-500 to-orange-600',
    Travel: 'from-sky-500 to-blue-600',
    Audio: 'from-rose-500 to-pink-600',
    Default: 'from-slate-700 to-slate-900',
};

const getBg = (category) => {
    if (!category) return CATEGORY_BG.Default;
    const key = Object.keys(CATEGORY_BG).find(k => category.toLowerCase().includes(k.toLowerCase()));
    return key ? CATEGORY_BG[key] : CATEGORY_BG.Default;
};

/* ─── Fallback static slides (used only when no deals present) ─── */
const FALLBACK_SLIDES = [
    {
        badge: '🔥 Today\'s Hot Deal',
        title: 'Save Big on Electronics',
        sub: 'Up to 80% off on laptops, phones & accessories from top brands.',
        cta: 'Shop Electronics',
        href: '/deals?category=Electronics',
        bg: 'from-orange-500 to-red-600',
        image: null,
        emoji: '💻',
        stat: '60+ fresh drops today',
        price: null,
        mrp: null,
        discount: null,
        store: null,
    },
    {
        badge: '⚡ Flash Sale',
        title: 'Premium Fashion Deals',
        sub: 'Designer brands slashed up to 70%. New arrivals every hour.',
        cta: 'Browse Fashion',
        href: '/deals?category=Fashion',
        bg: 'from-violet-600 to-purple-700',
        image: null,
        emoji: '👗',
        stat: '200+ styles on sale',
        price: null,
        mrp: null,
        discount: null,
        store: null,
    },
];

/* ─── Component ───────────────────────────────────── */
const HeroStickyContent = ({ slide, label }) => (
    <>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/10">
            {slide.image ? (
                <img src={slide.image} alt="" className="h-full w-full object-contain" />
            ) : (
                <ShoppingBag size={22} className="text-orange-300" />
            )}
        </div>
        <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                {slide.store || 'DealSphere'}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black leading-none tracking-tight text-white">
                    {slide.price || 'Live Deal'}
                </span>
                {slide.discountNum && (
                    <span className="rounded-lg bg-emerald-400/15 px-2 py-0.5 text-[9px] font-black text-emerald-200">
                        {slide.discountNum}% OFF
                    </span>
                )}
            </div>
        </div>
        <div className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-950 shadow-lg">
            {label}
            <ArrowRight size={14} strokeWidth={3} />
        </div>
    </>
);

const Hero = ({ deals = [] }) => {
    const [current, setCurrent] = useState(0);
    const hasHydrated = useHasHydrated();
    const shouldRunEntryAnimation = hasHydrated || current > 0;

    /* Pick the top deals with images to feature in the slider.
       Prioritise deals that have an image, a price, and a good discount. */
    const featuredDeals = React.useMemo(() => {
        if (!Array.isArray(deals) || deals.length === 0) return null;

        const withImages = deals.filter(d => d && (d.image || (d.images && d.images.length > 0)));
        // Sort: hot discount first, then just take up to 5
        const sorted = [...withImages].sort((a, b) => {
            const da = getDiscountNum(a.discount) || 0;
            const db = getDiscountNum(b.discount) || 0;
            return db - da;
        });

        return sorted.slice(0, 5).length > 0 ? sorted.slice(0, 5) : null;
    }, [deals]);

    const slides = featuredDeals
        ? featuredDeals.map(deal => ({
            badge: getDiscountNum(deal.discount) >= 50 ? 'Hot Deal' : 'Best Pick',
            title: getDisplayTitle(deal.displayTitle || deal.title),
            rawTitle: deal.originalTitle || deal.rawTitle || deal.title,
            sub: `Available at ${deal.store || 'Top Stores'} · Verified price drop`,
            cta: 'Grab Deal',
            href: (deal.id || deal._id) ? `/product/${deal.id || deal._id}` : '/deals',
            isExternal: false,
            bg: getBg(deal.category),
            image: getMainProductImage(deal),
            emoji: null,
            stat: deal.store ? `Verified on ${deal.store}` : 'Verified deal',
            price: formatPrice(deal.price),
            mrp: formatPrice(deal.originalPrice),
            discount: deal.discount ? String(deal.discount) : null,
            discountNum: getDiscountNum(deal.discount),
            store: deal.store,
            category: deal.category,
        }))
        : FALLBACK_SLIDES;

    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (slides.length <= 1 || isPaused) return;
        const t = setInterval(() => {
            setCurrent(p => (p + 1) % slides.length);
        }, 5500);
        return () => clearInterval(t);
    }, [slides.length, isPaused]);

    const nextSlide = () => setCurrent(p => (p + 1) % slides.length);
    const prevSlide = () => setCurrent(p => (p - 1 + slides.length) % slides.length);

    const slide = slides[current] || slides[0];
    const showMobileStickyCta = Boolean(slide && (slide.price || slide.href));
    const mobileCtaLabel = slide?.price ? 'Grab Deal' : slide?.cta || 'Grab Deal';

    return (
        <section 
            className="w-full bg-white overflow-hidden pt-0 group select-none relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* ── Main Slide Banner ── */}
            <div className="relative overflow-hidden min-h-[500px] sm:min-h-[620px] md:min-h-[560px] lg:min-h-[620px]">
                <AnimatePresence>
                    <motion.div
                        key={current}
                        initial={shouldRunEntryAnimation ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = offset.x;
                            if (swipe < -50) nextSlide();
                            else if (swipe > 50) prevSlide();
                        }}
                        className={`absolute inset-0 bg-gradient-to-br ${slide.bg} flex items-start sm:items-center overflow-hidden cursor-grab active:cursor-grabbing`}
                    >
                        {/* Mesh Gradients */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/3" />
                        
                        {/* Grid noise fallback */}
                        <div className="absolute inset-0 opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />

                        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 pt-10 pb-16 sm:pt-20 md:pt-20 md:pb-20 lg:pt-24 flex flex-col md:flex-row items-center justify-center md:justify-between gap-5 sm:gap-8 md:gap-12 lg:gap-16 relative z-10 w-full min-h-[500px] sm:min-h-[620px] md:min-h-[560px] lg:min-h-[620px]">
                            {/* ── Text side ── */}
                            <div className="w-full flex-[1.35] text-white space-y-3.5 md:space-y-5 lg:space-y-6 text-center md:text-left md:min-w-0">
                                <motion.div
                                    initial={shouldRunEntryAnimation ? { x: -20, opacity: 0 } : false}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex items-center gap-2 justify-center md:justify-start"
                                >
                                    <span className="bg-white/12 backdrop-blur-lg text-white text-[8px] md:text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em] border border-white/20 shadow-xl inline-flex items-center gap-1.5">
                                        <Zap size={12} fill="currentColor" />
                                        {slide.badge}
                                    </span>
                                    <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2 py-1 rounded-md border border-emerald-500/30">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-50">Pulse Live</span>
                                    </div>
                                </motion.div>

                                <motion.h1
                                    initial={shouldRunEntryAnimation ? { y: 20, opacity: 0 } : false}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    title={slide.rawTitle || slide.title}
                                    className="line-clamp-2 mx-auto md:mx-0 w-full max-w-[24ch] text-[clamp(1.75rem,7.4vw,3.25rem)] md:text-[clamp(2.6rem,4.9vw,4.9rem)] font-[1000] leading-[1.16] tracking-[-0.055em] py-1 text-balance"
                                >
                                    {slide.title}
                                </motion.h1>

                                {slide.store && (
                                    <motion.div
                                        initial={shouldRunEntryAnimation ? { y: 10, opacity: 0 } : false}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.15 }}
                                        className="mx-auto flex w-fit items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-white ring-1 ring-white/15 md:hidden"
                                    >
                                        <span className="text-[8px] font-black uppercase tracking-[0.22em] text-white/50">Marketplace</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{slide.store}</span>
                                    </motion.div>
                                )}

                                <motion.p
                                    initial={shouldRunEntryAnimation ? { y: 20, opacity: 0 } : false}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="line-clamp-2 text-white/75 text-xs sm:text-sm md:text-base max-w-xl mx-auto md:mx-0 font-semibold leading-relaxed"
                                >
                                    {slide.sub}
                                </motion.p>

                                {/* Price Row */}
                                {(slide.price || slide.discount) && (
                                    <motion.div
                                        initial={shouldRunEntryAnimation ? { y: 20, opacity: 0 } : false}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex flex-wrap items-center gap-4 justify-center md:justify-start"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-white/45 text-[7px] md:text-[8px] font-black uppercase tracking-widest mb-1">Deal Price</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter">{slide.price}</span>
                                                {slide.mrp && (
                                                    <span className="text-sm md:text-lg font-bold text-white/30 line-through decoration-white/40">{slide.mrp}</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {slide.discountNum && (
                                            <div className="bg-yellow-400 rotate-3 px-3 py-1.5 rounded-xl shadow-lg shadow-yellow-500/20">
                                                <span className="text-yellow-900 font-black text-lg md:text-xl tracking-tighter">
                                                    -{slide.discountNum}%
                                                </span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                <motion.div
                                    initial={shouldRunEntryAnimation ? { y: 30, opacity: 0 } : false}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex flex-wrap gap-2.5 items-center justify-center md:justify-start pt-0 md:pt-1"
                                >
                                    {slide.isExternal ? (
                                        <a
                                            href={slide.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-12 px-7 md:h-14 md:px-9 bg-white rounded-2xl text-slate-950 font-black text-[10px] md:text-xs uppercase tracking-[0.16em] flex items-center gap-2.5 hover:translate-y-[-3px] active:translate-y-[0] transition-all shadow-2xl shadow-black/20 group/cta overflow-hidden relative no-underline"
                                        >
                                            <div className="absolute inset-0 bg-slate-950 translate-y-full group-hover/cta:translate-y-0 transition-transform duration-500" />
                                            <span className="relative z-10 group-hover/cta:text-white transition-colors">{slide.cta}</span>
                                            <ExternalLink size={14} className="relative z-10 group-hover/cta:text-white transition-colors group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                                        </a>
                                    ) : (
                                        <Link
                                            to={slide.href}
                                            className="h-12 px-7 md:h-14 md:px-9 bg-white rounded-2xl text-slate-950 font-black text-[10px] md:text-xs uppercase tracking-[0.16em] flex items-center gap-2.5 hover:translate-y-[-3px] active:translate-y-[0] transition-all shadow-2xl shadow-black/20 group/cta overflow-hidden relative"
                                        >
                                            <div className="absolute inset-0 bg-slate-950 translate-y-full group-hover/cta:translate-y-0 transition-transform duration-500" />
                                            <span className="relative z-10 group-hover/cta:text-white transition-colors">{slide.cta}</span>
                                            <ArrowRight size={14} className="relative z-10 group-hover/cta:text-white transition-colors group-hover/cta:translate-x-1" />
                                        </Link>
                                    )}
                                    
                                    <div className="h-11 md:h-14 px-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl hidden sm:flex items-center gap-2.5">
                                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                                            <ShieldCheck size={13} className="text-white opacity-60" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white/40 text-[7px] font-black uppercase tracking-widest leading-none mb-0.5">Authenticity</span>
                                            <span className="text-white text-[9px] font-black tracking-tight">{slide.stat}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* ── Visual side ── */}
                            <motion.div
                                initial={shouldRunEntryAnimation ? { x: 50, opacity: 0 } : false}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="flex-[0.95] w-full md:w-auto flex justify-center mt-0 relative md:min-w-0"
                            >
                                {/* Decorative elements */}
                                <div className="absolute -inset-8 bg-white/20 blur-[80px] rounded-full opacity-30 animate-pulse" />
                                
                                {slide.image ? (
                                    <motion.div
                                        animate={{ 
                                            y: [0, -15, 0],
                                            rotate: [-0.5, 0.5, -0.5]
                                        }}
                                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                                        className="relative group"
                                    >
                                        <div className="relative w-44 h-44 xs:w-52 xs:h-52 sm:w-72 sm:h-72 md:w-72 md:h-72 lg:w-[380px] lg:h-[380px] xl:w-[420px] xl:h-[420px] rounded-[2rem] md:rounded-[3rem] bg-gradient-to-br from-white/25 to-white/5 border border-white/30 backdrop-blur-2xl flex items-center justify-center p-5 sm:p-7 md:p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]">
                                            <img
                                                src={slide.image}
                                                alt={slide.title}
                                                className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-700"
                                                onError={(e) => { 
                                                    e.target.onerror = null; 
                                                    e.target.src = NO_PRODUCT_IMAGE;
                                                }}
                                            />
                                        </div>
                                        
                                        {/* Store Float Badge */}
                                        {slide.store && (
                                            <motion.div 
                                                animate={{ y: [0, 8, 0] }}
                                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                                                className="absolute bottom-0 -right-2 md:-bottom-4 md:-right-4 lg:-bottom-6 lg:-right-6 bg-white p-2.5 md:p-4 rounded-2xl md:rounded-[1.5rem] shadow-2xl border border-slate-100 flex items-center gap-2"
                                            >
                                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-50 flex items-center justify-center p-1 md:p-1.5">
                                                    <img 
                                                        src={`https://www.google.com/s2/favicons?domain=${slide.store?.toLowerCase() || 'amazon'}.com&sz=64`} 
                                                        alt="" 
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Marketplace</span>
                                                    <span className="text-[10px] md:text-xs font-[1000] text-slate-900">{slide.store}</span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        animate={{ y: [0, -15, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                        className="w-64 h-64 rounded-[3rem] bg-white/10 border border-white/20 backdrop-blur-2xl flex flex-col items-center justify-center gap-6 shadow-2xl"
                                    >
                                        <span className="text-[90px] drop-shadow-2xl">{slide.emoji || '🛍️'}</span>
                                        <div className="flex items-center gap-2 bg-white/20 px-5 py-2 rounded-xl">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                            <span className="text-white text-[11px] font-black uppercase tracking-widest">Live Updates</span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* ── Navigation Arrows ── */}
                {slides.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.preventDefault(); prevSlide(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 hidden sm:flex"
                            aria-label="Previous slide"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); nextSlide(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 hidden sm:flex"
                            aria-label="Next slide"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}

                {/* ── Slide dots ── */}
                {slides.length > 1 && (
                    <div 
                        className="absolute left-1/2 -translate-x-1/2 flex z-20" 
                        style={{ bottom: '16px', gap: '8px' }}
                    >
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setCurrent(i);
                                    setIsPaused(true); // Pause auto-rotation when user manually interacts
                                }}
                                className="group/dot relative p-3 -m-1" // Increased hit area
                                aria-label={`Go to slide ${i + 1}`}
                            >
                                <div 
                                    className={`h-2 rounded-full transition-all duration-500 ${i === current ? 'w-8 bg-white' : 'w-2 bg-white/30 group-hover/dot:bg-white/60'}`}
                                    style={{ 
                                        boxShadow: i === current ? '0 0 15px rgba(255,255,255,0.8)' : 'none',
                                        transform: i === current ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                />
                                {i === current && (
                                    <motion.div 
                                        layoutId="activeDot"
                                        className="absolute inset-0 rounded-full border border-white/40 scale-150"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Trust Strip ── */}
            {showMobileStickyCta && (
                <div className="fixed inset-x-0 bottom-[6.1rem] z-40 px-4 md:hidden pointer-events-none">
                    {slide.isExternal ? (
                        <a
                            href={slide.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pointer-events-auto mx-auto flex h-[4.35rem] max-w-md items-center gap-3 rounded-[1.75rem] border border-white/10 bg-slate-950 px-3.5 text-white shadow-[0_24px_60px_-22px_rgba(2,6,23,0.95)] no-underline transition-transform active:scale-[0.98]"
                        >
                            <HeroStickyContent slide={slide} label={mobileCtaLabel} />
                        </a>
                    ) : (
                        <Link
                            to={slide.href}
                            className="pointer-events-auto mx-auto flex h-[4.35rem] max-w-md items-center gap-3 rounded-[1.75rem] border border-white/10 bg-slate-950 px-3.5 text-white shadow-[0_24px_60px_-22px_rgba(2,6,23,0.95)] transition-transform active:scale-[0.98]"
                        >
                            <HeroStickyContent slide={slide} label={mobileCtaLabel} />
                        </Link>
                    )}
                </div>
            )}

            <div className="border-b border-slate-100 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-2 md:flex md:flex-wrap items-center justify-center md:justify-between gap-3 md:gap-6 text-sm font-semibold text-slate-500">
                    {[
                        { icon: ShieldCheck, label: '100% Verified Deals', color: 'text-emerald-500' },
                        { icon: Zap, label: 'Real-time Price Sync', color: 'text-orange-500' },
                        { icon: TrendingDown, label: 'Best Price Guarantee', color: 'text-blue-500' },
                        { icon: Clock, label: 'Updated Every 5 Min', color: 'text-violet-500' },
                    ].map(({ icon: Icon, label, color }) => (
                        <div key={label} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 md:bg-transparent md:px-0 md:py-0">
                            <Icon size={18} className={color} />
                            <span className="text-[10px] leading-tight md:text-xs font-bold">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Hero;
