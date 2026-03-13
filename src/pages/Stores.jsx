import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Zap, ExternalLink, CheckCircle2, BadgePercent } from 'lucide-react';
import SEO from '../components/SEO';

const ALL_STORES = [
    { name: 'Amazon', tagline: 'India\'s largest marketplace', logo: 'https://www.google.com/s2/favicons?domain=amazon.in&sz=256', category: 'Multi-category', cashback: '5% Rewards', dealsCount: 1240, badge: '🏆 Top Pick', color: 'border-amber-200 hover:border-amber-400', accent: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700', url: 'https://amazon.in' },
    { name: 'Flipkart', tagline: 'Electronics & Fashion deals', logo: 'https://www.google.com/s2/favicons?domain=flipkart.com&sz=256', category: 'Multi-category', cashback: '8% Rewards', dealsCount: 985, badge: '⚡ Flash Sale', color: 'border-blue-200 hover:border-blue-400', accent: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700', url: 'https://flipkart.com' },
    { name: 'Myntra', tagline: 'Premium fashion & lifestyle', logo: 'https://www.google.com/s2/favicons?domain=myntra.com&sz=256', category: 'Fashion', cashback: '6% Cashback', dealsCount: 710, badge: '👗 Trending', color: 'border-rose-200 hover:border-rose-400', accent: 'text-rose-600', badgeBg: 'bg-rose-50 text-rose-700', url: 'https://myntra.com' },
    { name: 'Meesho', tagline: 'Affordable lifestyle products', logo: 'https://www.google.com/s2/favicons?domain=meesho.com&sz=256', category: 'Fashion', cashback: '10% Rewards', dealsCount: 630, badge: '💰 Best Value', color: 'border-purple-200 hover:border-purple-400', accent: 'text-purple-600', badgeBg: 'bg-purple-50 text-purple-700', url: 'https://meesho.com' },
    { name: 'Blinkit', tagline: 'Groceries in 10 minutes', logo: 'https://www.google.com/s2/favicons?domain=blinkit.com&sz=256', category: 'Grocery', cashback: '₹50 Off', dealsCount: 430, badge: '🚀 Quick Delivery', color: 'border-emerald-200 hover:border-emerald-400', accent: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700', url: 'https://blinkit.com' },
    { name: 'Nykaa', tagline: 'Beauty & skincare essentials', logo: 'https://www.google.com/s2/favicons?domain=nykaa.com&sz=256', category: 'Beauty', cashback: '4% Cashback', dealsCount: 320, badge: '✨ Beauty', color: 'border-pink-200 hover:border-pink-400', accent: 'text-pink-600', badgeBg: 'bg-pink-50 text-pink-700', url: 'https://nykaa.com' },
    { name: 'Ajio', tagline: 'Branded fashion at best price', logo: 'https://www.google.com/s2/favicons?domain=ajio.com&sz=256', category: 'Fashion', cashback: '8% Rewards', dealsCount: 280, badge: '🎯 Sale', color: 'border-slate-200 hover:border-slate-400', accent: 'text-slate-700', badgeBg: 'bg-slate-50 text-slate-700', url: 'https://ajio.com' },
    { name: 'Croma', tagline: 'Electronics & appliances', logo: 'https://www.google.com/s2/favicons?domain=croma.com&sz=256', category: 'Electronics', cashback: '2% Rewards', dealsCount: 195, badge: '🔌 Tech', color: 'border-cyan-200 hover:border-cyan-400', accent: 'text-cyan-700', badgeBg: 'bg-cyan-50 text-cyan-700', url: 'https://croma.com' },
    { name: 'BigBasket', tagline: 'Supermarket at your doorstep', logo: 'https://www.google.com/s2/favicons?domain=bigbasket.com&sz=256', category: 'Grocery', cashback: '3% Cashback', dealsCount: 510, badge: '🥦 Fresh', color: 'border-emerald-200 hover:border-emerald-400', accent: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700', url: 'https://bigbasket.com' },
    { name: 'Nike', tagline: 'Just do it. Best prices here.', logo: 'https://www.google.com/s2/favicons?domain=nike.com&sz=256', category: 'Fashion', cashback: '5% Rewards', dealsCount: 85, badge: '👟 Sports', color: 'border-slate-200 hover:border-black', accent: 'text-slate-900', badgeBg: 'bg-slate-100 text-slate-900', url: 'https://nike.com' },
    { name: 'Samsung', tagline: 'Galaxy ecosystem & appliances', logo: 'https://www.google.com/s2/favicons?domain=samsung.com&sz=256', category: 'Electronics', cashback: '1.5% Rewards', dealsCount: 140, badge: '📱 Flagship', color: 'border-indigo-200 hover:border-indigo-400', accent: 'text-indigo-600', badgeBg: 'bg-indigo-50 text-indigo-700', url: 'https://samsung.com' },
    { name: 'Apple', tagline: 'Premium Apple products & deals', logo: 'https://www.google.com/s2/favicons?domain=apple.com&sz=256', category: 'Electronics', cashback: '1% Rewards', dealsCount: 65, badge: '🍎 Premium', color: 'border-slate-200 hover:border-slate-500', accent: 'text-slate-700', badgeBg: 'bg-slate-50 text-slate-700', url: 'https://apple.com' },
];

const CATEGORIES = ['All', 'Multi-category', 'Fashion', 'Electronics', 'Grocery', 'Beauty'];

const Stores = ({ onSearch, user, wishlist, setIsAddDealOpen }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const filtered = ALL_STORES.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.tagline.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = activeCategory === 'All' || s.category === activeCategory;
        return matchSearch && matchCat;
    });

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900">
            <SEO title="Partner Stores | DealHunter" description="Explore our network of verified partner stores for the best deals." />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main className="flex-grow pt-20">
                {/* ─── Header Banner ─── */}
                <div className="bg-white border-b border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 md:gap-10">
                            <div className="space-y-4 text-center lg:text-left w-full lg:w-auto">
                                <p className="text-orange-500 text-[10px] md:text-xs font-black uppercase tracking-widest">Verified Partners</p>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
                                    Partner <span className="text-orange-500">Stores</span>
                                </h1>
                                <p className="text-sm md:text-lg text-slate-500 font-medium max-w-xl mx-auto lg:mx-0">
                                    Exclusive tie-ups with India's most trusted marketplaces. Verified deals, real cashback.
                                </p>
                            </div>
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 md:gap-8 w-full lg:w-auto">
                                {[
                                    { value: '12+', label: 'Partners' },
                                    { value: '5K+', label: 'Active Deals' },
                                    { value: '24/7', label: 'Price Watch' },
                                ].map(({ value, label }) => (
                                    <div key={label} className="text-center space-y-1">
                                        <p className="text-2xl md:text-4xl font-black text-slate-900">{value}</p>
                                        <p className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Search + Filters */}
                        <div className="mt-12 flex flex-col md:flex-row gap-6">
                            <div className="relative flex-1 max-w-2xl">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search stores..."
                                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-orange-400 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                                {CATEGORIES.map(cat => (
                                    <button key={cat} onClick={() => setActiveCategory(cat)}
                                        className={`h-14 px-6 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border
                      ${activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-900'}`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Store Grid ─── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((store, i) => (
                                <motion.div
                                    layout
                                    key={store.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: i * 0.04 }}
                                    tabIndex={0}
                                    role="link"
                                    aria-label={`View deals for ${store.name}`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigate('/deals?store=' + store.name);
                                        }
                                    }}
                                    className={`bg-white border-2 ${store.color} rounded-3xl p-8 flex flex-col gap-6 group cursor-pointer transition-all duration-300 hover:shadow-xl shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-500`}
                                    onClick={() => navigate('/deals?store=' + store.name)}
                                >
                                    {/* Top Row */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                                <img src={store.logo} alt={store.name} className="w-12 h-12 object-contain" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{store.name}</h3>
                                                <p className="text-sm text-slate-400 font-medium mt-0.5">{store.tagline}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Badge + Stats */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-xs font-black px-3 py-1.5 rounded-full ${store.badgeBg}`}>{store.badge}</span>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">{store.category}</span>
                                    </div>

                                    {/* Bottom Row */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active Deals</p>
                                            <p className="text-2xl font-black text-slate-900">{store.dealsCount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right space-y-0.5">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Rewards</p>
                                                <p className={`text-sm font-black ${store.accent}`}>{store.cashback}</p>
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0`}>
                                                <ArrowRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {filtered.length === 0 && (
                        <div className="py-40 text-center space-y-6">
                            <div className="text-6xl">🏪</div>
                            <h3 className="text-2xl font-black text-slate-900">No stores match</h3>
                            <p className="text-slate-500">Try a different search or category filter.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Stores;
