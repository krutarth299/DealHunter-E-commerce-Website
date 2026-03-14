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
        <section className="w-full bg-white overflow-hidden pt-0">
            {/* ── Main Slide Banner ── */}
            <div className="relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className={`relative bg-gradient-to-br ${slide.bg} min-h-[420px] md:min-h-[480px] flex items-center overflow-hidden`}
                    >
                        {/* Mesh Gradients */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/3" />
                        
                        {/* Grid noise fallback */}
                        <div className="absolute inset-0 opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />

                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative z-10 w-full">
                            {/* ── Text side ── */}
                            <div className="flex-[1.2] text-white space-y-4 md:space-y-6 text-center md:text-left">
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex items-center gap-2 justify-center md:justify-start"
                                >
                                    <span className="bg-white/10 backdrop-blur-lg text-white text-[8px] md:text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-[0.2em] border border-white/20 shadow-xl">
                                        {slide.badge}
                                    </span>
                                    <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2 py-1 rounded-md border border-emerald-500/30">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-50">Pulse Live</span>
                                    </div>
                                </motion.div>

                                <motion.h1
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-[1000] leading-tight tracking-tight"
                                >
                                    {slide.title.split(' ').map((word, i) => (
                                        <span key={i} className={i % 2 === 0 ? 'text-white' : 'text-white/80 block md:inline'}>
                                            {word}{' '}
                                        </span>
                                    ))}
                                </motion.h1>

                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-white/60 text-xs md:text-base max-w-lg mx-auto md:mx-0 font-medium leading-relaxed"
                                >
                                    {slide.sub}
                                </motion.p>

                                {/* Price Row */}
                                {(slide.price || slide.discount) && (
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex flex-wrap items-center gap-4 justify-center md:justify-start"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-white/40 text-[8px] font-black uppercase tracking-widest mb-1">Live Valuation</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter">{slide.price}</span>
                                                {slide.mrp && (
                                                    <span className="text-base md:text-lg font-bold text-white/30 line-through decoration-white/40">{slide.mrp}</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {slide.discountNum && (
                                            <div className="bg-yellow-400 rotate-3 px-2 py-1 rounded-xl shadow-lg shadow-yellow-500/20">
                                                <span className="text-yellow-900 font-black text-lg md:text-xl tracking-tighter">
                                                    -{slide.discountNum}%
                                                </span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                <motion.div
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex flex-wrap gap-2.5 items-center justify-center md:justify-start pt-1"
                                >
                                    <Link
                                        to={slide.href}
                                        className="h-12 px-6 md:h-14 md:px-8 bg-white rounded-xl text-slate-900 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] flex items-center gap-2 hover:translate-y-[-2px] active:translate-y-[0] transition-all shadow-xl shadow-black/10 group overflow-hidden relative"
                                    >
                                        <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                        <span className="relative z-10 group-hover:text-white transition-colors">Access Deal</span>
                                        <ArrowRight size={14} className="relative z-10 group-hover:text-white transition-colors group-hover:translate-x-1" />
                                    </Link>
                                    
                                    <div className="h-12 md:h-14 px-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                                            <ShieldCheck size={14} className="text-white opacity-60" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white/40 text-[7px] font-black uppercase tracking-widest leading-none mb-1">Authenticity</span>
                                            <span className="text-white text-[10px] font-black tracking-tight">{slide.stat}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* ── Visual side ── */}
                            <motion.div
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="flex-1 w-full md:w-auto flex justify-center mt-8 md:mt-0 relative"
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
                                        <div className="relative w-52 h-52 sm:w-64 sm:h-64 lg:w-[340px] lg:h-[340px] rounded-[3rem] bg-gradient-to-br from-white/20 to-white/5 border border-white/30 backdrop-blur-2xl flex items-center justify-center p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]">
                                            <img
                                                src={slide.image}
                                                alt={slide.title}
                                                className="w-full h-full object-contain drop-shadow-[0_15px_40px_rgba(0,0,0,0.4)] transform group-hover:scale-105 transition-transform duration-700"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                        
                                        {/* Store Float Badge */}
                                        {slide.store && (
                                            <motion.div 
                                                animate={{ y: [0, 8, 0] }}
                                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                                                className="absolute -bottom-4 -right-4 lg:-bottom-6 lg:-right-6 bg-white p-4 rounded-[1.5rem] shadow-2xl border border-slate-100 flex items-center gap-2"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center p-1.5">
                                                    <img 
                                                        src={`https://www.google.com/s2/favicons?domain=${slide.store?.toLowerCase() || 'amazon'}.com&sz=64`} 
                                                        alt="" 
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Marketplace</span>
                                                    <span className="text-xs font-[1000] text-slate-900">{slide.store}</span>
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
