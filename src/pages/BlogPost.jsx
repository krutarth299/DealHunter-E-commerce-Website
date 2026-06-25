import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Copy, MessageSquare, ShoppingBag, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { SITE_ORIGIN } from '../config/brand';
import { getMainProductImage, optimizeImageUrl } from '../utils/imageOptimizer';
import { formatBlogDate, normalizeBlogBlocks, normalizeBlogForUi } from '../utils/blogs';

const renderBlock = (block, index) => {
    switch (block.type) {
        case 'heading':
            return (
                <h2 key={`${block.type}-${index}`} className="mt-10 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
                    {block.text}
                </h2>
            );
        case 'tip':
            return (
                <div key={`${block.type}-${index}`} className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">Pro Tip</p>
                    <p className="mt-3 text-base font-bold leading-relaxed">{block.text}</p>
                </div>
            );
        case 'conclusion':
            return (
                <div key={`${block.type}-${index}`} className="rounded-[32px] bg-slate-950 px-8 py-10 text-white shadow-[0_24px_50px_-28px_rgba(15,23,42,0.45)]">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Final Take</p>
                    <p className="mt-4 text-lg font-bold leading-relaxed md:text-xl">{block.text}</p>
                </div>
            );
        case 'intro':
            return (
                <p key={`${block.type}-${index}`} className="rounded-r-[28px] border-l-4 border-orange-500 bg-orange-50/70 px-6 py-4 text-base font-medium leading-relaxed text-slate-700 italic">
                    {block.text}
                </p>
            );
        default:
            return (
                <div 
                    key={`${block.type}-${index}`} 
                    className="text-base font-medium leading-relaxed text-slate-700 prose prose-slate max-w-none prose-p:my-2 prose-ul:my-2 prose-strong:text-slate-900" 
                    dangerouslySetInnerHTML={{ __html: block.text }} 
                />
            );
    }
};

