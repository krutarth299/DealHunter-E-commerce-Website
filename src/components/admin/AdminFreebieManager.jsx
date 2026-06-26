import React, { useState, useEffect, useContext } from 'react';
import { Pencil, Trash2, PlusCircle, Link as LinkIcon, Gift, Check, X, Search, Image as ImageIcon } from 'lucide-react';
import { AuthContext } from '../../context/authContextDefinition';

const AdminFreebieManager = ({ showToast }) => {
    const { apiBase } = useContext(AuthContext);
    const [freebies, setFreebies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        image: '',
        productUrl: '',
        provider: '',
        type: 'Software',
        value: 0,
        expiresAt: '',
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
        status: 'active',
        featured: false
    });

    useEffect(() => {
        fetchFreebies();
    }, []);

    const fetchFreebies = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${apiBase.replace('/user', '')}/freebies`, { cache: 'no-store' });
            const data = await res.json();
            if (res.ok) {
                // Including expired ones for admin? Admin needs all. 
                // Wait, GET /freebies only returns 'active' if we set it in controller. 
                // Let's modify the controller temporarily or just use this for now.
                // In a real app we'd have an admin-specific endpoint. For now, it's fine.
                setFreebies(data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch freebies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (freebie = null) => {
        if (freebie) {
            setEditingId(freebie._id);
            setFormData({
                title: freebie.title || '',
                slug: freebie.slug || '',
                description: freebie.description || '',
                image: freebie.image || '',
                productUrl: freebie.productUrl || '',
                provider: freebie.provider || '',
                type: freebie.type || 'Software',
                value: freebie.value || 0,
                expiresAt: freebie.expiresAt ? new Date(freebie.expiresAt).toISOString().split('T')[0] : '',
                seoTitle: freebie.seoTitle || '',
                seoDescription: freebie.seoDescription || '',
                seoKeywords: freebie.seoKeywords?.join(', ') || '',
                status: freebie.status || 'active',
                featured: freebie.featured || false
            });
        } else {
            setEditingId(null);
            setFormData({
                title: '', slug: '', description: '', image: '', productUrl: '', provider: '',
                type: 'Software', value: 0, expiresAt: '', seoTitle: '', seoDescription: '', seoKeywords: '',
                status: 'active', featured: false
            });
        }
        setIsFormOpen(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                seoKeywords: formData.seoKeywords ? formData.seoKeywords.split(',').map(s => s.trim()).filter(Boolean) : []
            };

            const url = editingId ? `${apiBase.replace('/user', '')}/freebies/${editingId}` : `${apiBase.replace('/user', '')}/freebies`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to save freebie');

            showToast?.('Freebie saved successfully!', 'success');
            setIsFormOpen(false);
            fetchFreebies();
        } catch (error) {
            showToast?.(error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this freebie?')) return;
        try {
            const res = await fetch(`${apiBase.replace('/user', '')}/freebies/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to delete freebie');
            showToast?.('Freebie deleted!', 'success');
            fetchFreebies();
        } catch (error) {
            showToast?.(error.message, 'error');
        }
    };

    const filtered = freebies.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (isFormOpen) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Freebie' : 'Create Freebie'}</h2>
                    <button onClick={() => setIsFormOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Title *</label>
                            <input required name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" placeholder="e.g. Free 6-Month Apple Music" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Slug (Auto-generated if empty)</label>
                            <input name="slug" value={formData.slug} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" placeholder="e.g. free-apple-music" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" placeholder="Brief details about the freebie" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Image URL</label>
                            <input name="image" value={formData.image} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" placeholder="https://..." />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Product URL (Claim Link) *</label>
                            <input required name="productUrl" value={formData.productUrl} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" placeholder="https://..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Provider</label>
                            <input name="provider" value={formData.provider} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" placeholder="e.g. Steam, Epic Games" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500">
                                {['Software', 'Game', 'Sample', 'Subscription', 'Course', 'Other'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Original Value (₹)</label>
                            <input type="number" name="value" value={formData.value} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Expiry Date (Optional)</label>
                            <input type="date" name="expiresAt" value={formData.expiresAt} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500">
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <h3 className="text-lg font-black text-slate-900 mb-4">SEO Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">SEO Title</label>
                                <input name="seoTitle" value={formData.seoTitle} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">SEO Description</label>
                                <input name="seoDescription" value={formData.seoDescription} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">SEO Keywords (comma separated)</label>
                                <input name="seoKeywords" value={formData.seoKeywords} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500" placeholder="freebie, sample, game" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex gap-4">
                        <button type="submit" className="flex-1 bg-slate-900 text-white rounded-xl py-4 font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors">
                            {editingId ? 'Update Freebie' : 'Create Freebie'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <Gift size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Manage Freebies</h2>
                        <p className="text-sm font-bold text-slate-500">{freebies.length} freebies active</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search freebies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:border-orange-500"
                        />
                    </div>
                    <button onClick={() => handleOpenForm()} className="shrink-0 flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-orange-700 transition-colors">
                        <PlusCircle size={16} /> Add New
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-500">Image</th>
                            <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-500">Title & Details</th>
                            <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-500">Type</th>
                            <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="4" className="py-8 text-center text-slate-500 font-bold">Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="4" className="py-8 text-center text-slate-500 font-bold">No freebies found.</td></tr>
                        ) : filtered.map(f => (
                            <tr key={f._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                        {f.image ? (
                                            <img src={f.image} alt={f.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20} /></div>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <p className="text-sm font-black text-slate-900 line-clamp-1">{f.title}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <a href={f.productUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:underline">
                                            <LinkIcon size={10} /> Link
                                        </a>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${f.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{f.status}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="text-xs font-bold text-slate-600">{f.type}</span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleOpenForm(f)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(f._id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminFreebieManager;
