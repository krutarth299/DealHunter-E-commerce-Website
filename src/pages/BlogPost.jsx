import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, User, Tag, Copy, Check, BookOpen, ArrowRight, Share2, Zap, MessageSquare, ChevronRight, ShoppingBag } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { BLOG_POSTS } from '../data/blogData';
import { optimizeImageUrl } from '../utils/imageOptimizer';

const renderBlock = (block, index) => {
    switch (block.type) {
        case 'intro':
            return (
                <p key={index} id={`block-${index}`} className="text-xl md:text-2xl text-slate-600 leading-relaxed font-medium italic border-l-4 border-orange-500 pl-6 py-2 bg-orange-50/20 rounded-r-2xl my-10 font-serif">
                    {block.text}
                </p>
            );
        case 'heading': {
            const id = block.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return (
                <h2 key={index} id={id} className="text-2xl md:text-3xl font-black text-slate-900 mt-14 mb-6 tracking-tight flex items-center gap-3 group">
                    <span className="w-1.5 h-6 bg-orange-500 rounded-full group-hover:h-8 transition-all duration-300" />
                    {block.text}
                </h2>
            );
        }
        case 'text':
            return (
                <p key={index} id={`block-${index}`} className="text-slate-600 leading-relaxed text-lg md:text-xl font-medium mb-8">
                    {block.text}
                </p>
            );
        case 'tip':
            return (
                <div key={index} id={`block-${index}`} className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-100 rounded-3xl p-8 my-10 relative overflow-hidden group shadow-sm">
                    <div className="absolute -right-4 -top-4 text-7xl opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700">💡</div>
                    <div className="relative z-10">
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block shadow-sm">Expert Hack</span>
                        <p className="text-amber-900 font-bold leading-relaxed text-lg">
                            {block.text}
                        </p>
                    </div>
                </div>
            );
        case 'conclusion':
            return (
                <div key={index} id="conclusion" className="bg-slate-900 rounded-[2.5rem] p-10 md:p-14 mt-16 shadow-2xl text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 blur-[130px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.4em] mb-4">Bottom Line</p>
                    <p className="text-white leading-relaxed font-black text-2xl md:text-3xl relative z-10 tracking-tight">
                        {block.text}
                    </p>
                    <div className="mt-10 flex justify-center">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full group-hover:w-32 transition-all duration-700" />
                    </div>
                </div>
            );
        default:
            return null;
    }
};