const BlogPost = ({ user, wishlist, showToast, apiBase, onSearch, setIsAddDealOpen, preloadedBlog = null }) => {
    const { slug } = useParams();
    const navigate = useNavigate();
    
    // Support SSR Initial Data
    const getInitialBlog = () => {
        if (preloadedBlog && preloadedBlog.slug === slug) return preloadedBlog;
        if (typeof window !== 'undefined' && window.__INITIAL_BLOG__ && window.__INITIAL_BLOG__.slug === slug) return window.__INITIAL_BLOG__;
        if (typeof global !== 'undefined' && global.__INITIAL_BLOG__ && global.__INITIAL_BLOG__.slug === slug) return global.__INITIAL_BLOG__;
        return null;
    };
    const initialBlogRaw = getInitialBlog();
    const initialBlog = initialBlogRaw ? normalizeBlogForUi(initialBlogRaw) : null;

    const [blog, setBlog] = useState(initialBlog);
    const [comments, setComments] = useState([]);
    const [name, setName] = useState('');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(!initialBlog);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, [slug]);

    useEffect(() => {
        let mounted = true;

        const loadBlog = async () => {
            try {
                setLoading(true);
                setError('');
                const base = apiBase.replace('/user', '');
                const [blogResponse, commentsResponse] = await Promise.all([
                    fetch(`${base}/blog/${slug}`, {
                        cache: 'no-store',
                        headers: { 'Cache-Control': 'no-cache' }
                    }),
                    fetch(`${base}/blog/${slug}/comments`, {
                        cache: 'no-store',
                        headers: { 'Cache-Control': 'no-cache' }
                    })
                ]);

                const blogData = await blogResponse.json().catch(() => ({}));
                const commentsData = await commentsResponse.json().catch(() => ([]));

                if (!blogResponse.ok) {
                    throw new Error(blogData?.message || 'Blog not found');
                }

                if (!mounted) return;
                setBlog(normalizeBlogForUi(blogData));
                setComments(Array.isArray(commentsData) ? commentsData : []);
            } catch (fetchError) {
                if (!mounted) return;
                setError(fetchError.message || 'Failed to load blog.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (apiBase && slug) {
            if (!blog) {
                loadBlog();
            } else {
                setLoading(false);
                // Background refresh
                loadBlog();
            }
        }

        return () => {
            mounted = false;
        };
    }, [apiBase, slug]);

    const contentBlocks = useMemo(
        () => normalizeBlogBlocks(blog?.contentBlocks, blog?.content),
        [blog]
    );

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            showToast?.('Blog link copied.', 'success');
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            showToast?.('Could not copy the blog link.', 'error');
        }
    };

    const handleComment = async (event) => {
        event.preventDefault();
        if (!name.trim() || !comment.trim()) {
            showToast?.('Name and comment are required.', 'info');
            return;
        }

        try {
            const response = await fetch(`${apiBase.replace('/user', '')}/blog/${slug}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName: name,
                    text: comment
                })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to post comment.');
            }
            setComments((previous) => [data, ...previous]);
            setName('');
            setComment('');
            showToast?.('Comment posted.', 'success');
        } catch (commentError) {
            showToast?.(commentError.message || 'Failed to post comment.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist ? wishlist.length : 0} wishlist={wishlist} />
                <main className="flex-grow pt-32 pb-20">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                        <div className="h-10 w-40 animate-pulse rounded bg-slate-100" />
                        <div className="mt-8 h-16 w-full animate-pulse rounded bg-slate-100" />
                        <div className="mt-5 h-6 w-2/3 animate-pulse rounded bg-slate-100" />
                        <div className="mt-10 h-[420px] animate-pulse rounded-[32px] bg-slate-100" />
                    </div>
                </main>
                <Footer showToast={showToast} />
            </div>
        );
    }

    if (error || !blog) {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist ? wishlist.length : 0} wishlist={wishlist} />
                <main className="flex-grow flex flex-col items-center justify-center gap-5 px-4 pt-32 pb-20 text-center">
                    <p className="text-3xl font-black text-slate-950">Blog not found</p>
                    <p className="max-w-md text-sm font-semibold text-slate-500">{error || 'This blog post is unavailable right now.'}</p>
                    <Link to="/blog" className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white">
                        <ArrowLeft size={16} /> Back to Blog
                    </Link>
                </main>
                <Footer showToast={showToast} />
            </div>
        );
    }

    const canonicalPath = `/blog/${blog.slug}`;
    const blogUrl = `${SITE_ORIGIN}${canonicalPath}`;

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <SEO
                title={blog.seoTitle || blog.title}
                description={blog.seoDescription || blog.summary}
                canonical={canonicalPath}
                type="article"
                image={blog.featuredImage || blog.image}
                breadcrumbs={[
                    { name: 'Home', url: '/' },
                    { name: 'Blog', url: '/blog' },
                    { name: blog.title, url: canonicalPath }
                ]}
                keywords={blog.seoKeywords?.length ? blog.seoKeywords.join(', ') : (blog.tags || []).join(', ')}
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'BlogPosting',
                    headline: blog.title,
                    description: blog.seoDescription || blog.summary,
                    image: optimizeImageUrl(blog.featuredImage || blog.image),
                    author: {
                        '@type': 'Person',
                        name: blog.author
                    },
                    publisher: {
                        '@type': 'Organization',
                        name: 'DealSphere'
                    },
                    datePublished: blog.publishedAt || blog.createdAt || undefined,
                    dateModified: blog.updatedAt || blog.publishedAt || blog.createdAt || undefined,
                    mainEntityOfPage: blogUrl,
                    keywords: (blog.seoKeywords || []).join(', ')
                }}
            />

            <Navbar
                user={user}
                onSearch={onSearch}
                onAddDealClick={() => setIsAddDealOpen(true)}
                wishlistCount={wishlist ? wishlist.length : 0}
                wishlist={wishlist}
            />

            <main className="flex-grow pt-28 pb-20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500 transition-colors hover:text-orange-600">
                            <ArrowLeft size={14} /> Back to blog
                        </Link>

                        <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-600">{blog.category}</span>
                            <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {formatBlogDate(blog.publishedAt || blog.date)}</span>
                            <span>{blog.readTime}</span>
                        </div>

                        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                            {blog.title}
                        </h1>
                        <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-slate-600">
                            {blog.summary}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                                    {blog.authorAvatar}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-950">{blog.author}</p>
                                    <p className="text-xs font-semibold text-slate-500">DealSphere blog author</p>
                                </div>
                            </div>
                            <button
                                onClick={handleShare}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:border-orange-300 hover:text-orange-600"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy Link'}
                            </button>
                        </div>

                        <div className="mt-8 overflow-hidden rounded-[32px] bg-slate-50 border border-slate-100 flex justify-center items-center h-[350px] relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <img
                                src={optimizeImageUrl(blog.featuredImage || blog.image)}
                                alt={blog.title}
                                className="h-[90%] w-auto object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>
                    </div>

                    <div className="mx-auto mt-14 grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <article className="mx-auto max-w-4xl space-y-8">
                            {contentBlocks.map(renderBlock)}

                            {(blog.tags || []).length > 0 && (
                                <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-5">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Tags</p>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {blog.tags.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => window.location.assign(`/blog?tag=${encodeURIComponent(tag)}`)}
                                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                                            >
                                                <Tag size={12} /> {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <section id="comments" className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <MessageSquare size={20} className="text-orange-500" />
                                    <h2 className="text-2xl font-black tracking-tight text-slate-950">Community comments</h2>
                                </div>
                                <form onSubmit={handleComment} className="mt-6 space-y-4">
                                    <input
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="Your name"
                                        className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400"
                                    />
                                    <textarea
                                        value={comment}
                                        onChange={(event) => setComment(event.target.value)}
                                        placeholder="Share your thought on this blog"
                                        rows={4}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400"
                                    />
                                    <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white">
                                        Post comment <ArrowRight size={14} />
                                    </button>
                                </form>

                                <div className="mt-8 space-y-5">
                                    {comments.length > 0 ? comments.map((entry) => (
                                        <div key={entry._id || `${entry.userName}-${entry.createdAt}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-black text-slate-950">{entry.userName || entry.name}</p>
                                                <p className="text-[11px] font-semibold text-slate-500">{formatBlogDate(entry.createdAt)}</p>
                                            </div>
                                            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">{entry.text}</p>
                                        </div>
                                    )) : (
                                        <p className="text-sm font-semibold text-slate-500">No comments yet. Start the conversation.</p>
                                    )}
                                </div>
                            </section>
                        </article>

                        <aside className="space-y-6">
                            {blog.relatedDeals?.length > 0 && (
                                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <ShoppingBag size={18} className="text-orange-500" />
                                        <h3 className="text-xl font-black tracking-tight text-slate-950">Related deals</h3>
                                    </div>
                                    <div className="mt-5 space-y-4">
                                        {blog.relatedDeals.map((deal) => (
                                            <Link
                                                key={`${deal.dealId || deal.productUrl}-${deal.title}`}
                                                to={deal.dealId ? `/product/${deal.dealId}` : (deal.productUrl || '/deals')}
                                                className="group block rounded-2xl border border-slate-100 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50/40"
                                            >
                                                <div className="flex gap-3">
                                                    <img
                                                        src={getMainProductImage(deal)}
                                                        alt={deal.title}
                                                        className="h-20 w-20 rounded-2xl object-cover"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 text-sm font-black leading-snug text-slate-950 group-hover:text-orange-600">
                                                            {deal.title}
                                                        </p>
                                                        <p className="mt-2 text-xs font-semibold text-slate-500">{deal.store}</p>
                                                        <p className="mt-2 text-sm font-black text-slate-950">
                                                            ₹{Number(deal.dealPrice || 0).toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {blog.relatedBlogs?.length > 0 && (
                                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                                    <h3 className="text-xl font-black tracking-tight text-slate-950">More from the blog</h3>
                                    <div className="mt-5 space-y-4">
                                        {blog.relatedBlogs.map((related) => (
                                            <Link key={related.slug} to={`/blog/${related.slug}`} className="group block rounded-2xl border border-slate-100 p-4 hover:border-orange-200 hover:bg-orange-50/30">
                                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{related.category}</p>
                                                <p className="mt-2 text-sm font-black leading-snug text-slate-950 group-hover:text-orange-600">
                                                    {related.title}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </main>

            <Footer showToast={showToast} />
        </div>
    );
};

export default BlogPost;
