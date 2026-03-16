import React, { useState, useEffect } from 'react';
import DealsGrid from '../components/DealsGrid';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import {
    Sparkles, TrendingDown, ArrowRight, Zap, ShieldCheck, Store, ChevronRight, Package, Flame, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import Hero from '../components/Hero';
import { useNavigate } from 'react-router-dom';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
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
    const { recentlyViewed } = useRecentlyViewed();
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
                <section className="py-12 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
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
                    <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 sm:gap-5">
                        {categories.map((catName, i) => {
                            const style = getCategoryStyle(catName);
                            const Icon = style.icon;
                            return (
                                <motion.button
                                    key={catName}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                                    whileHover={{ y: -12, scale: 1.02 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/deals?category=' + encodeURIComponent(catName))}
                                    className="relative flex flex-col items-center group cursor-pointer"
                                >
                                    {/* Card Container */}
                                    <div className={`relative w-full aspect-square rounded-2xl ${style.bg} border border-slate-100 flex flex-col items-center justify-center transition-all duration-500 group-hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)] group-hover:border-transparent overflow-hidden shadow-sm`}>
                                        
                                        {/* Ambient Glow */}
                                        <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                        
                                        {/* Floating Icon Container */}
                                        <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white shadow-md shadow-slate-200/40 flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 ease-out`}>
                                            <Icon size={18} className={style.icon_color} strokeWidth={2.5} />
                                        </div>

                                        {/* Decorative Dots */}
                                        <div className="absolute top-4 right-4 flex gap-1 group-hover:translate-x-1 transition-transform">
                                            <div className={`w-1 h-1 rounded-full ${style.icon_color} opacity-20`} />
                                            <div className={`w-1 h-1 rounded-full ${style.icon_color} opacity-10`} />
                                        </div>

                                        {/* Glass Shine Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                    </div>
                                    
                                    {/* Category Label */}
                                    <span className="mt-2 text-[9px] sm:text-[10px] font-black text-slate-900 border-b-2 border-transparent group-hover:border-orange-500 group-hover:text-orange-600 transition-all uppercase tracking-widest px-1 text-center leading-tight">
                                        {catName.split(' & ').map((part, idx) => (
                                            <React.Fragment key={idx}>
                                                {part}
                                                {idx === 0 && catName.includes(' & ') && <br />}
                                            </React.Fragment>
                                        ))}
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

                {/* ─── Featured Grid ─── */}
                <section id="deals-grid" className="py-12 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-10 rounded-full bg-blue-500" />
                            <div>
                                <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Explore</p>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">All Live Deals</h2>
                            </div>
                        </div>
                    </div>
                    <DealsGrid deals={deals.slice(0, 12)} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                </section>

                {/* ─── Recently Viewed ─── */}
                {recentlyViewed && recentlyViewed.length > 0 && (
                    <section className="py-12 bg-white border-y border-slate-100 overflow-hidden">
                        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Your Activity</p>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recently Viewed</h2>
                                    </div>
                                </div>
                                <div className="h-px flex-1 bg-slate-100 mx-8 hidden md:block" />
                            </div>
                            <DealsGrid deals={recentlyViewed.slice(0, 5)} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                        </div>
                    </section>
                )}

                {/* ─── Partner Stores Banner ─── */}
                <section className="py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-[1600px] mx-auto bg-slate-900 rounded-[4rem] overflow-hidden relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
                        {/* Background Effects */}
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/3" />
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 0.4px, transparent 0.4px)', backgroundSize: '32px 32px' }} />

                        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16 p-12 md:p-24">
                            <div className="flex-[1.2] text-white text-center lg:text-left space-y-10">
                                <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-2.5 text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">
                                    <Store size={14} className="text-orange-400" /> Partner Ecosystem
                                </div>
                                <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95]">
                                    Shop From The <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">World's Best.</span>
                                </h2>
                                <p className="text-white/40 text-lg md:text-xl font-medium max-w-lg leading-relaxed">
                                    We aggregate live prices and exclusive discount codes from India's most trusted marketplaces in real-time.
                                </p>
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                    <button onClick={() => navigate('/stores')} className="h-16 px-10 rounded-2xl bg-orange-500 text-white font-black text-sm uppercase tracking-widest hover:bg-orange-400 transition-all shadow-2xl shadow-orange-500/20 active:scale-95 group flex items-center gap-3">
                                        View All Stores <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                                                <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="" />
                                            </div>
                                        ))}
                                        <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black text-white">
                                            +2k
                                        </div>
                                    </div>
                                    <span className="text-white/30 text-xs font-bold ml-2 italic underline underline-offset-4 decoration-white/10">Active shoppers today</span>
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-3 gap-6 w-full">
                                {STORES.map((s) => (
                                    <motion.div
                                        key={s.id}
                                        whileHover={{ y: -10, scale: 1.05 }}
                                        className="aspect-square bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 p-6 cursor-pointer hover:bg-white/5 transition-all group relative overflow-hidden"
                                        onClick={() => navigate('/deals?category=' + s.id)}
                                    >
                                        <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors" />
                                        <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center p-3 shadow-2xl group-hover:rotate-6 transition-transform">
                                            <img src={s.logo} alt={s.name} className="w-full h-full object-contain" />
                                        </div>
                                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">{s.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Why DealHunter ─── */}
                <section className="py-12 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 mt-6 text-center">
                    <div className="max-w-3xl mx-auto mb-20 text-center">
                        <span className="text-orange-500 text-xs font-black uppercase tracking-[0.3em] mb-4 block">The DealHunter Edge</span>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">Save 10x Faster.</span></h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {[
                            { icon: ShieldCheck, color: 'bg-emerald-500', title: 'Verified Deals Only', desc: 'Every deal is manually reviewed and verified by our expert team before going live on the platform.' },
                            { icon: Zap, color: 'bg-orange-500', title: 'Real-time Price Watch', desc: 'Our advanced price trackers scan millions of pages every 5 minutes to catch every single price drop.' },
                            { icon: TrendingDown, color: 'bg-blue-500', title: 'Best Price Log', desc: 'We show you the historical price charts so you know if you are truly getting the lowest price ever.' },
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
