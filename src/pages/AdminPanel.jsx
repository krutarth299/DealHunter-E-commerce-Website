import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Package, PlusCircle, Search, Trash2,
    TrendingUp, LogOut, Shield, ExternalLink, Edit3, Image as ImageIcon,
    Zap, DollarSign, Flame, Menu, X, CheckCircle, AlertCircle, Pencil, Activity,
    TrendingDown, Sparkles, Smartphone, Shirt, Gamepad2, Plane, Utensils, ShoppingBag, Layers,
    ChevronLeft, ChevronRight, Home as HomeIcon
} from 'lucide-react';
import { useNavigate, Link, Routes, Route, useLocation, Navigate } from 'react-router-dom';

const CATEGORY_MAP = {
    'Electronics': Smartphone,
    'Fashion': Shirt,
    'Gaming': Gamepad2,
    'Grocery': ShoppingBag,
    'Travel': Plane,
    'Food': Utensils,
    'Beauty': Sparkles,
    'Home & Kitchen': HomeIcon,
    'Appliances': Zap,
    'Home & Living': HomeIcon,
    'Multi-category': Layers
};
const DEFAULT_CAT_ICON = Layers;

/* ───────────────────────────────── helpers ── */
const token = () => 'anonymous'; // Auth system removed

const deriveStoreFromUrl = (rawUrl = '') => {
    try {
        const host = new URL(rawUrl).hostname.toLowerCase();
        if (host.includes('amazon')) return 'Amazon';
        if (host.includes('flipkart')) return 'Flipkart';
        if (host.includes('meesho')) return 'Meesho';
        if (host.includes('myntra')) return 'Myntra';
        if (host.includes('ajio')) return 'Ajio';
        if (host.includes('nykaa')) return 'Nykaa';
        return host.replace(/^www\./, '').split('.')[0]?.replace(/^./, c => c.toUpperCase()) || '';
    } catch {
        return '';
    }
};

const normalizeNumberLike = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return value.toString();
    const cleaned = String(value).replace(/[^\d.]/g, '');
    if (!cleaned) return '';
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed.toString() : '';
};

const sanitizeUrl = (u = '') => {
    let val = String(u || '').trim();
    if (!val) return '';
    if (!/^https?:\/\//i.test(val) && /^(www\.)?meesho\./i.test(val)) {
        val = `https://${val}`;
    }
    if (!/^https?:\/\//i.test(val) && /^(www\.)?blinkit\./i.test(val)) {
        val = `https://${val}`;
    }
    if (!/^https?:\/\//i.test(val) && /^meesho\./i.test(val)) {
        val = `https://www.${val}`;
    }
    if (!/^https?:\/\//i.test(val) && /^(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(val)) {
        val = `https://${val}`;
    }
    return val;
};

const isLikelyHttpUrl = (u = '') => /^https?:\/\//i.test(sanitizeUrl(u));

/* ───────────────────────────────── components ── */

const PriceHistoryChart = () => (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <TrendingDown size={16} className="text-green-500" /> Price History (30 Days)
            </h4>
            <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Lowest Now</span>
        </div>
        <div className="h-20 w-full relative group">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"></stop>
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0"></stop>
                    </linearGradient>
                </defs>
                <path d="M 0 100 L 0,80 10,75 20,85 30,60 40,65 50,40 60,45 70,30 80,35 90,20 100,25 L 100 100 Z" fill="url(#chartGradient)"></path>
                <polyline fill="none" stroke="#10b981" strokeWidth="2" points="0,80 10,75 20,85 30,60 40,65 50,40 60,45 70,30 80,35 90,20 100,25" vectorEffect="non-scaling-stroke"></polyline>
            </svg>
        </div>
        <div className="flex justify-between mt-3 text-[9px] font-black text-slate-400">
            <span>30 DAYS AGO</span>
            <span>TODAY</span>
        </div>
    </div>
);

