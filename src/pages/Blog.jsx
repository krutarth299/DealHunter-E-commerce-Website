import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, CalendarDays, Search, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { formatBlogDate, normalizeBlogForUi } from '../utils/blogs';

const Blog = ({ user, wishlist, showToast, onSearch, setIsAddDealOpen, apiBase, preloadedBlogs = null }) => {
    const navigate = useNavigate();
    
    // Support SSR Initial Data
    const getInitialBlogs = () => {
        if (preloadedBlogs) return preloadedBlogs;
        if (typeof window !== 'undefined' && window.__INITIAL_BLOGS__) return window.__INITIAL_BLOGS__;
        if (typeof global !== 'undefined' && global.__INITIAL_BLOGS__) return global.__INITIAL_BLOGS__;
        return null;
    };
    const initialBlogsRaw = getInitialBlogs();
    const initialBlogs = initialBlogsRaw ? (Array.isArray(initialBlogsRaw) ? initialBlogsRaw.map(normalizeBlogForUi) : []) : null;

    const [blogs, setBlogs] = useState(initialBlogs || []);
    const [categories, setCategories] = useState(['All']);
    const [tags, setTags] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedTag, setSelectedTag] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadBlogs = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await fetch(`${apiBase.replace('/user', '')}/blog?limit=100`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data?.message || 'Failed to load blogs.');
                }

                if (!mounted) return;
                const items = Array.isArray(data.items) ? data.items.map(normalizeBlogForUi) : [];
                setBlogs(items);
                setCategories(['All', ...(Array.isArray(data.categories) ? data.categories.filter(Boolean) : [])]);
                setTags(['All', ...(Array.isArray(data.tags) ? data.tags.filter(Boolean) : [])]);
            } catch (fetchError) {
                if (!mounted) return;
                setError(fetchError.message || 'Failed to load blogs.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (apiBase) {
            // Only fetch if we don't have preloaded data OR if we want to hydrate fresh data in background
            if (blogs.length === 0) {
                loadBlogs();
            } else {
                setLoading(false);
                // Background refresh for latest data silently
                loadBlogs();
            }
        }

        return () => {
            mounted = false;
        };
    }, [apiBase]);

    const filteredBlogs = useMemo(() => {
        return blogs.filter((blog) => {
            const haystack = [blog.title, blog.summary, blog.category, ...(blog.tags || [])].join(' ').toLowerCase();
            const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || blog.category === selectedCategory;
            const matchesTag = selectedTag === 'All' || (blog.tags || []).includes(selectedTag);
            return matchesSearch && matchesCategory && matchesTag;
        });
    }, [blogs, searchTerm, selectedCategory, selectedTag]);

    const featuredBlog = useMemo(
        () => filteredBlogs.find((blog) => blog.featured) || filteredBlogs[0] || null,
        [filteredBlogs]
    );

    const isShowingFeatured = !!featuredBlog;

    const regularBlogs = useMemo(
        () => filteredBlogs.filter((blog) => !featuredBlog || blog.slug !== featuredBlog.slug),
        [filteredBlogs, featuredBlog]
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] relative overflow-hidden">
            {/* Premium Mesh Gradients */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-50/60 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute top-[20%] left-0 w-[600px] h-[600px] bg-blue-50/40 blur-[120px] rounded-full -translate-x-1/2 pointer-events-none" />
            <SEO
                title="DealSphere Blog | Buying Guides, Savings Tips & Live Deal Roundups"
                description="Read live deal roundups, shopping guides, category savings tips, and store-specific buying advice powered by DealSphere data."
                canonical="/blog"
                itemList={blogs.map((blog) => ({
                    title: blog.title,
                    pageUrl: `/blog/${blog.slug}`
                }))}
                breadcrumbs={[
                    { name: 'Home', url: '/' },
                    { name: 'Blog', url: '/blog' }
                ]}
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: 'DealSphere Blog',
                    description: 'Published savings guides and deal roundups from DealSphere.',
                    url: '/blog'
                }}
            />

            <Navbar
                user={user}
                onSearch={onSearch}
                onAddDealClick={() => setIsAddDealOpen(true)}
                wishlistCount={wishlist ? wishlist.length : 0}
                wishlist={wishlist}
            />

            <main className="flex-grow pt-32 pb-20 relative z-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                                <BookOpen size={14} />
                                Live Content Hub
                            </div>
                            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                                SEO-ready blog content built from real deals
                            </h1>
                            <p className="mt-4 max-w-2xl text-lg font-medium leading-relaxed text-slate-600">
                                Browse deal roundups, store-focused savings guides, category buying advice, and auto-generated articles backed by live DealSphere products.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:w-[620px]">
                            <label className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search blogs"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-orange-400"
                                />
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(event) => setSelectedCategory(event.target.value)}
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-orange-400"
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                            <select
                                value={selectedTag}
                                onChange={(event) => setSelectedTag(event.target.value)}
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-orange-400"
                            >
                                {tags.map((tag) => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                                    <div className="h-56 animate-pulse bg-slate-100" />
                                    <div className="space-y-4 p-6">
                                        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                                        <div className="h-7 w-5/6 animate-pulse rounded bg-slate-100" />
                                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                                        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-10 text-center">
                            <p className="text-lg font-black text-rose-700">Blog feed unavailable</p>
                            <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>
                        </div>
                    ) : (
                        <>
                            {featuredBlog && selectedCategory === 'All' && selectedTag === 'All' && !searchTerm && (
                                <motion.button
                                    initial={{ opacity: 0, y: 18 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => navigate(`/blog/${featuredBlog.slug}`)}
                                    className="group mb-14 grid w-full overflow-hidden rounded-[36px] border border-slate-200/60 bg-white/70 backdrop-blur-xl text-left shadow-premium hover:shadow-premium-lg transition-all lg:grid-cols-[1.2fr_0.8fr]"
                                >
                                    <div className="relative min-h-[320px] overflow-hidden bg-white flex items-center justify-center p-8">
                                        <img
                                            src={optimizeImageUrl(featuredBlog.featuredImage || featuredBlog.image)}
                                            alt={featuredBlog.title}
                                            className="max-h-[260px] w-auto object-contain transition-transform duration-700 group-hover:scale-105 mix-blend-multiply"
                                        />
                                        <div className="absolute left-6 top-6 rounded-full bg-white/95 border border-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-orange-600 shadow-sm">
                                            Featured
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center p-8 md:p-10">
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                            <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-600">{featuredBlog.category}</span>
                                            <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {formatBlogDate(featuredBlog.publishedAt || featuredBlog.date)}</span>
                                        </div>
                                        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                                            {featuredBlog.title}
                                        </h2>
                                        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600">
                                            {featuredBlog.summary}
                                        </p>
                                        <div className="mt-8 flex flex-wrap items-center gap-3">
                                            {(featuredBlog.tags || []).slice(0, 4).map((tag) => (
                                                <span key={tag} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                                                    <Tag size={12} /> {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-8 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-orange-600">
                                            Read article <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </motion.button>
                            )}

                            {regularBlogs.length > 0 ? (
                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {regularBlogs.map((blog, index) => (
                                        <motion.button
                                            key={blog.slug}
                                            initial={{ opacity: 0, y: 18 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.04 }}
                                            onClick={() => navigate(`/blog/${blog.slug}`)}
                                            className="group overflow-hidden rounded-[28px] border border-slate-200/60 bg-white/70 backdrop-blur-md text-left shadow-sm transition-all hover:-translate-y-2 hover:shadow-premium-lg"
                                        >
                                            <div className="relative h-48 overflow-hidden bg-white border-b border-slate-100 flex items-center justify-center p-6">
                                                <img
                                                    src={optimizeImageUrl(blog.featuredImage || blog.image)}
                                                    alt={blog.title}
                                                    className="max-h-36 w-auto object-contain transition-transform duration-700 group-hover:scale-105 mix-blend-multiply"
                                                />
                                            </div>
                                            <div className="p-6">
                                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{blog.category}</span>
                                                    <span>{blog.readTime}</span>
                                                </div>
                                                <h3 className="mt-3 line-clamp-2 text-lg font-black leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-orange-600">
                                                    {blog.title}
                                                </h3>
                                                <p className="mt-4 line-clamp-3 text-sm font-medium leading-relaxed text-slate-600">
                                                    {blog.summary}
                                                </p>
                                                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{blog.author}</p>
                                                        <p className="text-xs font-semibold text-slate-500">{formatBlogDate(blog.publishedAt || blog.date)}</p>
                                                    </div>
                                                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                                                        Read more <ArrowRight size={14} />
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                                    <p className="text-2xl font-black text-slate-900">No matching blogs yet</p>
                                    <p className="mt-3 text-sm font-semibold text-slate-500">
                                        Try clearing a filter or search term to explore the published articles.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            <Footer showToast={showToast} />
        </div>
    );
};

export default Blog;
