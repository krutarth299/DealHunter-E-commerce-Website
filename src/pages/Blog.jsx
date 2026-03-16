import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, Tag, ArrowRight, Search, BookOpen, TrendingUp, ShoppingBag, Zap, Star, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from '../data/blogData';
import { optimizeImageUrl } from '../utils/imageOptimizer';

const CATEGORIES = ["All", "Shopping Tips", "Deal Analysis", "Electronics", "Fashion", "Grocery", "Finance"];

const categoryIcons = {
    "All": BookOpen,
    "Shopping Tips": TrendingUp,
    "Deal Analysis": Zap,
    "Electronics": Star,
    "Fashion": Heart,
    "Grocery": ShoppingBag,
    "Finance": Tag,
};

const Blog = ({ user, wishlist, showToast, onSearch, setIsAddDealOpen }) => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const [email, setEmail] = useState("");

    const featured = BLOG_POSTS.find(p => p.featured);
    const filtered = BLOG_POSTS.filter(p => {
        if (p.featured && !searchTerm && activeCategory === "All") return false;
        const matchCat = activeCategory === "All" || p.category === activeCategory;
        const matchSearch = !searchTerm ||
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCat && matchSearch;
    });

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (!email) return;
        if (showToast) showToast("You've subscribed to DealHunter Blog! 🎉", "success");
        setEmail("");
    };

    const goToPost = (slug) => navigate(`/blog/${slug}`);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-orange-100">
            <SEO
                title="Blog — Deal Tips & Shopping Guides"
                description="Expert shopping guides, deal analysis, and money-saving tips from the DealHunter team."
            />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist ? wishlist.length : 0} wishlist={wishlist} />

            <main className="flex-grow pt-32 sm:pt-40 pb-24 w-full relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/30 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/30 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                    {/* ── Page Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-16 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-10"
                    >
                        <div className="max-w-2xl">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-orange-600/10 text-orange-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] mb-5 border border-orange-200/50 backdrop-blur-sm"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                Intelligent Insights
                            </motion.div>
                            <h1 className="text-5xl md:text-7xl font-[1000] text-slate-900 tracking-tight leading-[0.95] mb-6">
                                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Smart</span> Hunter 
                                <span className="block text-slate-400/50 text-4xl md:text-5xl mt-2 tracking-tighter italic">Official Blog</span>
                            </h1>
                            <p className="text-slate-500 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
                                Curated guides and advanced strategies to help you save more on everything you buy.
                            </p>
                        </div>
                        
                        {/* Search & Filter Container */}
                        <div className="flex flex-col gap-4 w-full md:w-auto">
                            <div className="relative w-full md:w-80 shrink-0 group">
                                <div className="absolute inset-0 bg-orange-500/5 blur-xl group-focus-within:bg-orange-500/10 transition-all rounded-2xl" />
                                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search intelligence..."
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-[0_10px_30px_-10px_rgba(0,0,0,0.02)] relative z-10"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Featured Article ── */}
                    {featured && !searchTerm && activeCategory === "All" && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, duration: 0.8 }}
                            className="mb-20 relative px-2"
                        >
                            <div className="absolute inset-0 bg-orange-500/5 blur-3xl rounded-[3rem] -z-10" />
                            <div
                                onClick={() => goToPost(featured.slug)}
                                className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 overflow-hidden cursor-pointer grid grid-cols-1 lg:grid-cols-12 min-h-[500px]"
                            >
                                {/* Image */}
                                <div className="lg:col-span-7 relative overflow-hidden h-[300px] lg:h-auto">
                                    <img
                                        src={featured.image}
                                        alt={featured.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms] ease-out"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 to-transparent lg:hidden" />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-700" />
                                    <div className="absolute top-6 left-6 z-20">
                                        <span className="bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30 backdrop-blur-md">
                                            ✦ Master Class
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <div className="lg:col-span-5 p-8 md:p-12 lg:p-14 flex flex-col justify-center relative bg-white">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                                                {featured.category}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">• {featured.readTime}</span>
                                        </div>
                                        <h2 className="text-3xl md:text-5xl lg:text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6 group-hover:text-orange-600 transition-colors duration-500">
                                            {featured.title}
                                        </h2>
                                        <p className="text-slate-500 text-lg leading-relaxed mb-10 font-medium opacity-80 line-clamp-3">
                                            {featured.excerpt}
                                        </p>
                                        
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-10 border-t border-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-orange-500/20">
                                                    {featured.authorAvatar}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authored By</span>
                                                    <span className="text-sm font-black text-slate-900">{featured.author}</span>
                                                </div>
                                            </div>
                                            <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-black px-6 py-4 rounded-2xl transition-all hover:bg-orange-600 hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-orange-500/25">
                                                Read Article <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Category Filter & Nav ── */}
                    <div className="sticky top-24 z-30 mb-12 -mx-4 px-4 py-4 md:mx-0 md:px-0 bg-slate-50/80 backdrop-blur-xl border-y border-slate-200/50 md:border-none md:bg-transparent md:backdrop-none">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0 hidden md:block">Filter Intensity:</span>
                            {CATEGORIES.map(cat => {
                                const Icon = categoryIcons[cat] || BookOpen;
                                const isActive = activeCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 group ${isActive
                                            ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20'
                                            : 'bg-white text-slate-500 border border-slate-200 hover:border-orange-300 hover:text-orange-600 hover:shadow-lg hover:shadow-orange-500/5'
                                            }`}
                                    >
                                        <Icon size={14} className={`${isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} transition-opacity`} />
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Articles Grid ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                        <AnimatePresence mode="popLayout">
                            {filtered.length > 0 ? filtered.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    layout
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.5, delay: (index % 6) * 0.05 }}
                                    onClick={() => goToPost(post.slug)}
                                    className="group bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] hover:border-orange-100 transition-all duration-500 overflow-hidden cursor-pointer flex flex-col h-full relative"
                                >
                                    {/* Thumbnail container */}
                                    <div className="relative h-60 overflow-hidden">
                                        <img
                                            src={optimizeImageUrl(post.image)}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                                            onError={e => { e.target.src = `https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80`; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        
                                        <div className="absolute top-4 left-4 z-10">
                                            <span className="bg-white/95 backdrop-blur-md text-slate-800 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg border border-white/20">
                                                {post.category}
                                            </span>
                                        </div>
                                        
                                        <div className="absolute bottom-4 right-4 translate-y-10 group-hover:translate-y-0 transition-transform duration-500 z-10">
                                            <div className="w-10 h-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/30">
                                                <ArrowRight size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-7 md:p-8 flex flex-col flex-grow relative">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="flex -space-x-2">
                                                {post.tags.slice(0, 2).map(tag => (
                                                    <div key={tag} className="w-6 h-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400 uppercase">
                                                        {tag[0]}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{post.readTime}</span>
                                        </div>
                                        
                                        <h3 className="font-black text-slate-900 text-xl leading-tight mb-4 group-hover:text-orange-600 transition-colors duration-300 flex-grow">
                                            {post.title}
                                        </h3>
                                        
                                        <p className="text-slate-500 text-sm leading-relaxed mb-8 line-clamp-3 font-medium opacity-80">
                                            {post.excerpt}
                                        </p>

                                        {/* Footer Profile */}
                                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                                                    {post.authorAvatar}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-900 leading-none">{post.author}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{post.date}</span>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                Read Intel
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Interactive Shine */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                                </motion.div>
                            )) : (
                                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                                    <div className="w-24 h-24 bg-orange-100/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <Search size={40} className="text-orange-400" />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Zero Results</h3>
                                    <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed">
                                        We couldn't find any articles matching your current intelligence parameters.
                                    </p>
                                    <button
                                        onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                                        className="bg-slate-900 text-white font-black px-10 py-4 rounded-2xl hover:bg-orange-600 hover:shadow-2xl hover:shadow-orange-500/25 transition-all active:scale-95 uppercase text-xs tracking-widest"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Newsletter Section ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-slate-900 rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden group shadow-2xl shadow-slate-900/30"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-indigo-500/10 opacity-50" />
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-orange-500/20 transition-colors duration-1000" />
                        
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <motion.div 
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                className="w-20 h-20 bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl"
                            >
                                <Zap size={40} className="text-orange-500" fill="currentColor" />
                            </motion.div>
                            
                            <h2 className="text-4xl md:text-6xl font-[1000] text-white tracking-tight leading-[0.95] mb-6">
                                Join the <span className="text-orange-500">Elite</span> Savings Club
                            </h2>
                            <p className="text-slate-400 text-lg md:text-xl mb-12 font-medium leading-relaxed opacity-80">
                                Get our highly-guarded "Sunday Secret" deal list before the general public.
                            </p>
                            
                            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-md">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@intelligence.com"
                                    required
                                    className="flex-1 w-full bg-transparent text-white placeholder:text-slate-500 rounded-2xl px-6 py-4 text-base font-bold focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    className="shrink-0 w-full sm:w-auto bg-orange-500 hover:bg-white hover:text-orange-600 text-white font-black text-sm px-10 py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/20 uppercase tracking-widest active:scale-95"
                                >
                                    Activate Now
                                </button>
                            </form>
                            
                            <div className="flex items-center justify-center gap-8 mt-10">
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-black text-white">50K+</span>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Subscribers</span>
                                </div>
                                <div className="w-[1px] h-8 bg-white/10" />
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-black text-white">Weekly</span>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Frequency</span>
                                </div>
                                <div className="w-[1px] h-8 bg-white/10" />
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-black text-white">100%</span>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Encryption</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer showToast={showToast} />

            <style dangerouslySetInnerHTML={{
                __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`
            }} />
        </div>
    );
};

export default Blog;
