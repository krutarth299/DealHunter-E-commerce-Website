import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, Banknote, CheckCircle2, ChevronRight, Clock, Search, ShieldCheck, Sparkles, Store, WalletCards, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import CouponCard from '../components/CouponCard';
import { normalizeCouponsForUi } from '../utils/couponUi';

const OFFER_FILTERS = [
    { label: 'All Offers', value: 'all', icon: BadgePercent },
    { label: 'Codes', value: 'coupon', icon: BadgePercent },
    { label: 'Deals', value: 'deal', icon: Zap },
    { label: 'Cashback', value: 'cashback', icon: WalletCards },
    { label: 'Bank', value: 'bank', icon: Banknote },
    { label: 'App Only', value: 'app', icon: Sparkles }
];

const sortCoupons = (coupons = [], sortMode = 'popular') => [...coupons].sort((a, b) => {
    if (sortMode === 'expiry') return (a.expiryTimestamp || Number.MAX_SAFE_INTEGER) - (b.expiryTimestamp || Number.MAX_SAFE_INTEGER);
    if (sortMode === 'newest') return new Date(b.createdAt || b.verifiedAt || 0) - new Date(a.createdAt || a.verifiedAt || 0);
    if (sortMode === 'verified') return new Date(b.verifiedAt || b.updatedAt || 0) - new Date(a.verifiedAt || a.updatedAt || 0);
    const scoreA = (a.isFeatured ? 200 : 0) + (a.isTrending ? 100 : 0) + Number(a.usageCount || a.popularity || 0);
    const scoreB = (b.isFeatured ? 200 : 0) + (b.isTrending ? 100 : 0) + Number(b.usageCount || b.popularity || 0);
    return scoreB - scoreA;
});

const buildStoreSummaries = (coupons = []) => {
    const map = new Map();
    coupons.forEach((coupon) => {
        const current = map.get(coupon.storeSlug) || {
            store: coupon.store,
            storeSlug: coupon.storeSlug,
            activeCoupons: 0,
            offerTypes: new Set()
        };
        current.activeCoupons += 1;
        current.offerTypes.add(coupon.offerLabel);
        map.set(coupon.storeSlug, current);
    });

    return [...map.values()]
        .map((store) => ({ ...store, offerTypes: [...store.offerTypes] }))
        .sort((a, b) => b.activeCoupons - a.activeCoupons || a.store.localeCompare(b.store));
};