const PriceComparison = ({ price }) => {
    const p = Number(price) || 0;
    const comps = [
        { name: 'Myntra', price: p ? `₹${(p * 0.95).toFixed(0)}` : '17995', status: 'LOWEST', color: 'orange' },
        { name: 'Flipkart', price: p ? `₹${(p * 1.12).toFixed(0)}` : '₹69,999', status: 'Higher', color: 'slate' },
        { name: 'Amazon', price: p ? `₹${(p * 1.08).toFixed(0)}` : '₹68,490', status: 'Higher', color: 'slate' },
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h4 className="font-black text-slate-800 text-sm mb-4">Compare Prices</h4>
            <div className="space-y-3">
                {comps.map((c, i) => (
                    <div key={i} className={`flex items-center justify-between p-2.5 rounded-xl border ${c.status === 'LOWEST' ? 'bg-orange-50 border-orange-100' : 'px-2.5 py-1 border-transparent'}`}>
                        <span className={`text-xs font-black uppercase tracking-wider ${c.status === 'LOWEST' ? 'text-orange-700' : 'text-slate-500'}`}>{c.name}</span>
                        <span className={`text-sm font-black ${c.status === 'LOWEST' ? 'text-orange-600' : 'text-slate-400'}`}>{c.price}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${c.status === 'LOWEST' ? 'text-orange-500' : 'text-slate-300'}`}>{c.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════ */
const AdminPanel = ({ user, deals, setDeals, handleAddDeal, dealForm, setDealForm, showToast, apiBase }) => {
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const isAdmin = true; // Account system removed - accessibility granted to all admin routes
    const activeTab = routerLocation.pathname.split('/').pop() || 'dashboard';

    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [autoPopulated, setAutoPopulated] = useState(new Set());
    const [fetchStatus, setFetchStatus] = useState({ type: '', msg: '' });
    const [dashboardStats, setDashboardStats] = useState(null);
    const [categories, setCategories] = useState(['Electronics', 'Fashion', 'Gaming', 'Grocery', 'Travel', 'Food', 'Beauty', 'Home & Living', 'Multi-category']);

    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [oneClickEnabled, setOneClickEnabled] = useState(false);

    /* ── auth guard ── (Centrally managed by App.jsx Route) */

    /* ── stats ── */
    useEffect(() => {
        if (!isAdmin || !apiBase) return;
        setIsStatsLoading(true);

        const fetchStats = async () => {
            try {
                const r = await fetch(`${apiBase}/deals/stats`, { headers: { 'auth-token': token() } });
                if (r.ok) {
                    const data = await r.json();
                    setDashboardStats(data);
                }
            } catch (err) {
                console.error("Stats fetch error:", err);
            } finally {
                setIsStatsLoading(false);
            }
        };

        const fetchCategories = async () => {
            try {
                const r = await fetch(`${apiBase}/deals/categories`);
                if (r.ok) {
                    const data = await r.json();
                    if (data && data.length > 0) {
                        const merged = [...new Set([...data, 'Electronics', 'Fashion', 'Gaming', 'Grocery', 'Travel', 'Food', 'Beauty', 'Home & Living', 'Multi-category'])];
                        setCategories(merged.sort());
                    }
                }
            } catch (err) {
                console.error("Categories fetch error:", err);
            }
        };

        fetchStats();
        fetchCategories();
    }, [isAdmin, deals, apiBase]);

    /* ── reset form when switching away from add-deal ── */
    useEffect(() => {
        if (activeTab !== 'add-deal') {
            setEditMode(false);
            setEditId(null);
            setDealForm({ title: '', store: '', price: '', originalPrice: '', discount: '', image: '', link: '', category: '', description: '', extractionWarning: '', featured: false, isExpired: false });
            setFetchStatus({ type: '', msg: '' });
            setAutoPopulated(new Set());
        }
    }, [activeTab, setDealForm]);

    /* ── CRUD helpers ── */
    const handleEditClick = (deal) => {
        setEditMode(true);
        setEditId(deal.id || deal._id);
        setDealForm({
            title: deal.title || '', store: deal.store || '', price: deal.price || '',
            originalPrice: deal.originalPrice || '', discount: deal.discount || '',
            image: deal.image || '', images: deal.images || [], videos: deal.videos || [], link: deal.link || '',
            category: deal.category || '', description: deal.description || '',
            extractionWarning: deal.extractionWarning || '',
            featured: deal.featured || false
        });
        navigate('/admin/add-deal');
    };

    const handleUpdateDeal = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        try {
            const dealsApi = apiBase.replace('/user', '') + `/deals/${editId}`;
            const r = await fetch(dealsApi, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'auth-token': token() },
                body: JSON.stringify(dealForm)
            });
            if (r.ok) {
                const updated = await r.json();
                setDeals(deals.map(d => (d._id === editId || d.id === editId) ? updated : d));
                showToast?.('Deal updated!', 'success');
                navigate('/admin/dashboard');
            } else { showToast?.('Update failed', 'error'); }
        } catch { showToast?.('Server error', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleDeleteDeal = async (id) => {
        if (!window.confirm('Delete this deal?')) return;
        setIsLoading(true);
        try {
            const dealsApi = apiBase.replace('/user', '') + `/deals/${id}`;
            const r = await fetch(dealsApi, { method: 'DELETE', headers: { 'auth-token': token() } });
            if (r.ok) {
                setDeals(deals.filter(d => d._id !== id && d.id !== id));
                showToast?.('Deal deleted!', 'success');
            } else { showToast?.('Delete failed', 'error'); }
        } catch { showToast?.('Server error', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleLocalAddDeal = async (e) => {
        setIsLoading(true);
        try {
            await handleAddDeal(e);
            navigate('/admin/dashboard'); // Redirect to dashboard after publish
        } finally {
            setIsLoading(false);
        }
    };

    const handleFetchUrl = async (urlParam, autoPublish = false) => {
        const url = sanitizeUrl(urlParam || dealForm.link);
        if (!url) { setFetchStatus({ type: 'error', msg: 'Enter a URL first' }); return null; }
        if (!isLikelyHttpUrl(url)) { setFetchStatus({ type: 'error', msg: 'Enter a valid http/https URL' }); return null; }
        setFetchStatus({ type: 'loading', msg: autoPublish ? 'Extracting & Publishing...' : 'Extracting deal info...' });
        setIsLoading(true);
        try {
            const extractApi = apiBase.replace('/user', '') + '/deals/extract';
            const r = await fetch(extractApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'auth-token': token() },
                body: JSON.stringify({ url })
            });
            let data = {};
            try {
                data = await r.json();
            } catch (parseErr) {
                data = { message: 'Invalid server response' };
            }

            if (r.ok) {
                const fields = ['title', 'image', 'images', 'price', 'originalPrice', 'discount', 'store', 'description'];
                const populated = new Set();
                const normalizedPrice = normalizeNumberLike(data.price);
                const normalizedOriginalPrice = normalizeNumberLike(data.originalPrice);
                const fallbackStore = data.store || deriveStoreFromUrl(data.link || url);
                const computedDiscount = (!data.discount && normalizedPrice && normalizedOriginalPrice &&
                    Number(normalizedOriginalPrice) > Number(normalizedPrice))
                    ? `${Math.round((1 - Number(normalizedPrice) / Number(normalizedOriginalPrice)) * 100)}%`
                    : '';

                const nextForm = { ...dealForm };
                fields.forEach(f => {
                    if (data[f] != null && data[f] !== '') { nextForm[f] = data[f]; populated.add(f); }
                });
                if (normalizedPrice) { nextForm.price = normalizedPrice; populated.add('price'); }
                if (normalizedOriginalPrice) { nextForm.originalPrice = normalizedOriginalPrice; populated.add('originalPrice'); }
                if (!nextForm.store && fallbackStore) { nextForm.store = fallbackStore; populated.add('store'); }
                if (!nextForm.discount && computedDiscount) { nextForm.discount = computedDiscount; populated.add('discount'); }
                if (data.link) nextForm.link = data.link;
                if (!data.link) nextForm.link = url;
                if (data.extractionWarning) nextForm.extractionWarning = data.extractionWarning;
                else nextForm.extractionWarning = '';

                setDealForm(nextForm);
                setAutoPopulated(populated);
                setFetchStatus({ type: 'success', msg: `✓ Extracted ${populated.size} fields` });
                showToast?.('Smart Extraction Complete!', 'success');

                if (autoPublish) {
                    const success = await handleAddDeal(null, {
                        ...nextForm,
                        rating: (Math.random() * 2 + 3).toFixed(1)
                    });
                    if (success) {
                        navigate('/admin/dashboard');
                    }
                }
                return nextForm;
            } else {
                if (r.status === 401) {
                    localStorage.removeItem('auth-token');
                    localStorage.removeItem('user');
                    window.location.reload();
                    return null;
                }
                let msg = 'Extraction limited';
                if (r.status === 403) msg = 'Extraction restricted by store';
                if (r.status === 400) msg = data.message || 'Invalid Request / URL';
                setFetchStatus({ type: 'error', msg });
                return null;
            }
        } catch (err) {
            setFetchStatus({ type: 'error', msg: 'Network error or server down' });
            return null;
        }
        finally { setIsLoading(false); }
    };

    const clearAuto = (field) => setAutoPopulated(prev => { const n = new Set(prev); n.delete(field); return n; });

    const filteredDeals = deals.filter(d => d && (
        (d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (d.store?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (d.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    ));

    /* ── stat cards ── */
    const STATS = [
        { label: 'Total Deals', value: dashboardStats?.totalDeals ?? deals.length, icon: Package, color: 'bg-orange-500', light: 'bg-orange-50', textColor: 'text-orange-600', trend: '+12%' },
        { label: 'Active Stores', value: dashboardStats ? Object.keys(dashboardStats.storeStats ?? {}).length : '—', icon: Activity, color: 'bg-blue-500', light: 'bg-blue-50', textColor: 'text-blue-600', trend: '+5%' },
        { label: 'Categories', value: dashboardStats ? Object.keys(dashboardStats.categoryStats ?? {}).length : '—', icon: TrendingUp, color: 'bg-emerald-500', light: 'bg-emerald-50', textColor: 'text-emerald-600', trend: '+3' },
        { label: 'Click Rate', value: '8.4%', icon: Zap, color: 'bg-amber-500', light: 'bg-amber-50', textColor: 'text-amber-600', trend: '+2.1%' },
    ];

    const NAV = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'add-deal', label: 'Add Deal', icon: PlusCircle },
    ];

    /* ────────── label helper for auto-filled fields ────────── */
    const AutoBadge = ({ field }) => autoPopulated.has(field) ? (
        <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
            <CheckCircle size={8} /> Auto
        </span>
    ) : null;

    /* ────────── clean input class ────────── */
    const inputCls = 'w-full bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-xl py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:bg-white transition-all duration-300 font-medium hover:bg-white/80 shadow-sm';

    /* ─── render ─── */
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* ═══ SIDEBAR ═══ */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 h-screen flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                        <Flame size={18} className="text-white" fill="currentColor" />
                    </div>
                    <div>
                        <div className="text-lg font-black text-slate-900">Deal<span className="text-orange-500">Hunter</span></div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Panel</div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="ml-auto text-slate-400 lg:hidden hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                {/* Admin info */}
                <div className="mx-4 my-3 bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow flex-shrink-0">
                        <Shield size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{user?.name || 'Admin'}</p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            </span>
                            Session Secure
                        </p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-2 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mt-2 mb-2">Navigation</p>
                    {NAV.map(item => {
                        const active = activeTab === item.id;
                        return (
                            <button key={item.id} onClick={() => { navigate(item.id === 'dashboard' ? '/admin/dashboard' : `/admin/${item.id}`); setIsSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                <item.icon size={17} />
                                {item.label}
                                {item.id === 'manage-deals' && (
                                    <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {deals.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* View Website */}
                <div className="p-4 border-t border-slate-100">
                    <Link to="/" className="w-full mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">
                        <ExternalLink size={15} />
                        View Website
                    </Link>
                </div>
            </aside>

            {/* ═══ MAIN ═══ */}
            <main className="flex-1 min-w-0 h-screen overflow-y-auto flex flex-col">

                {/* Top header */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden">
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 capitalize">{activeTab.replace('-', ' ')}</h1>
                            <p className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search deals..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-orange-400 w-52 transition-all" />
                        </div>
                        <button onClick={() => { navigate('/admin/add-deal'); setEditMode(false); }}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-orange-200 transition-all active:scale-95">
                            <PlusCircle size={16} />
                            <span className="hidden sm:inline">Add Deal</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-6">
                    <AnimatePresence mode="wait">
                        {/* ═══════════ DASHBOARD ═══════════ */}
                        {activeTab === 'dashboard' && (
                            <motion.div key="dashboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">

                                {/* Stat Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {STATS.map((s, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                            className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-200/50 p-6 transition-all hover:shadow-orange-100/50 hover:bg-white/90 hover:shadow-md hover:-translate-y-0.5">
                                            {isStatsLoading ? (
                                                <div className="animate-pulse space-y-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                                                    <div className="h-7 w-16 bg-slate-100 rounded-lg" />
                                                    <div className="h-3 w-20 bg-slate-50 rounded" />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className={`w-10 h-10 ${s.light} rounded-xl flex items-center justify-center mb-4`}>
                                                        <s.icon size={20} className={s.textColor} />
                                                    </div>
                                                    <div className="text-2xl font-black text-slate-900">{s.value}</div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <div className="text-xs font-bold text-slate-400">{s.label}</div>
                                                        <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{s.trend}</div>
                                                    </div>
                                                </>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Category chart + recent deals */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Category bar chart */}
                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-base font-black text-slate-900">Deals by Category</h3>
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">Distribution across all categories</p>
                                            </div>
                                        </div>
                                        {dashboardStats ? (
                                            <div className="flex items-end gap-3 h-44">
                                                {Object.entries(dashboardStats.categoryStats ?? {}).slice(0, 8).map(([cat, count], idx) => {
                                                    const pct = Math.max(8, (count / (dashboardStats.totalDeals || 1)) * 100);
                                                    const COLORS = ['bg-orange-400', 'bg-blue-400', 'bg-emerald-400', 'bg-purple-400', 'bg-amber-400', 'bg-rose-400', 'bg-cyan-400', 'bg-pink-400'];
                                                    return (
                                                        <div key={cat} onClick={() => setSearchQuery(cat)} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end cursor-pointer">
                                                            <div className="text-[9px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                                                            <motion.div
                                                                initial={{ height: 0 }}
                                                                animate={{ height: `${pct}%` }}
                                                                transition={{ delay: 0.3 + idx * 0.05, ease: 'easeOut' }}
                                                                className={`w-full rounded-t-lg ${COLORS[idx % COLORS.length]} opacity-80 group-hover:opacity-100 transition-opacity`}
                                                            />
                                                            <div className="flex flex-col items-center gap-0.5 w-full">
                                                                {React.createElement(CATEGORY_MAP[cat] || DEFAULT_CAT_ICON, { size: 10, className: "text-slate-300 group-hover:text-orange-400 transition-colors" })}
                                                                <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center group-hover:text-orange-500 transition-colors">{cat.substring(0, 8)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="h-44 flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Recent deals */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-black text-slate-900">
                                                {searchQuery ? `Deals: ${searchQuery}` : 'Recent Deals'}
                                            </h3>
                                            {searchQuery && (
                                                <button onClick={() => setSearchQuery('')} className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors">
                                                    Clear Filter
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                            {(searchQuery ? filteredDeals : (dashboardStats?.recentDeals ?? deals.slice(0, 6)).slice(0, 8)).map((deal, i) => (
                                                <div key={i} className="flex items-center gap-3 group">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                                        {deal.image ? <img src={deal.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-orange-100" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate group-hover:text-orange-600 transition-colors">{deal.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-[10px] text-slate-400 font-medium">{deal.store}</p>
                                                            {deal.category && (
                                                                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-100 shadow-sm">
                                                                    {React.createElement(CATEGORY_MAP[deal.category] || DEFAULT_CAT_ICON, { size: 10, className: "text-orange-500" })}
                                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{deal.category}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-xs font-black text-orange-600">₹{deal.price}</div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteDeal(deal._id || deal.id); }}
                                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remove Deal">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {searchQuery && filteredDeals.length === 0 && (
                                                <div className="text-center py-8 text-sm text-slate-400 font-medium">
                                                    No deals match "{searchQuery}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Store breakdown table */}
                                {dashboardStats?.storeStats && (
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                        <h3 className="text-base font-black text-slate-900 mb-4">Deals by Store</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {Object.entries(dashboardStats.storeStats).slice(0, 8).map(([store, count]) => (
                                                <div key={store}
                                                    onClick={() => setSearchQuery(store)}
                                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-all group">
                                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-sm font-black text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                                        {store[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-slate-700 group-hover:text-orange-700 transition-colors">{store}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 group-hover:text-orange-500 transition-colors">{count} deals</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}


                        {/* ═══════════ ADD / EDIT DEAL ═══════════ */}
                        {activeTab === 'add-deal' && (
                            <motion.div key="add-deal" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="max-w-5xl mx-auto relative z-10">

                                {/* Decorative Glow Background */}
                                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-400/10 via-rose-400/5 to-purple-500/10 blur-3xl rounded-[3rem] pointer-events-none" />

                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                                                {editMode ? <Pencil size={20} /> : <Zap size={20} fill="currentColor" />}
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editMode ? 'Edit Deal' : 'Add New Deal'}</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 font-semibold pl-14">{editMode ? 'Update an existing deal' : 'Paste a product URL to automatically extract details'}</p>
                                    </div>
                                    {editMode && (
                                        <button onClick={() => { setEditMode(false); setDealForm({ title: '', store: '', price: '', originalPrice: '', discount: '', image: '', link: '', category: '', description: '', featured: false, isExpired: false }); }}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-all active:scale-95 shadow-sm">
                                            <X size={14} /> Cancel Edit
                                        </button>
                                    )}
                                </div>

                                {/* ════ HERO LINK BAR (AI SEARCH AESTHETIC) ════ */}
                                <div className="mb-10 relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-rose-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                                    <div className="relative bg-white/80 backdrop-blur-2xl rounded-full border border-white max-w-5xl mx-auto shadow-2xl shadow-slate-200/50 flex items-center p-2 focus-within:ring-4 focus-within:ring-orange-500/20 transition-all duration-500">

                                        <div className="pl-4 sm:pl-6 flex items-center pointer-events-none">
                                            <div className="relative w-10 h-10 flex items-center justify-center">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-full blur-[6px] opacity-70 animate-pulse" />
                                                <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-full flex items-center justify-center text-white relative z-10 shadow-inner">
                                                    <Sparkles size={18} className="text-white" />
                                                </div>
                                            </div>
                                        </div>

                                        <input
                                            type="url"
                                            className="w-full bg-transparent border-none py-4 px-4 sm:px-6 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-bold tracking-tight"
                                            placeholder="Paste a product URL here for automatic extraction..."
                                            value={dealForm.link}
                                            onChange={e => { setDealForm({ ...dealForm, link: e.target.value }); clearAuto('link'); }}
                                            onKeyDown={e => { if (e.key === 'Enter' && !isLoading) { e.preventDefault(); handleFetchUrl(e.currentTarget.value); } }}
                                            onPaste={(e) => {
                                                const text = e.clipboardData.getData('text');
                                                if (text && !isLoading) {
                                                    // Trigger fetch with pasted content
                                                    setTimeout(() => handleFetchUrl(text), 50);
                                                }
                                            }}
                                            required
                                        />

                                        <div className="pr-4 sm:pr-6 flex items-center gap-3">
                                            {isLoading && fetchStatus?.type === 'loading' ? (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full border border-orange-100 whitespace-nowrap">
                                                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="hidden sm:inline text-xs font-black tracking-wide">Extracting...</span>
                                                </div>
                                            ) : fetchStatus.type ? (
                                                <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border whitespace-nowrap shadow-sm backdrop-blur-md ${fetchStatus.type === 'success' ? 'bg-green-50/90 text-green-700 border-green-200' : 'bg-red-50/90 text-red-700 border-red-200'}`}>
                                                    {fetchStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                    <span className="hidden sm:inline text-xs font-black tracking-wide">{fetchStatus.msg}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {dealForm.extractionWarning && (
                                        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold px-4 py-2 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shadow-sm relative z-10 w-fit mx-auto text-center">
                                            <AlertCircle size={14} className="flex-shrink-0" /> {dealForm.extractionWarning}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                    {/* LEFT: Form */}
                                    <div className="lg:col-span-3 space-y-5">

                                        {/* Product info */}
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50">
                                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                                <Package size={14} className="text-orange-500" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Product Info</span>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Title *</label>
                                                        <AutoBadge field="title" />
                                                    </div>
                                                    <input type="text" className={inputCls} placeholder="e.g. Samsung Galaxy S24 Ultra..."
                                                        value={dealForm.title} onChange={e => { setDealForm({ ...dealForm, title: e.target.value }); clearAuto('title'); }} required />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Store *</label>
                                                            <AutoBadge field="store" />
                                                        </div>
                                                        <input type="text" className={inputCls} placeholder="Amazon, Flipkart..."
                                                            value={dealForm.store} onChange={e => { setDealForm({ ...dealForm, store: e.target.value }); clearAuto('store'); }} required />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Category *</label>
                                                            <AutoBadge field="category" />
                                                        </div>
                                                        <select
                                className={inputCls + " cursor-pointer"}
                                value={dealForm.category}
                                onChange={e => { setDealForm({ ...dealForm, category: e.target.value }); clearAuto('category'); }}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Description</label>
                                                        <AutoBadge field="description" />
                                                    </div>
                                                    <textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder="Short product description..."
                                                        value={dealForm.description} onChange={e => { setDealForm({ ...dealForm, description: e.target.value }); clearAuto('description'); }} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50">
                                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                                <DollarSign size={14} className="text-emerald-500" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Pricing</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { label: 'Deal Price *', field: 'price', prefix: '₹', type: 'number', required: true },
                                                    { label: 'MRP', field: 'originalPrice', prefix: '₹', type: 'number' },
                                                    { label: 'Discount', field: 'discount', placeholder: '50%' },
                                                ].map(({ label, field, prefix, type = 'text', required, placeholder }) => (
                                                    <div key={field}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide">{label}</label>
                                                            <AutoBadge field={field} />
                                                        </div>
                                                        <div className="relative">
                                                            {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">{prefix}</span>}
                                                            <input type={type} className={`${inputCls} ${prefix ? 'pl-7' : ''}`}
                                                                placeholder={placeholder || '0'}
                                                                value={dealForm[field] ?? ''}
                                                                onChange={e => { setDealForm({ ...dealForm, [field]: e.target.value }); clearAuto(field); }}
                                                                required={required} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {dealForm.price && dealForm.originalPrice && Number(dealForm.originalPrice) > Number(dealForm.price) && (
                                                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                                    <TrendingUp size={14} className="text-emerald-600" />
                                                    <span className="text-xs font-black text-emerald-700">
                                                        Saving ₹{(Number(dealForm.originalPrice) - Number(dealForm.price)).toLocaleString('en-IN')} · {Math.round((1 - Number(dealForm.price) / Number(dealForm.originalPrice)) * 100)}% OFF
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Media & link */}
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50">
                                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                                <ImageIcon size={14} className="text-purple-500" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Media & Link</span>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Image URL *</label>
                                                        <AutoBadge field="image" />
                                                    </div>
                                                    <div className="relative mb-4">
                                                        <ImageIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="url" className={`${inputCls} pl-10`} placeholder="https://cdn.example.com/product.jpg"
                                                            value={dealForm.image} onChange={e => { setDealForm({ ...dealForm, image: e.target.value }); clearAuto('image'); }} required />
                                                    </div>

                                                    {dealForm.images && dealForm.images.length > 0 && (
                                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                <ImageIcon size={12} /> Extracted Images Preview (All will be saved)
                                                            </label>
                                                            <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                                                {dealForm.images.map((imgUrl, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        onClick={() => setDealForm({ ...dealForm, image: imgUrl })}
                                                                        className={`relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden snap-center cursor-pointer transition-all ${dealForm.image === imgUrl ? 'ring-4 ring-orange-500 shadow-md scale-105' : 'bg-slate-50 border border-slate-200 hover:border-orange-300'}`}
                                                                    >
                                                                        <img
                                                                            src={imgUrl}
                                                                            alt={`Scraped Image ${idx}`}
                                                                            className="w-full h-full object-contain relative z-10"
                                                                            loading="lazy"
                                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                                        />
                                                                        {dealForm.image === imgUrl && (
                                                                            <div className="absolute inset-0 bg-orange-500/20 z-20 flex items-center justify-center pointer-events-none">
                                                                                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                                                                    <CheckCircle size={14} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                            {/* Featured Deal Toggle */}
                                            <div className="flex-1 flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                                <div>
                                                    <label className="text-sm font-bold text-indigo-900 block mb-0.5">Feature in Slider</label>
                                                    <span className="text-[10px] sm:text-xs text-indigo-600/80 font-medium leading-tight block">Showcase at the top of homepage</span>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer ml-2">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={dealForm.featured || false}
                                                        onChange={e => setDealForm({ ...dealForm, featured: e.target.checked })}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>

                                            {/* Expired Deal Toggle */}
                                            {editMode && <div className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div>
                                                    <label className="text-sm font-bold text-slate-900 block mb-0.5">Mark as Expired</label>
                                                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium leading-tight block">Grey out deal, hide Get Deal button</span>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer ml-2">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={dealForm.isExpired || false}
                                                        onChange={e => setDealForm({ ...dealForm, isExpired: e.target.checked })}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-800"></div>
                                                </label>
                                            </div>}
                                        </div>

                                        {/* Submit buttons */}
                                        <div className="flex gap-4 mt-8">
                                            <button type="button" disabled={isLoading}
                                                onClick={editMode ? handleUpdateDeal : handleLocalAddDeal}
                                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black py-4 rounded-2xl text-base shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(243,62,110,0.5)] transition-all duration-300 active:scale-95 disabled:opacity-60 overflow-hidden relative group">
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                                <div className="relative z-10 flex items-center gap-2">
                                                    {isLoading
                                                        ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {fetchStatus?.type === 'loading' ? 'Extracting...' : 'Publishing...'}</>
                                                        : editMode
                                                            ? <><Pencil size={18} /> Update Deal</>
                                                            : <><Zap size={18} fill="currentColor" /> Publish Deal</>
                                                    }
                                                </div>
                                            </button>
                                            {editMode && (
                                                <button type="button"
                                                    onClick={() => { setEditMode(false); setDealForm({ title: '', store: '', price: '', originalPrice: '', discount: '', image: '', link: '', category: '', description: '', featured: false, isExpired: false }); }}
                                                    className="px-6 py-4 rounded-2xl text-sm font-black text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT: Live Preview */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50 p-6 sticky top-24 overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100/50 relative z-10">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Live Preview</span>
                                            </div>

                                            {dealForm.image ? (
                                                <div className="rounded-3xl overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-100 group/card relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                                                    <div className="relative bg-white h-60 flex items-center justify-center p-8 overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-transparent pointer-events-none" />
                                                        <img src={dealForm.image} alt="Preview" className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-md z-10 transition-transform duration-500 group-hover/card:scale-105" />
                                                        {dealForm.discount && (
                                                            <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-orange-500/30 z-20">
                                                                {dealForm.discount} OFF
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-6 space-y-4 relative bg-white z-20 border-t border-slate-50">
                                                        <div className="flex items-center justify-between">
                                                            {dealForm.store && (
                                                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                                    {dealForm.store}
                                                                </span>
                                                            )}
                                                            {dealForm.category && (
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    {dealForm.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-base font-bold text-slate-800 line-clamp-2 leading-snug">{dealForm.title || 'Product Title'}</p>
                                                        <div className="flex items-end gap-3 pt-1">
                                                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                                                {dealForm.price ? `₹${Number(dealForm.price).toLocaleString('en-IN')}` : '₹0'}
                                                            </span>
                                                            {dealForm.originalPrice && (
                                                                <span className="text-sm font-semibold text-slate-400 line-through mb-1.5">
                                                                    ₹{Number(dealForm.originalPrice).toLocaleString('en-IN')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button disabled className="w-full bg-slate-900 text-white text-[13px] font-black py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-slate-900/10 opacity-90">
                                                            <span>GET DEAL NOW</span> <ExternalLink size={14} className="opacity-80" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-[22rem] border-2 border-dashed border-slate-200/60 rounded-[2rem] flex flex-col items-center justify-center gap-5 bg-white/40 backdrop-blur-sm transition-all duration-300 hover:bg-white/60 hover:border-slate-300 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                                    <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-slate-200/30 flex items-center justify-center transform -rotate-6 group-hover:rotate-0 transition-all duration-500 scale-95 group-hover:scale-100 relative z-10">
                                                        <ImageIcon size={32} className="text-slate-300 group-hover:text-orange-400 transition-colors duration-500" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-slate-400 text-center uppercase tracking-[0.2em] leading-relaxed relative z-10 transition-colors duration-500 group-hover:text-slate-500">Paste a Deal URL above<br />to preview the card</p>
                                                </div>
                                            )}

                                            {/* Scanner Enrichment Sections */}
                                            {dealForm.link && !isLoading && (
                                                <div className="mt-6 space-y-4">
                                                    <PriceHistoryChart />
                                                    <PriceComparison price={dealForm.price} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default AdminPanel;
