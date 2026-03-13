import React, { useState, useEffect } from 'react';
import DealsGrid from '../components/DealsGrid';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import {
    Sparkles, TrendingDown, ArrowRight, Zap, ShieldCheck, Store, ChevronRight, Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import Hero from '../components/Hero';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { CATEGORY_MAP, FEATURED_CATEGORIES, getCategoryStyle, normalizeCategory } from '../utils/categoryConstants';

// Shared category styles are now imported from ../utils/categoryConstants

const DEFAULT_CAT_STYLE = { icon: Package, bg: 'bg-slate-50', icon_color: 'text-slate-500', border: 'border-slate-200' };

const STORES = [
    { name: 'Amazon', logo: 'https://www.google.com/s2/favicons?domain=amazon.in&sz=128', id: 'amazon' },
    { name: 'Flipkart', logo: 'https://www.google.com/s2/favicons?domain=flipkart.com&sz=128', id: 'flipkart' },
    { name: 'Myntra', logo: 'https://www.google.com/s2/favicons?domain=myntra.com&sz=128', id: 'myntra' },
    { name: 'Meesho', logo: 'https://www.google.com/s2/favicons?domain=meesho.com&sz=128', id: 'meesho' },
    { name: 'Croma', logo: 'https://www.google.com/s2/favicons?domain=croma.com&sz=128', id: 'croma' },
    { name: 'Nykaa', logo: 'https://www.google.com/s2/favicons?domain=nykaa.com&sz=128', id: 'nykaa' },
];

// Shared categories are now imported from ../utils/categoryConstants

const Home = ({ deals, user, onSearch, setIsAddDealOpen, wishlist, toggleWishlist, apiBase }) => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState(FEATURED_CATEGORIES);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const baseUrl = apiBase ? apiBase.replace('/user', '') : 'http://localhost:5000/api';
                const r = await fetch(`${baseUrl}/deals/categories`);
                if (r.ok) {
                    const data = await r.json();
                    if (data && data.length > 0) {
                        const normalized = data.map(c => normalizeCategory(c)).filter(c => c && c.trim() !== '');
                        // Merge and ensure consistency with Deals page
                        const merged = [...new Set([...FEATURED_CATEGORIES, ...normalized])];
                        setCategories(merged);
                    }
                }
            } catch (err) {
                console.error("Home Categories fetch error:", err);
            }
        };
        fetchCategories();
    }, [apiBase]);

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900 overflow-x-hidden">
            <SEO title="DealHunter — Best Deals, Coupons & Offers" description="Discover the best deals, discounts and coupons verified in real-time." />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main className="flex-grow pb-24 md:pb-0">
                <Hero deals={deals} />

                {/* ─── Shop by Category ─── */}
                <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                        <div className="space-y-2">
                            <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-50 px-3 py-1 rounded-full border border-orange-100 mb-2 inline-block">Curated Collections</span>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Shop by Category</h2>
                            <p className="text-slate-400 text-sm font-medium">Explore hand-picked deals across all your favorite categories.</p>
                        </div>
                        <motion.button 
                            whileHover={{ x: 5 }}
                            onClick={() => navigate('/deals')} 
                            className="flex items-center gap-2 text-sm font-black text-slate-500 hover:text-orange-500 transition-colors group"
                        >
                            VIEW ALL <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all"><ArrowRight size={14} /></div>
                        </motion.button>
                    </div>

                    {/* Desktop/Tablet Grid */}
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-x-4 gap-y-10 sm:gap-x-6">
                        {categories.map((catName, i) => {
                            const style = getCategoryStyle(catName);
                            const Icon = style.icon;
                            return (
                                <motion.button
                                    key={catName}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.03, duration: 0.4, ease: "easeOut" }}
                                    whileHover={{ y: -8 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/deals?category=' + encodeURIComponent(catName))}
                                    className="flex flex-col items-center group cursor-pointer"
                                >
                                    <div className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full ${style.bg} border-2 ${style.border} flex items-center justify-center mb-4 transition-all duration-300 group-hover:shadow-2xl ${style.shadow} group-hover:border-transparent overflow-hidden`}>
                                        {/* Background Glass Shine */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                        
                                        <div className={`transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 ease-out p-1`}>
                                            <Icon size={32} className={`${style.icon_color} sm:w-10 sm:h-10`} strokeWidth={1.5} />
                                        </div>
                                        
                                        {/* Hover Indicator */}
                                        <div className="absolute bottom-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 p-1 rounded-full backdrop-blur-sm">
                                            <ChevronRight size={12} className={style.icon_color} />
                                        </div>
                                    </div>
                                    <span className="text-[10px] sm:text-[11px] font-black text-slate-700 text-center uppercase tracking-wider group-hover:text-orange-500 transition-colors px-1 leading-tight min-h-[2.5rem] flex items-center justify-center">
                                        {catName.replace(' & ', '\n& ')}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                    
                    {/* Mobile Hint */}
                    <div className="mt-8 flex items-center justify-center lg:hidden">
                        <div className="h-[1px] flex-1 bg-slate-100" />
                        <span className="px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Scroll to explore</span>
                        <div className="h-[1px] flex-1 bg-slate-100" />
                    </div>
                </section>

                {/* ─── Today's Hot Picks ─── */}
                <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-10 rounded-full bg-orange-500" />
                            <div>
                                <p className="text-orange-500 text-xs font-black uppercase tracking-widest mb-0.5">Live</p>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Today's Hot Picks</h2>
                            </div>
                        </div>
                        <button onClick={() => navigate('/deals')} className="h-12 px-8 rounded-2xl bg-orange-500 text-white font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20">
                            All Deals <ArrowRight size={16} />
                        </button>
                    </div>
                    <DealsGrid deals={deals.slice(0, 8)} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                </section>

                {/* ─── Partner Stores Banner ─── */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto bg-gradient-to-r from-slate-900 to-slate-800 rounded-[3rem] overflow-hidden relative">
                        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 0.4px, transparent 0.4px)', backgroundSize: '24px 24px' }} />

                        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-20 p-12 md:p-20">
                            <div className="flex-1 text-white text-center lg:text-left space-y-8">
                                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-xs font-bold text-white/60 uppercase tracking-widest">
                                    <Store size={14} /> Partner Network
                                </div>
                                <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.85]">
                                    Top Trusted <br />
                                    <span className="text-orange-400">Stores.</span>
                                </h2>
                                <p className="text-white/50 text-lg font-medium max-w-md leading-relaxed">
                                    We partner with India's best marketplaces to bring you exclusive, verified deals in one place.
                                </p>
                                <button onClick={() => navigate('/stores')} className="h-16 px-12 rounded-2xl bg-orange-500 text-white font-black text-sm uppercase tracking-widest hover:bg-orange-400 transition-colors flex items-center gap-3 shadow-xl shadow-orange-500/30 mx-auto lg:mx-0 group">
                                    Explore Partners <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            <div className="flex-1 grid grid-cols-3 gap-4">
                                {STORES.map((s) => (
                                    <motion.div
                                        key={s.id}
                                        whileHover={{ y: -8, scale: 1.05 }}
                                        className="aspect-square bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 p-6 cursor-pointer hover:bg-white/10 transition-colors group"
                                        onClick={() => navigate('/deals?category=' + s.id)}
                                    >
                                        <img src={s.logo} alt={s.name} className="w-12 h-12 object-contain" />
                                        <span className="text-white/40 text-xs font-bold group-hover:text-white/80 transition-colors">{s.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Why DealHunter ─── */}
                <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-black text-slate-900 text-center mb-16 tracking-tight">Why DealHunter?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: ShieldCheck, color: 'bg-emerald-500', title: 'Verified Deals Only', desc: 'Every deal is manually reviewed and verified before going live on our platform.' },
                            { icon: Zap, color: 'bg-orange-500', title: 'Real-time Price Watch', desc: 'Our bots scan millions of product pages every 5 minutes to catch every price drop.' },
                            { icon: TrendingDown, color: 'bg-blue-500', title: 'Best Price Guarantee', desc: 'We compare prices across 12+ Indian marketplaces so you never overpay.' },
                        ].map(({ icon: Icon, color, title, desc }) => (
                            <div key={title} className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow space-y-6">
                                <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center shadow-lg`}>
                                    <Icon size={32} className="text-white" strokeWidth={2} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">{title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
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
