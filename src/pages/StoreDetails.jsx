import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowRight,
    BadgePercent,
    CheckCircle2,
    Clock3,
    Package,
    ShieldCheck,
    Store as StoreIcon
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import DealsGrid from '../components/DealsGrid';
import { normalizeDealsForUi } from '../utils/dealUi';
import { getProductPath } from '../utils/productUrls';

const CouponCard = () => null;
const normalizeCouponsForUi = () => [];
import { couponsEnabled } from '../config/features';

const titleFromSlug = (slug = '') => (
    slug
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Store'
);
const EMPTY_LIST = [];

const formatRelativeTime = (value) => {
    if (!value) return 'not updated yet';
    const parsed = new Date(value).getTime();
    if (!Number.isFinite(parsed)) return 'not updated yet';
    const diff = Math.max(0, Date.now() - parsed);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const StoreDetails = ({
    user,
    onSearch,
    setIsAddDealOpen,
    wishlist,
    toggleWishlist,
    apiBase,
    showToast
}) => {
    const { storeName } = useParams();
    const [storeData, setStoreData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!apiBase || !storeName) return;

        let cancelled = false;
        const fetchStore = async ({ silent = false } = {}) => {
            if (!silent) setLoading(true);
            setError('');
            try {
                const response = await fetch(`${apiBase.replace('/user', '')}/stores/${encodeURIComponent(storeName)}`, { cache: 'no-store' });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data?.message || 'Failed to load store');
                if (!cancelled) {
                    setStoreData({
                        ...data,
                        deals: normalizeDealsForUi(data.deals || []),
                        coupons: couponsEnabled ? normalizeCouponsForUi(data.coupons || []) : []
                    });
                }
            } catch (fetchError) {
                if (!cancelled) setError(fetchError.message || 'Failed to load store');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchStore();
        const refreshStore = () => {
            if (document.visibilityState === 'hidden') return;
            fetchStore({ silent: true });
        };
        window.addEventListener('dealsphere:data-changed', refreshStore);
        window.addEventListener('dealsphere:coupons-changed', refreshStore);
        const intervalId = window.setInterval(refreshStore, 120000);

        return () => {
            cancelled = true;
            window.removeEventListener('dealsphere:data-changed', refreshStore);
            window.removeEventListener('dealsphere:coupons-changed', refreshStore);
            window.clearInterval(intervalId);
        };
    }, [apiBase, storeName]);

    const displayName = storeData?.store || titleFromSlug(storeName);
    const deals = useMemo(() => storeData?.deals || EMPTY_LIST, [storeData]);
    const coupons = useMemo(() => storeData?.coupons || EMPTY_LIST, [storeData]);
    const featuredDeals = useMemo(() => deals.filter((deal) => deal.featured).slice(0, 6), [deals]);
    const latestDeals = useMemo(() => deals.slice(0, 12), [deals]);
    const activeCoupons = useMemo(() => coupons.filter((coupon) => coupon.isActive), [coupons]);
    const featuredCoupons = useMemo(() => activeCoupons.filter((coupon) => coupon.isFeatured || coupon.isTrending).slice(0, 6), [activeCoupons]);
    const latestCoupons = useMemo(() => activeCoupons.slice(0, 6), [activeCoupons]);
    const canonicalPath = storeData?.canonicalUrl || `/store/${encodeURIComponent(storeName || '')}`;

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
            <SEO
                title={storeData?.seoTitle || (couponsEnabled ? `${displayName} Deals, Coupons & Offers` : `${displayName} Deals & Offers`)}
                description={storeData?.seoDescription || (couponsEnabled
                    ? `Browse live ${displayName} deals, coupon codes, cashback offers and store-specific savings on DealSphere.`
                    : `Browse live ${displayName} deals and store-specific savings on DealSphere.`)}
                canonical={canonicalPath}
                itemList={[
                    ...latestDeals.map((deal) => ({ ...deal, pageUrl: getProductPath(deal) })),
                    ...(couponsEnabled ? latestCoupons.map((coupon) => ({ ...coupon, pageUrl: `/coupons/${coupon.storeSlug}` })) : [])
                ]}
                breadcrumbs={[
                    { name: 'Home', url: '/' },
                    { name: 'Stores', url: '/stores' },
                    { name: displayName, url: canonicalPath }
                ]}
            />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main>
                <section className="relative overflow-hidden border-b border-slate-100 bg-white">
                    <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-orange-100 blur-3xl" />
                    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
                        <Link to="/stores" className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600">
                            <ArrowRight size={14} className="rotate-180" />
                            All stores
                        </Link>
                        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                            <div>
                                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">
                                    <StoreIcon size={14} />
                                    Store landing page
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/30">
                                        {storeData?.logo ? (
                                            <img src={storeData.logo} alt={displayName} className="h-full w-full object-contain" loading="lazy" />
                                        ) : (
                                            <StoreIcon className="text-slate-300" />
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-5xl font-black leading-[0.92] tracking-tighter text-slate-950 md:text-7xl">
                                            {displayName}
                                        </h1>
                                        <p className="mt-3 max-w-2xl text-lg font-semibold leading-relaxed text-slate-500">
                                            {storeData?.tagline || (couponsEnabled
                                                ? `Live ${displayName} deals and coupon offers separated cleanly for faster browsing and better affiliate conversion.`
                                                : `Live ${displayName} deals separated cleanly for faster browsing and better affiliate conversion.`)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={`gap-3 rounded-[2.5rem] bg-slate-950 p-3 text-white ${couponsEnabled ? 'grid grid-cols-2 sm:grid-cols-4' : 'grid grid-cols-1'}`}>
                                {(couponsEnabled ? [
                                    { label: 'live deals', value: storeData?.dealsCount ?? deals.length },
                                    { label: 'active coupons', value: storeData?.activeCouponsCount ?? activeCoupons.length },
                                    { label: 'cashback', value: storeData?.cashbackCount ?? activeCoupons.filter((item) => item.offerType === 'cashback').length },
                                    { label: 'bank offers', value: storeData?.bankOffersCount ?? activeCoupons.filter((item) => item.offerType === 'bank' || item.offerType === 'wallet').length }
                                ] : [
                                    { label: 'live deals', value: storeData?.dealsCount ?? deals.length }
                                ]).map((stat) => (
                                    <div key={stat.label} className="rounded-[1.7rem] bg-white/10 p-4 text-center">
                                        <p className="text-3xl font-black tracking-tighter">{Number(stat.value || 0).toLocaleString('en-IN')}</p>
                                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-300">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {(storeData?.categories || []).slice(0, 6).map((category) => (
                                <Link
                                    key={category}
                                    to={`/deals?category=${encodeURIComponent(category)}&store=${encodeURIComponent(displayName)}`}
                                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm hover:border-orange-200 hover:text-orange-600"
                                >
                                    {category}
                                </Link>
                            ))}
                            <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                price sync {formatRelativeTime(storeData?.latestDealAt || storeData?.latestCouponAt)}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    {error && (
                        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                            {error}
                        </div>
                    )}

                    {loading && !storeData ? (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="h-80 animate-pulse rounded-[2rem] bg-white" />
                            <div className="h-80 animate-pulse rounded-[2rem] bg-white" />
                        </div>
                    ) : (
                        <div className={`grid gap-5 ${couponsEnabled ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                            {couponsEnabled && (
                            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Coupons</p>
                                        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Store coupons</h2>
                                    </div>
                                    <BadgePercent className="text-orange-500" />
                                </div>
                                <p className="text-sm font-semibold leading-relaxed text-slate-500">
                                    Code-based and offer-based savings stay separate from product deals, so users know when to copy a code and when to buy directly.
                                </p>
                                <div className="mt-6 space-y-3">
                                    {featuredCoupons.length > 0 ? featuredCoupons.slice(0, 3).map((coupon) => (
                                        <Link key={coupon._id || coupon.title} to={`/coupons/${coupon.storeSlug}`} className="block rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-4 transition hover:border-orange-200 hover:bg-orange-50">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">{coupon.offerLabel}</p>
                                            <p className="mt-1 line-clamp-2 text-sm font-black leading-snug text-slate-900">{coupon.title}</p>
                                        </Link>
                                    )) : (
                                        <div className="rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                            No active coupons for this store yet.
                                        </div>
                                    )}
                                </div>
                                <Link to={`/coupons/${storeData?.storeSlug || storeName}`} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-orange-600">
                                    View all coupons <ArrowRight size={16} />
                                </Link>
                            </div>
                            )}

                            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Deals</p>
                                        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Live product deals</h2>
                                    </div>
                                    <Package className="text-blue-500" />
                                </div>
                                <p className="text-sm font-semibold leading-relaxed text-slate-500">
                                    Product deals keep pricing, images, product detail pages and Buy Now flows fully separate from coupon behavior.
                                </p>
                                <div className="mt-6 space-y-3">
                                    {featuredDeals.length > 0 ? featuredDeals.slice(0, 3).map((deal) => (
                                        <Link key={deal.id || deal._id} to={`/product/${deal.id || deal._id}`} className="block rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{deal.category || 'Deal'}</p>
                                            <p className="mt-1 line-clamp-2 text-sm font-black leading-snug text-slate-900">{deal.title}</p>
                                        </Link>
                                    )) : (
                                        <div className="rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                            No live deals for this store yet.
                                        </div>
                                    )}
                                </div>
                                <Link to={`/deals?store=${encodeURIComponent(displayName)}`} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-600">
                                    View all deals <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    )}
                </section>

                {couponsEnabled && latestCoupons.length > 0 && (
                    <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Latest Coupons</p>
                                <h2 className="mt-2 text-4xl font-black tracking-tighter text-slate-950">Active store offers</h2>
                            </div>
                            <Link to={`/coupons/${storeData?.storeSlug || storeName}`} className="text-sm font-black text-orange-600">See all</Link>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {latestCoupons.map((coupon) => (
                                <CouponCard key={coupon._id || coupon.title} coupon={coupon} onToast={showToast} />
                            ))}
                        </div>
                    </section>
                )}

                {latestDeals.length > 0 && (
                    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Latest Deals</p>
                                <h2 className="mt-2 text-4xl font-black tracking-tighter text-slate-950">Shop live product offers</h2>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                <ShieldCheck size={14} />
                                store-tracked
                            </div>
                        </div>
                        <DealsGrid deals={latestDeals} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                    </section>
                )}

                <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-950">Why this page converts better</h2>
                            <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500">
                                {couponsEnabled
                                    ? 'Users can compare both coupon-led savings and product-led discounts in one trusted store context, while each system still keeps its own rules, tracking, and UX.'
                                    : 'Users can compare live product deals in one trusted store context while the page stays focused on clean pricing, product detail pages and buy-now flows.'}
                            </p>
                        </div>
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                <Clock3 />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-950">Monetization ready</h2>
                            <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500">
                                {couponsEnabled
                                    ? 'Deal clicks, coupon reveals, coupon copies, and store redirects can all be tracked independently, which keeps CPA/CPC/affiliate attribution cleaner as the platform grows.'
                                    : 'Deal clicks and store redirects can all be tracked independently, which keeps CPA/CPC/affiliate attribution cleaner as the platform grows.'}
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default StoreDetails;
