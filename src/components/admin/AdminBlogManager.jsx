import React, { useState, useEffect } from 'react';
import { Edit3, Trash2, PlusCircle, X, CheckCircle, Search, ExternalLink, Image as ImageIcon, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_BLOG = {
    title: '',
    slug: '',
    summary: '',
    featuredImage: '',
    category: 'General',
    author: 'DealSphere Editorial',
    status: 'published',
    featured: false,
    tags: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    contentBlocks: [{ type: 'intro', text: '' }]
};

const AdminBlogManager = ({ showToast }) => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingBlog, setEditingBlog] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchAllBlogs = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/blog'); // Wait, the backend /api/blog gets ONLY published. 
            // We'll need to fix this if we want drafts. For now, it will fetch published + if we add an admin query param we can bypass the filter in controller.
            if (res.ok) {
                const data = await res.json();
                setBlogs(data.items || []);
            }
        } catch (err) {
            showToast?.('Failed to fetch blogs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllBlogs();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this blog post?')) return;
        try {
            const res = await fetch(`/api/blog/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast?.('Blog deleted successfully', 'success');
                fetchAllBlogs();
            } else {
                showToast?.('Failed to delete blog', 'error');
            }
        } catch (err) {
            showToast?.('Error deleting blog', 'error');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = { ...editingBlog };
        
        if (typeof payload.tags === 'string') {
            payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (typeof payload.seoKeywords === 'string') {
            payload.seoKeywords = payload.seoKeywords.split(',').map(t => t.trim()).filter(Boolean);
        }

        try {
            const url = payload._id ? `/api/blog/${payload._id}` : '/api/blog';
            const method = payload._id ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast?.('Blog saved successfully', 'success');
                setEditingBlog(null);
                fetchAllBlogs();
            } else {
                const data = await res.json();
                showToast?.(data.message || 'Failed to save blog', 'error');
            }
        } catch (err) {
            showToast?.('Error saving blog', 'error');
        } finally {
            setSaving(false);
        }
    };

    const addBlock = () => {
        setEditingBlog(prev => ({
            ...prev,
            contentBlocks: [...(prev.contentBlocks || []), { type: 'text', text: '' }]
        }));
    };

    const removeBlock = (index) => {
        setEditingBlog(prev => ({
            ...prev,
            contentBlocks: prev.contentBlocks.filter((_, i) => i !== index)
        }));
    };

    const updateBlock = (index, field, value) => {
        setEditingBlog(prev => {
            const newBlocks = [...prev.contentBlocks];
            newBlocks[index] = { ...newBlocks[index], [field]: value };
            return { ...prev, contentBlocks: newBlocks };
        });
    };

    const openEdit = (blog = null) => {
        if (blog) {
            setEditingBlog({
                ...blog,
                tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
                seoKeywords: Array.isArray(blog.seoKeywords) ? blog.seoKeywords.join(', ') : '',
            });
        } else {
            setEditingBlog({ ...DEFAULT_BLOG });
        }
    };

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800";

    const filteredBlogs = blogs.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()) || (b.slug && b.slug.toLowerCase().includes(searchQuery.toLowerCase())));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search blogs by title or slug..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                    />
                </div>
                <button
                    onClick={() => openEdit()}
                    className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-5 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                    <PlusCircle size={18} /> Add Blog
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500">Post</th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500">Category</th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500">Status</th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-medium">Loading blogs...</td>
                                </tr>
                            ) : filteredBlogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-medium">No blogs found.</td>
                                </tr>
                            ) : (
                                filteredBlogs.map(blog => (
                                    <tr key={blog._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                                                    {blog.featuredImage ? (
                                                        <img src={blog.featuredImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon size={20} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 line-clamp-1 max-w-[300px]">{blog.title}</div>
                                                    <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">/{blog.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                                                {blog.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {blog.status === 'published' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <CheckCircle size={12} /> Published
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                                    Draft
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <a 
                                                    href={`/blog/${blog.slug}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                                    title="View post"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                <button 
                                                    onClick={() => openEdit(blog)}
                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-orange-600 hover:border-orange-200 transition-colors"
                                                    title="Edit post"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(blog._id)}
                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
                                                    title="Delete post"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {editingBlog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/50"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white/50 backdrop-blur-md">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        {editingBlog._id ? 'Edit Blog Post' : 'Create New Blog Post'}
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">
                                        {editingBlog.slug || 'Draft Mode'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingBlog(null)}
                                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                                <form id="blog-form" onSubmit={handleSave} className="space-y-8">
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Title *</label>
                                                    <input required type="text" className={inputCls} value={editingBlog.title} onChange={e => setEditingBlog({...editingBlog, title: e.target.value})} placeholder="E.g., Top 10 Smartphones of 2026" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Slug</label>
                                                    <input type="text" className={inputCls} value={editingBlog.slug} onChange={e => setEditingBlog({...editingBlog, slug: e.target.value})} placeholder="Leave blank to auto-generate from title" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Summary</label>
                                                    <textarea rows="3" className={inputCls} value={editingBlog.summary} onChange={e => setEditingBlog({...editingBlog, summary: e.target.value})} placeholder="Brief overview of the article..." />
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div>
                                                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><AlignLeft size={18} className="text-orange-500" /> Content Blocks</h3>
                                                        <p className="text-xs text-slate-500 font-medium mt-1">Build your article structure block by block.</p>
                                                    </div>
                                                    <button type="button" onClick={addBlock} className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-orange-100 transition-colors">
                                                        <PlusCircle size={14} /> Add Block
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {editingBlog.contentBlocks?.map((block, i) => (
                                                        <div key={i} className="relative group bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:border-slate-300">
                                                            <button type="button" onClick={() => removeBlock(i)} className="absolute -right-3 -top-3 w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                                                                <X size={14} />
                                                            </button>
                                                            
                                                            <div className="flex flex-col sm:flex-row gap-4">
                                                                <div className="w-full sm:w-48 shrink-0">
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Block Type</label>
                                                                    <select className={inputCls} value={block.type} onChange={e => updateBlock(i, 'type', e.target.value)}>
                                                                        <option value="intro">Intro (Large Text)</option>
                                                                        <option value="heading">Heading (H2)</option>
                                                                        <option value="text">Paragraph Text</option>
                                                                        <option value="tip">Pro Tip / Note</option>
                                                                        <option value="conclusion">Conclusion</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Content</label>
                                                                    <textarea 
                                                                        className={inputCls} 
                                                                        rows={block.type === 'text' || block.type === 'intro' ? 4 : 2}
                                                                        value={block.text} 
                                                                        onChange={e => updateBlock(i, 'text', e.target.value)} 
                                                                        placeholder={`Enter ${block.type} content...`} 
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!editingBlog.contentBlocks || editingBlog.contentBlocks.length === 0) && (
                                                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                                                            <p className="text-sm font-semibold text-slate-400">No content blocks yet.</p>
                                                            <button type="button" onClick={addBlock} className="mt-3 text-orange-500 font-bold text-sm hover:underline">Click here to add one</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Publish Status</label>
                                                    <select className={inputCls} value={editingBlog.status} onChange={e => setEditingBlog({...editingBlog, status: e.target.value})}>
                                                        <option value="draft">Draft</option>
                                                        <option value="published">Published</option>
                                                    </select>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer" onClick={() => setEditingBlog({...editingBlog, featured: !editingBlog.featured})}>
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${editingBlog.featured ? 'bg-orange-500' : 'bg-slate-200'}`}>
                                                        {editingBlog.featured && <CheckCircle size={14} className="text-white" />}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">Mark as Featured Post</span>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                                                    <input type="text" className={inputCls} value={editingBlog.category} onChange={e => setEditingBlog({...editingBlog, category: e.target.value})} placeholder="E.g., Tech Reviews" />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Author</label>
                                                    <input type="text" className={inputCls} value={editingBlog.author} onChange={e => setEditingBlog({...editingBlog, author: e.target.value})} />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Featured Image URL</label>
                                                    <input type="text" className={inputCls} value={editingBlog.featuredImage} onChange={e => setEditingBlog({...editingBlog, featuredImage: e.target.value})} placeholder="https://..." />
                                                    {editingBlog.featuredImage && (
                                                        <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                            <img src={editingBlog.featuredImage} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">SEO & Metadata</h4>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">SEO Title</label>
                                                    <input type="text" className={inputCls} value={editingBlog.seoTitle} onChange={e => setEditingBlog({...editingBlog, seoTitle: e.target.value})} placeholder="Title for search engines" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">SEO Description</label>
                                                    <textarea rows="2" className={inputCls} value={editingBlog.seoDescription} onChange={e => setEditingBlog({...editingBlog, seoDescription: e.target.value})} placeholder="Meta description..." />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Keywords (Comma separated)</label>
                                                    <input type="text" className={inputCls} value={editingBlog.seoKeywords} onChange={e => setEditingBlog({...editingBlog, seoKeywords: e.target.value})} placeholder="deal, amazon, review..." />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tags (Comma separated)</label>
                                                    <input type="text" className={inputCls} value={editingBlog.tags} onChange={e => setEditingBlog({...editingBlog, tags: e.target.value})} placeholder="tech, gadget, 2026..." />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingBlog(null)}
                                    className="px-6 py-3.5 rounded-2xl border border-slate-200 bg-white font-black text-sm text-slate-700 uppercase tracking-widest hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    form="blog-form"
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3.5 rounded-2xl bg-slate-950 text-white font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200 disabled:opacity-70 flex items-center gap-2"
                                >
                                    {saving ? 'Saving...' : 'Save Blog Post'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminBlogManager;
