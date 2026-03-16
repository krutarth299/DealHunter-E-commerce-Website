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
            <SEO title="Partner Stores | DealSphere" description="Explore our network of verified partner stores for the best deals." />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main className="flex-grow">
                {/* ─── Premium Header ─── */}
                <div className="bg-white border-b border-slate-100 relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/3" />
                    
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-12 text-center lg:text-left">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    <span className="text-[10px] md:text-xs font-black text-orange-600 uppercase tracking-widest">Global Merchant Network</span>
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[0.9]">
                                    Our Partner <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Stores.</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-500 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                    We partner with India's most trusted marketplaces to bring you <span className="text-slate-900 font-bold">10,000+ verified deals</span> daily.
                                </p>
                            </div>

                            {/* Stats Cards */}
                            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                {[
                                    { value: '12+', label: 'PARTNERS' },
                                    { value: '5K+', label: 'DEALS' },
                                    { value: '24/7', label: 'MONITOR' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white px-6 py-5 rounded-[2rem] shadow-sm border border-slate-100/50 flex flex-col items-center min-w-[100px] md:min-w-[120px]">
                                        <p className="text-2xl md:text-3xl font-black text-slate-900">{stat.value}</p>
                                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 tracking-widest mt-1 uppercase">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="mt-12 flex flex-col md:flex-row gap-4 p-2 bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 max-w-5xl mx-auto">
                            <div className="relative flex-1 group">
                                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search for stores like Amazon, Myntra..."
                                    className="w-full h-16 pl-16 pr-6 bg-transparent border-none text-base font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-medium"
                                />
                            </div>
                            <div className="w-px h-10 bg-slate-100 self-center hidden md:block" />
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-2">
                                {CATEGORIES.map(cat => (
                                    <button 
                                        key={cat} 
                                        onClick={() => setActiveCategory(cat)}
                                        className={`h-12 px-6 rounded-xl text-xs font-black whitespace-nowrap transition-all uppercase tracking-widest
                                            ${activeCategory === cat 
                                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                                                : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Store Grid ─── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((store, i) => (
                                <motion.div
                                    layout
                                    key={store.name}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.5, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
                                    className="relative bg-white rounded-[3rem] border-2 border-transparent hover:border-orange-500/20 p-8 group cursor-pointer transition-all duration-500 shadow-premium hover:shadow-premium-lg flex flex-col gap-8 overflow-hidden"
                                    onClick={() => navigate('/deals?store=' + store.name)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                                    
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-orange-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                                                <div className="relative w-20 h-20 bg-white shadow-2xl shadow-slate-200/50 rounded-3xl flex items-center justify-center p-4 border border-slate-50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                    <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{store.name}</h3>
                                                    <CheckCircle2 size={16} className="text-blue-500" fill="currentColor" />
                                                </div>
                                                <p className="text-sm text-slate-400 font-bold leading-tight group-hover:text-slate-600 transition-colors uppercase tracking-wider">{store.tagline}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 relative z-10">
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${store.badgeBg} text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                                            {store.badge}
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {store.category}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-50 relative z-10">
                                        <div className="bg-slate-50/50 p-4 rounded-2xl group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Active Deals</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-slate-900">{store.dealsCount.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-emerald-500">+12%</span>
                                            </div>
                                        </div>
                                        <div className={`p-4 rounded-2xl border transition-all ${store.color} bg-white group-hover:shadow-md`}>
                                            <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">Max Benefit</p>
                                            <div className="flex items-center gap-2">
                                                <BadgePercent size={18} className={store.accent} />
                                                <span className={`text-lg font-black ${store.accent}`}>{store.cashback}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 relative z-10">
                                        <div className="w-full h-14 rounded-2xl bg-slate-900 group-hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 group-hover:shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-3">
                                            Browse All Offers <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-500" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {filtered.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-40 flex flex-col items-center text-center px-6"
                        >
                            <div className="w-32 h-32 rounded-[3.5rem] bg-slate-50 flex items-center justify-center mb-10 relative">
                                <Search size={56} className="text-slate-200" />
                                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-xl flex items-center justify-center text-2xl font-bold">
                                    🏪
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">No Stores Found</h3>
                            <p className="text-slate-500 font-medium max-w-sm leading-relaxed mb-12">
                                We couldn't find any stores matching your search. Try a broader category or check your spelling.
                            </p>
                            <button 
                                onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                                className="h-16 px-12 rounded-[2rem] bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-all shadow-2xl active:scale-95"
                            >
                                Show All Stores
                            </button>
                        </motion.div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Stores;
