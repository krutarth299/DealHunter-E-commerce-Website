import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Bot, Eye, EyeOff, Pencil, PlusCircle, Save, Sparkles, Trash2 } from 'lucide-react';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import { formatBlogDate, normalizeBlogForUi } from '../../utils/blogs';

const DEFAULT_FORM = {
    title: '',
    slug: '',
    summary: '',
    content: '',
    featuredImage: '',
    category: '',
    tags: '',
    author: 'DealSphere Editorial',
    authorBio: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    status: 'draft',
    featured: false
};

const token = () => 'anonymous';

const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
        cache: 'no-store',
        ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.message || `Request failed (${response.status})`);
    }
    return data;
};

const AdminBlogManager = ({ adminApiBase, showToast }) => {
    const blogAdminApiBase = '/api/admin/blog';
    const [blogs, setBlogs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [editingId, setEditingId] = useState('');
    const [form, setForm] = useState(DEFAULT_FORM);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadBlogs = useCallback(async () => {
        setLoading(true);
        try {
            const headers = { 'auth-token': token() };
            const [blogResponse, filterResponse] = await Promise.all([
                fetchJson(`${blogAdminApiBase}?limit=100`, { headers }),
                fetchJson(`${blogAdminApiBase}/categories`, { headers })
            ]);

            const rawBlogs = Array.isArray(blogResponse.blogs)
                ? blogResponse.blogs
                : Array.isArray(blogResponse.items)
                    ? blogResponse.items
                    : [];

            setBlogs(rawBlogs.map(normalizeBlogForUi));
            setCategories(Array.isArray(filterResponse.categories) ? filterResponse.categories : []);
        } catch (error) {
            showToast?.(error.message || 'Failed to load blogs.', 'error');
        } finally {
            setLoading(false);
        }
    }, [blogAdminApiBase, showToast]);

    useEffect(() => {
        if (blogAdminApiBase) {
            Promise.resolve().then(() => {
                loadBlogs();
            });
        }
    }, [blogAdminApiBase, loadBlogs]);

    const filteredBlogs = useMemo(() => (
        blogs.filter((blog) => {
            const matchesStatus = statusFilter === 'all' || blog.status === statusFilter;
            const haystack = [blog.title, blog.summary, blog.category, ...(blog.tags || [])].join(' ').toLowerCase();
            const queryWords = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
            const matchesSearch = !searchTerm || queryWords.every(word => haystack.includes(word));
            return matchesStatus && matchesSearch;
        })
    ), [blogs, searchTerm, statusFilter]);

    const resetForm = () => {
        setEditingId('');
        setForm(DEFAULT_FORM);
    };

    const handleEdit = (blog) => {
        setEditingId(blog.id || blog._id);
        setForm({
            title: blog.title || '',
            slug: blog.slug || '',
            summary: blog.summary || '',
            content: blog.content || '',
            featuredImage: blog.featuredImage || blog.image || '',
            category: blog.category || '',
            tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
            author: blog.author || 'DealSphere Editorial',
            authorBio: blog.authorBio || '',
            seoTitle: blog.seoTitle || '',
            seoDescription: blog.seoDescription || '',
            seoKeywords: Array.isArray(blog.seoKeywords) ? blog.seoKeywords.join(', ') : '',
            status: blog.status || 'draft',
            featured: Boolean(blog.featured)
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                tags: form.tags,
                seoKeywords: form.seoKeywords
            };
            const headers = {
                'Content-Type': 'application/json',
                'auth-token': token()
            };
            const endpoint = editingId
                ? `${blogAdminApiBase}/${editingId}`
                : blogAdminApiBase;

            await fetchJson(endpoint, {
                method: editingId ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            showToast?.(editingId ? 'Blog updated.' : 'Blog created.', 'success');
            resetForm();
            await loadBlogs();
        } catch (error) {
            showToast?.(error.message || 'Failed to save blog.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (blogId) => {
        try {
            await fetchJson(`${blogAdminApiBase}/${blogId}`, {
                method: 'DELETE',
                headers: { 'auth-token': token() }
            });
            showToast?.('Blog deleted.', 'success');
            if (editingId === blogId) resetForm();
            await loadBlogs();
        } catch (error) {
            showToast?.(error.message || 'Failed to delete blog.', 'error');
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await fetchJson(`${blogAdminApiBase}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token()
                },
                body: JSON.stringify({ publish: false })
            });
            showToast?.(response.message || 'Automatic generation finished.', 'success');
            await loadBlogs();
        } catch (error) {
            showToast?.(error.message || 'Failed to generate blogs.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-orange-50/40 to-slate-50 p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">
                            <BookOpen size={13} />
                            Blog Control
                        </div>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Blog management</h2>
                        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
                            Create manual blogs, edit live SEO content, publish or unpublish posts, and generate draft articles from the current live deal database.
                        </p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-200 disabled:opacity-60"
                    >
                        <Bot size={15} />
                        {generating ? 'Generating...' : 'Generate Draft Blogs'}
                    </button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-slate-950">All blogs</h3>
                            <p className="mt-1 text-sm font-medium text-slate-500">{blogs.length} total posts in the live database.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search blogs"
                                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400"
                            />
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400"
                            >
                                <option value="all">All statuses</option>
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
                            ))
                        ) : filteredBlogs.length > 0 ? (
                            filteredBlogs.map((blog) => (
                                <div key={blog.id || blog._id} className="rounded-[24px] border border-slate-200 p-4 transition-colors hover:border-orange-200">
                                    <div className="flex gap-4">
                                        <img
                                            src={optimizeImageUrl(blog.featuredImage || blog.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80')}
                                            alt={blog.title}
                                            className="h-24 w-24 rounded-2xl object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${blog.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {blog.status}
                                                </span>
                                                {blog.autoGenerated && (
                                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">
                                                        auto
                                                    </span>
                                                )}
                                                {blog.featured && (
                                                    <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">
                                                        featured
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="mt-3 line-clamp-2 text-lg font-black tracking-tight text-slate-950">{blog.title}</h4>
                                            <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-600">{blog.summary}</p>
                                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                                                <span>{blog.category}</span>
                                                <span>{formatBlogDate(blog.publishedAt || blog.createdAt)}</span>
                                                <span>{blog.readTime}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => handleEdit(blog)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-orange-300 hover:text-orange-600">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(blog.id || blog._id)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-rose-300 hover:text-rose-600">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-[24px] border border-dashed border-slate-300 px-4 py-10 text-center">
                                <p className="text-lg font-black text-slate-900">No blogs found</p>
                                <p className="mt-2 text-sm font-medium text-slate-500">Try clearing the search or generate a few drafts from your live deals.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-slate-950">{editingId ? 'Edit blog' : 'Create blog'}</h3>
                            <p className="mt-1 text-sm font-medium text-slate-500">Build clean, indexable content for the public blog.</p>
                        </div>
                        {editingId ? (
                            <button onClick={resetForm} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700">
                                <PlusCircle size={14} /> New
                            </button>
                        ) : null}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <input value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} placeholder="Blog title" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400" />
                        <input value={form.slug} onChange={(event) => setForm((previous) => ({ ...previous, slug: event.target.value }))} placeholder="Slug (optional)" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400" />
                        <textarea value={form.summary} onChange={(event) => setForm((previous) => ({ ...previous, summary: event.target.value }))} placeholder="Short summary" rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400" />
                        <textarea value={form.content} onChange={(event) => setForm((previous) => ({ ...previous, content: event.target.value }))} placeholder="Full content. Use blank lines to separate sections." rows={10} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400" />
                        <input value={form.featuredImage} onChange={(event) => setForm((previous) => ({ ...previous, featuredImage: event.target.value }))} placeholder="Featured image URL" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400" />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <input value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))} placeholder="Blog category" list="blog-categories" className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400" />
                            <input value={form.tags} onChange={(event) => setForm((previous) => ({ ...previous, tags: event.target.value }))} placeholder="Tags, comma separated" className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <input value={form.author} onChange={(event) => setForm((previous) => ({ ...previous, author: event.target.value }))} placeholder="Author" className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400" />
                            <select value={form.status} onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400">
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                        </div>
                        <textarea value={form.authorBio} onChange={(event) => setForm((previous) => ({ ...previous, authorBio: event.target.value }))} placeholder="Author bio" rows={2} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400" />
                        <input value={form.seoTitle} onChange={(event) => setForm((previous) => ({ ...previous, seoTitle: event.target.value }))} placeholder="SEO title" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400" />
                        <textarea value={form.seoDescription} onChange={(event) => setForm((previous) => ({ ...previous, seoDescription: event.target.value }))} placeholder="SEO description" rows={2} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400" />
                        <input value={form.seoKeywords} onChange={(event) => setForm((previous) => ({ ...previous, seoKeywords: event.target.value }))} placeholder="SEO keywords, comma separated" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400" />

                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                            <input type="checkbox" checked={form.featured} onChange={(event) => setForm((previous) => ({ ...previous, featured: event.target.checked }))} />
                            Mark this post as featured
                        </label>

                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                                <Sparkles size={14} />
                                Preview
                            </div>
                            <h4 className="mt-3 text-xl font-black tracking-tight text-slate-950">{form.title || 'Your blog title will appear here'}</h4>
                            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{form.summary || 'Add a short summary to improve cards, SEO, and social sharing.'}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                                <span>{form.category || 'General'}</span>
                                <span>{form.status}</span>
                                <span>{form.author || 'DealSphere Editorial'}</span>
                                {form.featured ? <span className="text-orange-600">featured</span> : null}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-orange-200 disabled:opacity-60">
                                <Save size={14} />
                                {saving ? 'Saving...' : editingId ? 'Update Blog' : 'Create Blog'}
                            </button>
                            {editingId ? (
                                <button type="button" onClick={() => setForm((previous) => ({ ...previous, status: previous.status === 'published' ? 'draft' : 'published' }))} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-700">
                                    {form.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                                    Toggle Status
                                </button>
                            ) : null}
                        </div>
                    </form>

                    <datalist id="blog-categories">
                        {categories.map((category) => (
                            <option key={category} value={category} />
                        ))}
                    </datalist>
                </div>
            </div>
        </div>
    );
};

export default AdminBlogManager;
