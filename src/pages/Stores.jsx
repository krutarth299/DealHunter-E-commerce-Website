import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, CheckCircle2, BadgePercent, Store as StoreIcon, Package } from 'lucide-react';
import SEO from '../components/SEO';
import { getLiveStoresFromDeals } from '../utils/dealCollections';
import { SITE_ORIGIN } from '../config/brand';

const categoryTone = {
    Electronics: { color: 'border-blue-200 hover:border-blue-400', accent: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700' },
    Fashion: { color: 'border-rose-200 hover:border-rose-400', accent: 'text-rose-600', badgeBg: 'bg-rose-50 text-rose-700' },
    Beauty: { color: 'border-pink-200 hover:border-pink-400', accent: 'text-pink-600', badgeBg: 'bg-pink-50 text-pink-700' },
    Grocery: { color: 'border-emerald-200 hover:border-emerald-400', accent: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700' },
    'Home & Kitchen': { color: 'border-cyan-200 hover:border-cyan-400', accent: 'text-cyan-700', badgeBg: 'bg-cyan-50 text-cyan-700' }
};

const defaultTone = { color: 'border-amber-200 hover:border-amber-400', accent: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700' };
const getStoreSlug = (value = '') => (
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'store'
);

const mergeStores = (localStores = [], apiStores = []) => {
    const byName = new Map();

    [...apiStores, ...localStores].forEach((store) => {
        const name = String(store.name || store.store || '').trim();
        const dealsCount = Number(store.dealsCount || 0);
        const couponsCount = Number(store.couponsCount || 0);
        const count = Number(store.count || dealsCount + couponsCount || 0);
        if (!name || count <= 0) return;

        const existing = byName.get(name) || {};
        byName.set(name, {
            ...existing,
            ...store,
            name,
            store: name,
            dealsCount: Math.max(Number(existing.dealsCount || 0), dealsCount),
            couponsCount: Math.max(Number(existing.couponsCount || 0), couponsCount),
            count: Math.max(Number(existing.count || 0), count),
            categories: store.categories || existing.categories || []
        });
    });

    return [...byName.values()].sort((a, b) => b.dealsCount - a.dealsCount || a.name.localeCompare(b.name));
};

const Stores = ({
    onSearch,
    user,
    wishlist,
    setIsAddDealOpen,
    apiBase,
    deals = [],
    dealsLoading = false,
    dealsError = ''
}) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [apiStores, setApiStores] = useState([]);
    const [storesLoading, setStoresLoading] = useState(false);
    const [storesError, setStoresError] = useState('');

    const storesFromDeals = useMemo(() => getLiveStoresFromDeals(deals), [deals]);
    const liveStores = useMemo(() => mergeStores(storesFromDeals, apiStores), [storesFromDeals, apiStores]);
    const categories = useMemo(() => {
        const storeCategories = liveStores
            .flatMap((store) => [store.category, ...(store.categories || [])])
            .filter(Boolean);
        return ['All', ...new Set(storeCategories)].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)));
    }, [liveStores]);
    const totalDeals = liveStores.reduce((sum, store) => sum + Number(store.dealsCount || 0), 0);
    const totalCoupons = liveStores.reduce((sum, store) => sum + Number(store.couponsCount || 0), 0);
    const storesStructuredData = useMemo(() => ({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Stores With Live Deals',
        description: 'Live store directory generated from active DealSphere deals and coupon collections.',
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: liveStores.slice(0, 24).map((store, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: store.name,
                url: `${SITE_ORIGIN}/store/${encodeURIComponent(getStoreSlug(store.name))}`,
                description: `${Number(store.dealsCount || 0)} live deals and ${Number(store.couponsCount || 0)} live coupons`
            }))
        }
    }), [liveStores]);

    const filtered = liveStores.filter((store) => {
        const haystack = `${store.name} ${store.tagline || ''} ${store.category || ''}`.toLowerCase();
        const matchSearch = haystack.includes(searchTerm.toLowerCase());
        const matchCat = activeCategory === 'All'
            || store.category === activeCategory
            || (store.categories || []).includes(activeCategory);
        return matchSearch && matchCat;
    });

    useEffect(() => {
        if (!apiBase) return;

        let cancelled = false;
        const fetchStores = async ({ silent = false } = {}) => {
            if (!silent) setStoresLoading(true);
            setStoresError('');
            try {
                const response = await fetch(`${apiBase.replace('/user', '')}/stores`, { cache: 'no-store' });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data?.message || `Failed to load stores (${response.status})`);
                }
                if (!cancelled) {
                    setApiStores(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (!cancelled) {
                    setStoresError(error.message || 'Failed to load live stores.');
                }
            } finally {
                if (!cancelled) {
                    setStoresLoading(false);
                }
            }
        };

        fetchStores();
        const refreshStores = () => {
            if (document.visibilityState === 'hidden') return;
            fetchStores({ silent: true });
        };
        window.addEventListener('dealsphere:data-changed', refreshStores);
        return () => {
            cancelled = true;
            window.removeEventListener('dealsphere:data-changed', refreshStores);
        };
    }, [apiBase]);

    useEffect(() => {
        if (activeCategory !== 'All' && !categories.includes(activeCategory)) {
            Promise.resolve().then(() => {
                setActiveCategory('All');
            });
        }
    }, [activeCategory, categories]);

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 relative overflow-hidden">
            {/* Premium Mesh Gradients */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-50/60 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute top-[20%] left-0 w-[600px] h-[600px] bg-blue-50/40 blur-[120px] rounded-full -translate-x-1/2 pointer-events-none" />
            
            <SEO
                title="Stores With Live Deals"
                description="Explore stores with active DealSphere deals. Browse live offers, deal counts, top categories and discounts from stores that currently have products available."
                canonical="/stores"
                structuredData={storesStructuredData}
                breadcrumbs={[
                    { name: 'Home', url: '/' },
                    { name: 'Stores', url: '/stores' }
                ]}
            />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main className="flex-grow relative z-10">
                <div className="bg-white/70 backdrop-blur-xl border-b border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-12 text-center lg:text-left">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    <span className="text-[10px] md:text-xs font-black text-orange-600 uppercase tracking-widest">Live Store Network</span>
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[0.9]">
                                    Stores With <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Live Deals.</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-500 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                    This page is generated from real active deals. Empty stores are hidden automatically.
                                </p>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                {[
                                    { value: liveStores.length.toLocaleString('en-IN'), label: 'LIVE STORES' },
                                    { value: totalDeals.toLocaleString('en-IN'), label: 'LIVE DEALS' },
                                    { value: totalCoupons.toLocaleString('en-IN'), label: 'LIVE COUPONS' }
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-white px-5 py-5 rounded-[2rem] shadow-sm border border-slate-100/50 flex flex-col items-center min-w-[96px] md:min-w-[120px]">
                                        <p className="text-2xl md:text-3xl font-black text-slate-900">{stat.value}</p>
                                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 tracking-widest mt-1 uppercase">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col md:flex-row gap-4 p-2 bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 max-w-5xl mx-auto">
                            <div className="relative flex-1 group">
                                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search live stores..."
                                    className="w-full h-16 pl-16 pr-6 bg-transparent border-none text-base font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-medium"
                                />
                            </div>
                            <div className="w-px h-10 bg-slate-100 self-center hidden md:block" />
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-2">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setActiveCategory(category)}
                                        className={`h-12 px-6 rounded-xl text-xs font-black whitespace-nowrap transition-all uppercase tracking-widest ${
                                            activeCategory === category
                                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                                                : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    {(storesError || dealsError) && (
                        <div className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm font-bold text-amber-800">
                            {storesError || dealsError}
                        </div>
                    )}

                    {(storesLoading || dealsLoading) && liveStores.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="h-[420px] bg-white rounded-[3rem] border border-slate-100 p-8 animate-pulse">
                                    <div className="w-20 h-20 rounded-3xl bg-slate-100 mb-8" />
                                    <div className="h-8 bg-slate-100 rounded-xl mb-4" />
                                    <div className="h-4 bg-slate-100 rounded-xl w-3/4 mb-12" />
                                    <div className="h-28 bg-slate-100 rounded-3xl" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            <AnimatePresence mode="popLayout">
                                {filtered.map((store, index) => {
                                    const tone = categoryTone[store.category] || defaultTone;
                                    return (
                                        <motion.div
                                            layout
                                            key={store.name}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.45, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
                                            className="relative bg-white/70 backdrop-blur-md rounded-[3rem] border border-slate-200/60 hover:border-orange-500/30 p-8 group cursor-pointer transition-all duration-500 shadow-premium hover:shadow-premium-lg hover:-translate-y-2 flex flex-col gap-8 overflow-hidden"
                                            onClick={() => navigate('/store/' + encodeURIComponent(getStoreSlug(store.name)))}
                                        >
                                            <div className="flex items-start justify-between relative z-10">
                                                <div className="flex items-center gap-6 min-w-0">
                                                    <div className="relative shrink-0">
                                                        <div className="relative w-20 h-20 bg-white shadow-2xl shadow-slate-200/50 rounded-3xl flex items-center justify-center p-4 border border-slate-50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden">
                                                            <img
                                                                src={store.logo || `https://www.google.com/s2/favicons?domain=${store.name.toLowerCase().replace(/\s/g, '')}.com&sz=128`}
                                                                alt={store.name}
                                                                className="w-full h-full object-contain relative z-10"
                                                                onError={(e) => {
                                                                    e.target.parentElement.innerHTML = `<div class="w-full h-full absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"><span class="text-3xl font-black text-slate-400">${store.name[0]}</span></div>`;
                                                                }}
                                                            />
                                                            <StoreIcon size={28} className="absolute text-slate-300 z-0" />
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate">{store.name}</h3>
                                                            <CheckCircle2 size={16} className="text-blue-500 shrink-0" fill="currentColor" />
                                                        </div>
                                                        <p className="text-sm text-slate-400 font-bold leading-tight group-hover:text-slate-600 transition-colors">{store.tagline}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 relative z-10">
                                                <div className={`${tone.badgeBg} flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                                                    {store.dealsCount} live deals
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    {store.category}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-50 relative z-10">
                                                <div className="bg-slate-50/50 p-4 rounded-2xl group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Active Deals</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-black text-slate-900">{store.dealsCount.toLocaleString('en-IN')}</span>
                                                        <span className="text-[10px] font-bold text-emerald-500">live</span>
                                                    </div>
                                                </div>
                                                <div className={`p-4 rounded-2xl border transition-all ${tone.color} bg-white group-hover:shadow-md`}>
                                                    <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">Coverage</p>
                                                    <div className="flex items-center gap-2">
                                                        <BadgePercent size={18} className={tone.accent} />
                                                        <span className={`text-lg font-black ${tone.accent}`}>
                                                            {(store.categories || []).length || 1}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2 relative z-10">
                                                <div className="w-full h-14 rounded-2xl bg-slate-900 group-hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 group-hover:shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-3">
                                                    Browse Live Offers <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-500" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}

                    {filtered.length === 0 && !storesLoading && !dealsLoading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-32 flex flex-col items-center text-center px-6"
                        >
                            <div className="w-32 h-32 rounded-[3.5rem] bg-slate-50 flex items-center justify-center mb-10">
                                {liveStores.length === 0 ? <Package size={56} className="text-slate-200" /> : <Search size={56} className="text-slate-200" />}
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                                {liveStores.length === 0 ? 'No live stores yet' : 'No Stores Found'}
                            </h3>
                            <p className="text-slate-500 font-medium max-w-sm leading-relaxed mb-12">
                                {liveStores.length === 0
                                    ? 'Stores will appear here automatically as soon as live deals are available.'
                                    : 'Try a broader category or clear the search filter.'}
                            </p>
                            {liveStores.length > 0 && (
                                <button
                                    onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                                    className="h-16 px-12 rounded-[2rem] bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-all shadow-2xl active:scale-95"
                                >
                                    Show All Stores
                                </button>
                            )}
                        </motion.div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Stores;
