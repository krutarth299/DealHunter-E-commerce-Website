import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, Tag, ArrowRight, Search, BookOpen, TrendingUp, ShoppingBag, Zap, Star, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from '../data/blogData';

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

            <main className="flex-grow pt-28 sm:pt-32 pb-20 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* ── Page Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
                    >
                        <div>
                            <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3">
                                <BookOpen size={11} /> Expert Guides
                            </span>
                            <h1 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tight">
                                Deal<span className="gradient-text-orange">Hunter</span> Blog
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium max-w-lg">
                                Shopping tips, deal breakdowns, and money-saving strategies — written by India's top bargain hunters.
                            </p>
                        </div>
                        {/* Search */}
                        <div className="relative w-full md:w-72 shrink-0">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search articles..."
                                className="search-bar pl-11 w-full"
                            />
                        </div>
                    </motion.div>

                    {/* ── Featured Article ── */}
                    {featured && !searchTerm && activeCategory === "All" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="mb-12"
                        >
                            <div
                                onClick={() => goToPost(featured.slug)}
                                className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all duration-500 overflow-hidden cursor-pointer grid grid-cols-1 lg:grid-cols-2"
                            >
                                {/* Image */}
                                <div className="relative overflow-hidden h-64 lg:h-auto">
                                    <img
                                        src={featured.image}
                                        alt={featured.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                    <span className="absolute top-4 left-4 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                        ✦ Featured
                                    </span>
                                </div>
                                {/* Content */}
                                <div className="p-8 lg:p-10 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                            {featured.category}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug mb-4 group-hover:text-orange-600 transition-colors">
                                        {featured.title}
                                    </h2>
                                    <p className="text-slate-500 leading-relaxed mb-6 font-medium">
                                        {featured.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            <span className="flex items-center gap-1.5 font-bold">
                                                <User size={13} /> {featured.author}
                                            </span>
                                            <span className="flex items-center gap-1.5 font-bold">
                                                <Clock size={13} /> {featured.readTime}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all group-hover:scale-105 shadow-lg shadow-orange-500/25">
                                            Read Article <ArrowRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Category Filter ── */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-8 px-0.5">
                        {CATEGORIES.map(cat => {
                            const Icon = categoryIcons[cat] || BookOpen;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${activeCategory === cat
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-orange-300 hover:text-orange-600'
                                        }`}
                                >
                                    <Icon size={12} />
                                    {cat}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Articles Grid ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                        <AnimatePresence mode="popLayout">
                            {filtered.length > 0 ? filtered.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.06 }}
                                    onClick={() => goToPost(post.slug)}
                                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                                >
                                    {/* Thumbnail */}
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={post.image}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            onError={e => { e.target.src = `https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80`; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                            {post.category}
                                        </span>
                                        {post.featured && (
                                            <span className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                                Featured
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 flex flex-col flex-grow">
                                        <h3 className="font-black text-slate-900 text-base leading-snug mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                                            {post.title}
                                        </h3>
                                        <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2 flex-grow font-medium">
                                            {post.excerpt}
                                        </p>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {post.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                                <span className="flex items-center gap-1 font-bold">
                                                    <User size={11} /> {post.author}
                                                </span>
                                                <span className="flex items-center gap-1 font-bold">
                                                    <Clock size={11} /> {post.readTime}
                                                </span>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="col-span-3 py-20 text-center">
                                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Search size={24} className="text-orange-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">No articles found</h3>
                                    <p className="text-slate-400 font-medium">Try a different search or category.</p>
                                    <button
                                        onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                                        className="btn-primary mt-4"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Newsletter Banner ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-10 md:p-14 text-center relative overflow-hidden"
                    >
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />
                        <div className="relative z-10">
                            <span className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-5">
                                <Zap size={11} /> Weekly Digest
                            </span>
                            <h2 className="text-3xl md:text-4xl font-[1000] text-white tracking-tight mb-3">
                                Never Miss a Deal Again
                            </h2>
                            <p className="text-slate-400 max-w-lg mx-auto mb-8 font-medium">
                                Get the 5 best deals of the week + our top shopping tip delivered to your inbox every Sunday.
                            </p>
                            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    className="flex-1 w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
                                />
                                <button
                                    type="submit"
                                    className="shrink-0 w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-black text-sm px-6 py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-orange-500/25 uppercase tracking-wide"
                                >
                                    Subscribe Free
                                </button>
                            </form>
                            <p className="text-slate-600 text-xs mt-4 font-medium">
                                Join 50,000+ deal hunters. Unsubscribe anytime.
                            </p>
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