const BlogPost = ({ user, wishlist, showToast, apiBase, onSearch, setIsAddDealOpen }) => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);
    const [comment, setComment] = useState('');
    const [name, setName] = useState('');
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(true);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeHeading, setActiveHeading] = useState('');

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const baseUrl = apiBase || '';
                const response = await fetch(`${baseUrl}/blog/${slug}/comments`);
                if (response.ok) {
                    const data = await response.json();
                    setComments(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Fetch comments failed:', err);
            } finally {
                setLoadingComments(false);
            }
        };
        if (slug) fetchComments();
    }, [slug]);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            setScrollProgress(progress);

            // Active heading detection
            const headings = post.content
                .filter(b => b.type === 'heading')
                .map(b => b.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'));

            for (const h of headings) {
                const el = document.getElementById(h);
                if (el && el.getBoundingClientRect().top < 200) {
                    setActiveHeading(h);
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [slug]);

    const post = useMemo(() => BLOG_POSTS.find(p => p.slug === slug), [slug]);
    const headings = useMemo(() =>
        post?.content.filter(b => b.type === 'heading').map(b => ({
            text: b.text,
            id: b.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        })) || [],
        [post]);

    const relatedPosts = post
        ? BLOG_POSTS.filter(p => p.slug !== slug && (p.category === post.category || p.tags.some(t => post.tags.includes(t)))).slice(0, 3)
        : [];

    if (!post) {
        return (
            <div className="min-h-screen bg-white flex flex-col font-sans">
                <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist ? wishlist.length : 0} wishlist={wishlist} />
                <main className="flex-grow flex flex-col items-center justify-center gap-6 pt-32">
                    <BookOpen size={48} className="text-orange-500 animate-pulse" />
                    <h2 className="text-3xl font-black text-slate-900">Post Not Found</h2>
                    <Link to="/blog" className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black hover:bg-black transition-all flex items-center gap-2">
                        <ArrowLeft size={18} /> Back to Blog
                    </Link>
                </main>
                <Footer showToast={showToast} />
            </div>
        );
    }

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        if (showToast) showToast('Link ready to share!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!comment.trim() || !name.trim()) {
            if (showToast) showToast('Please fill all fields', 'info');
            return;
        }

        try {
            const baseUrl = apiBase || '';
            const response = await fetch(`${baseUrl}/blog/${slug}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: name, text: comment })
            });

            if (response.ok) {
                const newComment = await response.json();
                setComments(prev => [newComment, ...prev]);
                setComment('');
                setName('');
                if (showToast) showToast('Comment shared!', 'success');
            } else {
                const errData = await response.json();
                if (showToast) showToast(errData.message || 'Failed to post comment', 'error');
            }
        } catch (err) {
            console.error('Post comment failed:', err);
            if (showToast) showToast('Connection error', 'error');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white selection:bg-orange-500 selection:text-white font-sans scroll-smooth">
            <SEO title={post.title} description={post.excerpt} image={post.image} />

            {/* Minimalist Progress Hook */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-slate-50 z-[100]">
                <motion.div
                    className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>

            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist ? wishlist.length : 0} wishlist={wishlist} />

            {/* Premium Editorial Header */}
            <div className="relative pt-24 pb-12 overflow-hidden bg-slate-50/50">
                <div className="absolute top-0 right-0 w-1/4 h-full bg-orange-500/5 blur-[120px] rounded-full" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative z-10">
                    <div className="max-w-4xl space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3"
                        >
                            <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                                {post.category}
                            </span>
                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock size={12} /> {post.readTime}
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]"
                        >
                            {post.title}
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-6 pt-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-xl shadow-slate-900/10">
                                    {post.authorAvatar}
                                </div>
                                <div>
                                    <p className="text-base font-black text-slate-900">{post.author}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{post.date}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Layout Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
                <div className="flex flex-col lg:flex-row gap-16">

                    {/* Left Intelligence Sidebar (Navigation) */}
                    <aside className="hidden xl:block w-48 shrink-0">
                        <div className="sticky top-40 space-y-10">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">On this page</p>
                                <nav className="space-y-3">
                                    {headings.map(h => (
                                        <a
                                            key={h.id}
                                            href={`#${h.id}`}
                                            className={`block text-xs font-bold leading-tight transition-all pb-1 border-b ${activeHeading === h.id ? 'text-orange-500 border-orange-200 pl-2' : 'text-slate-500 border-transparent hover:text-slate-900 hover:pl-1'}`}
                                        >
                                            {h.text}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                            <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                                <button onClick={handleShare} className="flex items-center gap-3 text-xs font-black text-slate-400 hover:text-orange-500 transition-colors">
                                    {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                                    Share Post
                                </button>
                                <a href="#comments" className="flex items-center gap-3 text-xs font-black text-slate-400 hover:text-orange-500 transition-colors">
                                    <MessageSquare size={14} />
                                    {comments.length} Discussion
                                </a>
                            </div>
                        </div>
                    </aside>

                    {/* Main Core Content */}
                    <main className="flex-1 max-w-2xl mx-auto lg:mx-0">
                        <div className="relative mb-16 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50">
                                <img src={optimizeImageUrl(post.image)} alt={post.title} className="w-full aspect-[21/9] object-cover" />
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>

                        <article className="prose prose-slate prose-xl max-w-none">
                            {post.content.map((block, i) => renderBlock(block, i))}
                        </article>

                        {/* Professional Footer Sections */}
                        <div className="mt-24 space-y-24">

                            {/* Author Spotlight */}
                            <div className="flex flex-col md:flex-row items-center gap-10 bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100">
                                <div className="w-24 h-24 rounded-3xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-900 font-black text-2xl shadow-sm relative shrink-0">
                                    {post.authorAvatar}
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 border-4 border-white rounded-full flex items-center justify-center text-white">
                                        <Check size={14} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-slate-900">About {post.author.split(' ')[0]}</h3>
                                    <p className="text-slate-500 text-lg leading-relaxed font-serif italic italic opacity-90">
                                        "{post.authorBio || "Bringing you the smartest ways to shop, save, and live better with technical insights and real-world deal tracking."}"
                                    </p>
                                </div>
                            </div>

                            {/* Pro Newsletter */}
                            <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 relative overflow-hidden text-center">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                                <div className="relative z-10 space-y-8">
                                    <div className="space-y-3">
                                        <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Become a Smart Shopper.</h3>
                                        <p className="text-slate-400 text-lg font-medium max-w-lg mx-auto leading-relaxed">
                                            Join 45,000+ others receiving the top 1% of deals, shopping hacks, and savings tips every Friday.
                                        </p>
                                    </div>
                                    <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                                        <input type="email" placeholder="Your best email..." className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-white px-6 font-bold outline-none focus:bg-white/10 focus:border-orange-500 transition-all text-base" />
                                        <button className="h-14 px-8 rounded-2xl bg-orange-500 text-white font-black hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/10 active:scale-95">
                                            Join Now
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pt-2">
                                        <span>No Spam</span>
                                        <div className="w-1 h-1 bg-slate-700 rounded-full" />
                                        <span>Weekly Digest</span>
                                        <div className="w-1 h-1 bg-slate-700 rounded-full" />
                                        <span>Unsubscribe Anytime</span>
                                    </div>
                                </div>
                            </div>

                            {/* Discussion Area */}
                            <section id="comments" className="pt-8">
                                <div className="flex items-center justify-between mb-12">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                        Community Hub
                                        <span className="text-xs bg-slate-100 text-slate-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">{comments.length}</span>
                                    </h3>
                                </div>

                                <form onSubmit={handleComment} className="bg-white rounded-3xl border border-slate-100 p-8 mb-16 shadow-sm focus-within:border-orange-200 transition-all">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Your Alias</label>
                                            <input
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="e.g. DealSphere99"
                                                className="w-full bg-slate-50 rounded-xl px-5 py-3.5 font-bold text-slate-900 outline-none border border-transparent focus:bg-white focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">The Message</label>
                                        <textarea
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                            placeholder="Found a better trick? Share it here..."
                                            rows={4}
                                            className="w-full bg-slate-50 rounded-xl p-5 font-medium text-slate-600 outline-none resize-none border border-transparent focus:bg-white focus:border-orange-500 transition-all mb-6"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-2">
                                            Post Comment <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-10">
                                    <AnimatePresence>
                                        {comments.map((c, i) => (
                                            <motion.div
                                                key={c._id || i}
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="group"
                                            >
                                                <div className="flex gap-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-lg shrink-0 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors border border-slate-100 uppercase">
                                                        {(c.userName || c.name)?.[0] || 'U'}
                                                    </div>
                                                    <div className="space-y-3 pt-1">
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-black text-slate-900">{c.userName || c.name}</p>
                                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest py-0.5">
                                                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Active Member'}
                                                            </p>
                                                        </div>
                                                        <p className="text-slate-600 text-lg leading-relaxed font-medium">
                                                            {c.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {comments.length === 0 && !loadingComments && (
                                        <div className="py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center gap-3">
                                            <MessageSquare size={32} className="text-slate-300" />
                                            <p className="text-slate-400 font-bold text-lg">Silence is golden, but your thoughts are silver. Be the first!</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </main>

                    {/* Right Discovery Sidebar */}
                    <aside className="hidden lg:block w-80 shrink-0 space-y-12">
                        <div className="sticky top-40 space-y-12">
                            {/* Smart Shop Section */}
                            <div className="bg-gradient-to-br from-orange-400 to-red-600 rounded-[2rem] p-8 text-white shadow-xl shadow-orange-500/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <ShoppingBag size={24} />
                                    <h3 className="text-lg font-black uppercase tracking-widest">Shop & Save</h3>
                                </div>
                                <p className="text-orange-50 text-sm font-medium leading-relaxed mb-6 opacity-90">
                                    Don't just read about deals. Grab them live on our stores page!
                                </p>
                                <Link to="/stores" className="h-12 w-full bg-white text-orange-600 font-black rounded-xl flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors shadow-lg uppercase text-[10px] tracking-widest">
                                    Browse Stores <ArrowRight size={14} />
                                </Link>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <span className="w-1.5 h-5 bg-orange-500 rounded-full" />
                                    More Articles
                                </h3>
                                <div className="space-y-6">
                                    {relatedPosts.map((p) => (
                                        <Link key={p.id} to={`/blog/${p.slug}`} className="group block space-y-3">
                                            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm">
                                                    <img src={optimizeImageUrl(p.image)} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <h4 className="text-base font-black text-slate-900 leading-tight group-hover:text-orange-500 transition-colors uppercase tracking-tight line-clamp-2">{p.title}</h4>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Actions</p>
                                <button onClick={handleShare} className="w-full h-14 bg-white rounded-xl flex items-center justify-center text-slate-900 hover:text-orange-500 transition-all shadow-sm border border-slate-100 font-black text-[10px] uppercase tracking-widest gap-2">
                                    {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                                    {copied ? 'Link Copied' : 'Share Article'}
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <Footer showToast={showToast} />

            <style dangerouslySetInnerHTML={{
                __html: `
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Playfair+Display:italic,wght@700&display=swap');
                    body { font-family: 'Outfit', sans-serif; overflow-x: hidden; background: white; }
                    .font-serif { font-family: 'Playfair Display', serif; }
                    ::-webkit-scrollbar { width: 8px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; border: 2px solid white; }
                    ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
                    html { scroll-behavior: smooth; }
                `
            }} />
        </div>
    );
};

export default BlogPost;
