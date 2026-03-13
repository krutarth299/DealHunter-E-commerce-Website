import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, TrendingDown, Zap, ShieldCheck, Clock, ExternalLink, Tag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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
const Hero = ({ deals = [] }) => {
    const [current, setCurrent] = useState(0);
    const navigate = useNavigate();

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
            badge: getDiscountNum(deal.discount) >= 50 ? '🔥 Hot Deal' : '⚡ Featured Deal',
            title: deal.title,
            sub: `Available at ${deal.store || 'Top Stores'} · Verified price drop`,
            cta: 'Grab This Deal',
            href: deal.link || '/deals',
            isExternal: !!deal.link,
            bg: getBg(deal.category),
            image: deal.image || (deal.images && deal.images[0]) || null,
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

    useEffect(() => {
        if (slides.length <= 1) return;
        const t = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5500);
        return () => clearInterval(t);
    }, [slides.length]);

    const slide = slides[current] || slides[0];

    return (
        <section className="w-full bg-white overflow-hidden pt-[80px] md:pt-[120px]">
            {/* ── Main Slide Banner ── */}
            <div className="relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className={`relative bg-gradient-to-br ${slide.bg} min-h-[520px] sm:min-h-[480px] md:min-h-[540px] flex items-center`}
                    >
                        {/* Dot pattern */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }} />

                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-20 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative z-10 w-full">
                            {/* ── Text side ── */}
                            <div className="flex-1 text-white space-y-5 md:space-y-7 text-center md:text-left">
                                <motion.span
                                    initial={{ y: -10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="inline-block bg-white/20 backdrop-blur-sm text-white text-[10px] md:text-xs font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-full uppercase tracking-widest border border-white/30"
                                >
                                    {slide.badge}
                                </motion.span>

                                <motion.h1
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.15 }}
                                    className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight line-clamp-2 md:line-clamp-3"
                                >
                                    {slide.title}
                                </motion.h1>

                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-white/80 text-sm md:text-lg max-w-lg mx-auto md:mx-0 font-medium leading-relaxed line-clamp-2 md:line-clamp-none"
                                >
                                    {slide.sub}
                                </motion.p>

                                {/* Price Row */}
                                {(slide.price || slide.discount) && (
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.25 }}
                                        className="flex flex-wrap items-center gap-4 justify-center md:justify-start"
                                    >
                                        {slide.price && (
                                            <span className="text-4xl font-black text-white tracking-tighter">{slide.price}</span>
                                        )}
                                        {slide.mrp && (
                                            <span className="text-xl font-bold text-white/40 line-through">{slide.mrp}</span>
                                        )}
                                        {slide.discountNum && (
                                            <span className="bg-yellow-400 text-yellow-900 font-black text-sm px-3 py-1.5 rounded-full shadow-lg">
                                                {slide.discountNum}% OFF
                                            </span>
                                        )}
                                    </motion.div>
                                )}

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex flex-wrap gap-3 md:gap-4 items-center justify-center md:justify-start"
                                >
                                    {slide.isExternal ? (
                                        <a
                                            href={slide.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-12 px-6 md:h-16 md:px-10 bg-white rounded-2xl text-slate-900 font-black text-xs md:text-sm uppercase tracking-widest flex items-center gap-2 md:gap-3 hover:scale-105 active:scale-95 transition-transform shadow-xl group"
                                        >
                                            {slide.cta}
                                            <ExternalLink size={16} className="group-hover:rotate-12 transition-transform" />
                                        </a>
                                    ) : (
                                        <Link
                                            to={slide.href}
                                            className="h-12 px-6 md:h-16 md:px-10 bg-white rounded-2xl text-slate-900 font-black text-xs md:text-sm uppercase tracking-widest flex items-center gap-2 md:gap-3 hover:scale-105 active:scale-95 transition-transform shadow-xl group"
                                        >
                                            {slide.cta}
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    )}
                                    <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 md:px-5 md:py-3">
                                        <ShieldCheck size={14} className="text-white/60" />
                                        <span className="text-white text-[11px] md:text-sm font-bold">{slide.stat}</span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* ── Visual side ── */}
                            <motion.div
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: 'spring', damping: 16 }}
                                className="flex-shrink-0 w-full md:w-auto flex justify-center mt-6 md:mt-0"
                            >
                                {slide.image ? (
                                    // Real product image
                                    <motion.div
                                        animate={{ y: [0, -12, 0] }}
                                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                                        className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80"
                                    >
                                        <div className="w-full h-full rounded-[2rem] md:rounded-[3rem] bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center p-6 md:p-8 shadow-2xl">
                                            <img
                                                src={slide.image}
                                                alt={slide.title}
                                                className="w-full h-full object-contain drop-shadow-2xl"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                        {/* Store badge */}
                                        {slide.store && (
                                            <div className="absolute -bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 bg-white text-slate-900 font-black text-[10px] md:text-xs px-4 py-1.5 md:px-5 md:py-2 rounded-full shadow-xl border border-slate-100 whitespace-nowrap">
                                                📦 {slide.store}
                                            </div>
                                        )}
                                        {/* Discount badge */}
                                        {slide.discountNum && (
                                            <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-14 h-14 md:w-20 md:h-20 bg-yellow-400 rounded-full flex flex-col items-center justify-center shadow-xl">
                                                <span className="text-yellow-900 font-black text-sm md:text-lg leading-none">{slide.discountNum}%</span>
                                                <span className="text-yellow-900 font-bold text-[8px] md:text-[10px] uppercase">OFF</span>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    // Emoji fallback
                                    <motion.div
                                        animate={{ y: [0, -16, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                        className="w-64 h-64 rounded-[3rem] bg-white/10 border border-white/20 backdrop-blur-xl flex flex-col items-center justify-center gap-5 shadow-2xl"
                                    >
                                        <span className="text-8xl">{slide.emoji || '🛍️'}</span>
                                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-white text-xs font-bold">Live Deals Active</span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* ── Slide dots ── */}
                {slides.length > 1 && (
                    <div 
                        className="absolute left-1/2 -translate-x-1/2 flex z-20" 
                        style={{ bottom: '16px', gap: '8px' }}
                    >
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                style={{
                                    width: i === current ? '8px' : '4px',
                                    height: '4px',
                                    minHeight: '0',
                                    borderRadius: '9999px',
                                    backgroundColor: i === current ? 'white' : 'rgba(255, 255, 255, 0.4)',
                                    transition: 'all 0.3s ease',
                                    border: 'none',
                                    padding: 0,
                                    boxShadow: i === current ? '0 4px 8px -2px rgba(0, 0, 0, 0.2)' : 'none'
                                }}
                                aria-label={`Go to slide ${i + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Trust Strip ── */}
            <div className="border-b border-slate-100 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-center md:justify-between gap-6 text-sm font-semibold text-slate-500">
                    {[
                        { icon: ShieldCheck, label: '100% Verified Deals', color: 'text-emerald-500' },
                        { icon: Zap, label: 'Real-time Price Sync', color: 'text-orange-500' },
                        { icon: TrendingDown, label: 'Best Price Guarantee', color: 'text-blue-500' },
                        { icon: Clock, label: 'Updated Every 5 Min', color: 'text-violet-500' },
                    ].map(({ icon: Icon, label, color }) => (
                        <div key={label} className="flex items-center gap-2">
                            <Icon size={16} className={color} />
                            <span className="text-xs font-bold">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Hero;