const Coupons = ({ user, onSearch, setIsAddDealOpen, wishlist, apiBase, showToast }) => {
    const [coupons, setCoupons] = useState([]);
    const [summary, setSummary] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [offerFilter, setOfferFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [sortMode, setSortMode] = useState('popular');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!apiBase) return;

        let cancelled = false;
        const fetchCoupons = async ({ silent = false } = {}) => {
            if (!silent) setLoading(true);
            setError('');
            try {
                const baseUrl = apiBase.replace('/user', '');
                const [couponsResponse, summaryResponse] = await Promise.all([
                    fetch(`${baseUrl}/coupons`),
                    fetch(`${baseUrl}/coupons/summary`)
                ]);
                const couponData = await couponsResponse.json().catch(() => []);
                const summaryData = await summaryResponse.json().catch(() => null);
                if (!couponsResponse.ok) throw new Error(couponData?.message || 'Failed to load coupons');
                if (!cancelled) {
                    setCoupons(normalizeCouponsForUi(couponData));
                    setSummary(summaryResponse.ok ? summaryData : null);
                }
            } catch (fetchError) {
                if (!cancelled) setError(fetchError.message || 'Failed to load coupons');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchCoupons();
        const refreshCouponsSilently = () => fetchCoupons({ silent: true });
        window.addEventListener('dealsphere:coupons-changed', refreshCouponsSilently);
        const intervalId = window.setInterval(refreshCouponsSilently, 30000);

        return () => {
            cancelled = true;
            window.removeEventListener('dealsphere:coupons-changed', refreshCouponsSilently);
            window.clearInterval(intervalId);
        };
    }, [apiBase]);

    const categories = useMemo(() => (
        ['All', ...new Set(coupons.map((coupon) => coupon.category).filter(Boolean))]
            .sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)))
    ), [coupons]);
    const storeSummaries = useMemo(() => buildStoreSummaries(coupons), [coupons]);
    const featuredCoupons = useMemo(() => sortCoupons(coupons.filter((coupon) => coupon.isFeatured || coupon.isTrending)).slice(0, 3), [coupons]);
    const expiringSoon = useMemo(() => (
        sortCoupons(coupons.filter((coupon) => coupon.expiryTimestamp && coupon.expiryTimestamp - Date.now() < 4 * 86400000), 'expiry').slice(0, 4)
    ), [coupons]);
    const filteredCoupons = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const visible = coupons.filter((coupon) => {
            const haystack = `${coupon.title} ${coupon.description} ${coupon.store} ${coupon.category} ${coupon.code}`.toLowerCase();
            return coupon.isActive
                && (!query || haystack.includes(query))
                && (offerFilter === 'all' || coupon.offerType === offerFilter)
                && (categoryFilter === 'All' || coupon.category === categoryFilter);
        });
        return sortCoupons(visible, sortMode);
    }, [categoryFilter, coupons, offerFilter, searchTerm, sortMode]);
    const heroCoupons = featuredCoupons.length ? featuredCoupons : filteredCoupons.slice(0, 3);

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
            <SEO
                title="Verified Coupons, Promo Codes & Cashback Offers"
                description="Reveal verified coupon codes, cashback offers, bank promotions and live store offers on DealSphere. Search coupons by store, category and offer type."
                canonical="/coupons"
                itemList={filteredCoupons.map((coupon) => ({ ...coupon, pageUrl: `/coupons/${coupon.storeSlug}` }))}
                breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'Coupons', url: '/coupons' }]}
            />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main>
                <section className="relative overflow-hidden border-b border-slate-100 bg-white">
                    <div className="absolute -right-32 -top-40 h-[32rem] w-[32rem] rounded-full bg-orange-100 blur-3xl" />
                    <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-20 lg:items-center">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">
                                <CheckCircle2 size={14} />
                                Verified Coupons + Live Deals
                            </div>
                            <h1 className="text-5xl font-black leading-[0.9] tracking-tighter text-slate-950 md:text-7xl">
                                Coupon codes, cashback & store offers.
                            </h1>
                            <p className="mt-7 max-w-2xl text-lg font-semibold leading-relaxed text-slate-500">
                                Reveal trusted promo codes, activate cashback-style offers, and jump into product deals from the same store.
                            </p>

                            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl">
                                {[
                                    { value: summary?.activeCoupons ?? coupons.length, label: 'active offers' },
                                    { value: summary?.verifiedCoupons ?? coupons.filter((c) => c.isVerified).length, label: 'verified' },
                                    { value: storeSummaries.length, label: 'coupon stores' }
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-[1.7rem] border border-slate-100 bg-white p-4 text-center shadow-sm">
                                        <p className="text-3xl font-black tracking-tighter text-slate-950">{Number(stat.value || 0).toLocaleString('en-IN')}</p>
                                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[2.5rem] border border-slate-100 bg-slate-950 p-5 shadow-2xl shadow-slate-900/20">
                            <div className="mb-5 flex items-center justify-between text-white">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">Featured coupon stack</p>
                                    <h2 className="mt-2 text-3xl font-black tracking-tighter">Today’s best savings</h2>
                                </div>
                                <BadgePercent size={36} className="text-orange-400" />
                            </div>
                            <div className="space-y-3">
                                {heroCoupons.map((coupon) => (
                                    <Link key={coupon._id || coupon.title} to={`/coupons/${coupon.storeSlug}`} className="block rounded-[1.7rem] bg-white p-4 transition-all hover:-translate-y-1">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">{coupon.store} · {coupon.offerLabel}</p>
                                                <p className="mt-1 line-clamp-2 text-base font-black leading-tight text-slate-950">{coupon.title}</p>
                                            </div>
                                            <ChevronRight className="shrink-0 text-slate-300" />
                                        </div>
                                    </Link>
                                ))}
                                {!loading && heroCoupons.length === 0 && (
                                    <div className="rounded-[1.7rem] border border-dashed border-white/15 p-8 text-center text-sm font-bold text-slate-400">
                                        No coupons yet. Add the first coupon from Admin → Coupons.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
                            <label className="relative block">
                                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search coupons by store, bank, code..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-500/10" />
                            </label>
                            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 outline-none">
                                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 outline-none">
                                <option value="popular">Popular first</option>
                                <option value="verified">Recently verified</option>
                                <option value="newest">Newest first</option>
                                <option value="expiry">Expiring first</option>
                            </select>
                        </div>

                        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                            {OFFER_FILTERS.map(({ label, value, icon: Icon }) => (
                                <button key={value} type="button" onClick={() => setOfferFilter(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest ${offerFilter === value ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600'}`}>
                                    <Icon size={14} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {storeSummaries.length > 0 && (
                    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
                        <div className="mb-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Top coupon stores</p>
                            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Store-wise savings</h2>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {storeSummaries.slice(0, 8).map((store) => (
                                <Link key={store.storeSlug} to={`/coupons/${store.storeSlug}`} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Store /></div>
                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">{store.activeCoupons} live</span>
                                    </div>
                                    <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{store.store}</h3>
                                    <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-500">{store.offerTypes.join(' · ') || 'verified offers'}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
                    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Latest verified coupons</p>
                            <h2 className="mt-2 text-4xl font-black tracking-tighter text-slate-950">Reveal, copy, save.</h2>
                        </div>
                        <div className="inline-flex items-center gap-2 text-sm font-black text-slate-500">
                            <ShieldCheck size={18} className="text-emerald-500" />
                            Merchant opens in a new tab.
                        </div>
                    </div>

                    {error && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
                    {loading ? (
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-96 animate-pulse rounded-[2rem] bg-white" />)}
                        </div>
                    ) : filteredCoupons.length > 0 ? (
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {filteredCoupons.map((coupon, index) => (
                                <CouponCard key={coupon._id || `${coupon.storeSlug}-${coupon.title}-${index}`} coupon={coupon} variant={index === 0 ? 'featured' : 'default'} onToast={showToast} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[2.5rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                            <BadgePercent size={42} className="mx-auto mb-5 text-slate-300" />
                            <h3 className="text-3xl font-black tracking-tight text-slate-950">No matching coupons yet</h3>
                            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-slate-500">Coupons you add in admin will appear here automatically. Try clearing filters or create a verified store coupon.</p>
                        </div>
                    )}
                </section>

                {expiringSoon.length > 0 && (
                    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
                        <div className="rounded-[2.5rem] bg-slate-950 p-6 text-white md:p-8">
                            <div className="mb-6 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">Expiring soon</p>
                                    <h2 className="mt-2 text-3xl font-black tracking-tight">Use these before they disappear</h2>
                                </div>
                                <Clock className="text-orange-400" />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {expiringSoon.map((coupon) => <CouponCard key={coupon._id || coupon.title} coupon={coupon} variant="compact" onToast={showToast} />)}
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Coupons;
