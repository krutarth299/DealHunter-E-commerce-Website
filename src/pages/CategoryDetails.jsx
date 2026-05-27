import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowRight,
    BadgePercent,
    CheckCircle2,
    Layers,
    Package,
    Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import DealsGrid from '../components/DealsGrid';
import { getCardTitle } from '../utils/productTitles';

const CouponCard = () => null;
const normalizeCouponsForUi = () => [];
import { normalizeCategory } from '../utils/categoryConstants';
import { couponsEnabled } from '../config/features';

const titleFromSlug = (slug = '') => (
    slug
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Category'
);

const categorySlug = (value = '') => (
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
);

const cleanDealTitle = (title = '') => getCardTitle(title);

const CategoryDetails = ({
    user,
    onSearch,
    setIsAddDealOpen,
    wishlist,
    toggleWishlist,
    apiBase,
    deals = [],
    showToast
}) => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [couponData, setCouponData] = useState({ coupons: [], summary: null });
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [error, setError] = useState('');

    const matchingDeals = useMemo(() => {
        const normalizedSlug = categorySlug(slug);
        return deals.filter((deal) => categorySlug(normalizeCategory(deal.category || '')) === normalizedSlug);
    }, [deals, slug]);

    const resolvedCategory = useMemo(() => (
        matchingDeals[0]?.category || titleFromSlug(slug)
    ), [matchingDeals, slug]);

    useEffect(() => {
        if (!apiBase || !slug) return;
        if (!couponsEnabled) {
            Promise.resolve().then(() => {
                setCouponData({ coupons: [], summary: null });
                setLoadingCoupons(false);
            });
            return undefined;
        }

        let cancelled = false;
        const fetchCoupons = async ({ silent = false } = {}) => {
            if (!silent) setLoadingCoupons(true);
            setError('');
            try {
                const response = await fetch(`${apiBase.replace('/user', '')}/coupons/categories/${encodeURIComponent(slug)}`, { cache: 'no-store' });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data?.message || 'Failed to load category coupons');
                if (!cancelled) {
                    setCouponData({
                        coupons: normalizeCouponsForUi(data.coupons || []),
                        summary: data.summary || null
                    });
                }
            } catch (fetchError) {
                if (!cancelled) setError(fetchError.message || 'Failed to load category coupons');
            } finally {
                if (!cancelled) setLoadingCoupons(false);
            }
        };

        fetchCoupons();
        const refreshCoupons = () => {
            if (document.visibilityState === 'hidden') return;
            fetchCoupons({ silent: true });
        };
        window.addEventListener('dealsphere:data-changed', refreshCoupons);
        window.addEventListener('dealsphere:coupons-changed', refreshCoupons);
        const intervalId = window.setInterval(refreshCoupons, 120000);
        return () => {
            cancelled = true;
            window.removeEventListener('dealsphere:data-changed', refreshCoupons);
            window.removeEventListener('dealsphere:coupons-changed', refreshCoupons);
            window.clearInterval(intervalId);
        };
    }, [apiBase, slug]);

    const activeCoupons = couponData.coupons.filter((coupon) => coupon.isActive);
    const featuredDeals = matchingDeals.filter((deal) => deal.featured).slice(0, 6);
    const heroDeals = featuredDeals.length ? featuredDeals : matchingDeals.slice(0, 6);
    const heroCoupons = activeCoupons.filter((coupon) => coupon.isFeatured || coupon.isTrending).slice(0, 6);
    const liveStoreCount = new Set([
        ...matchingDeals.map((deal) => deal.store || deal.storeName),
        ...(couponsEnabled ? activeCoupons.map((coupon) => coupon.store) : [])
    ].filter(Boolean)).size;
    const backTarget = typeof location.state?.returnTo === 'string' && location.state.returnTo ? location.state.returnTo : '/deals';
    const backScrollTo = typeof location.state?.scrollToSection === 'string' ? location.state.scrollToSection : '';
    const backButtonLabel = backTarget === '/' ? 'Back to Shop by Category' : 'Back to Deals';
    const handleBack = () => {
        if (location.state?.returnTo) {
            navigate(backTarget, {
                replace: true,
                state: backTarget === '/' && backScrollTo ? { scrollToSection: backScrollTo } : undefined
            });
            return;
        }

        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate('/deals', { replace: true });
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
            <SEO
                title={couponsEnabled ? `${resolvedCategory} Deals, Coupons & Offers` : `${resolvedCategory} Deals & Offers`}
                description={couponsEnabled
                    ? `Browse live ${resolvedCategory.toLowerCase()} deals, coupon codes and savings-driven offers on DealSphere.`
                    : `Browse live ${resolvedCategory.toLowerCase()} deals and savings-driven offers on DealSphere.`}
                canonical={`/category/${encodeURIComponent(slug || '')}`}
                itemList={[
                    ...matchingDeals.slice(0, 12).map((deal) => ({ ...deal, pageUrl: `/product/${deal.id || deal._id}` })),
                    ...(couponsEnabled ? activeCoupons.slice(0, 12).map((coupon) => ({ ...coupon, pageUrl: `/coupons/${coupon.storeSlug}` })) : [])
                ]}
                breadcrumbs={[
                    { name: 'Home', url: '/' },
                    { name: 'Deals', url: '/deals' },
                    { name: resolvedCategory, url: `/category/${encodeURIComponent(slug || '')}` }
                ]}
            />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main>
                <section className="relative overflow-hidden border-b border-slate-100 bg-white">
                    <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-100/70 blur-3xl" />
                    <div className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-orange-50/80 blur-3xl" />
                    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-18">
                        <button onClick={handleBack} className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600">
                            <ArrowRight size={14} className="rotate-180" />
                            {backButtonLabel}
                        </button>
                        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                            <div>
                                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">
                                    <Layers size={14} />
                                    Category landing page
                                </div>
                                <h1 className="max-w-3xl text-4xl font-black leading-[0.96] tracking-tighter text-slate-950 md:text-6xl lg:text-[4.35rem]">
                                    {resolvedCategory} {couponsEnabled ? 'offers, deals & coupons.' : 'offers & deals.'}
                                </h1>
                                <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-slate-500 md:text-lg">
                                    {couponsEnabled
                                        ? 'This page combines category browsing intent with separate deal and coupon systems, so shoppers can compare product discounts and code-based savings without confusion.'
                                        : 'This page focuses on live product deals in this category, with product discounts and store-linked offers kept easy to compare.'}
                                </p>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                            <Package size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Live deals</p>
                                            <p className="text-sm font-black text-slate-950">{matchingDeals.length.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                            <BadgePercent size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Coupons</p>
                                            <p className="text-sm font-black text-slate-950">{couponsEnabled ? activeCoupons.length.toLocaleString('en-IN') : '0'}</p>
                                        </div>
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                                            <Sparkles size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Stores</p>
                                            <p className="text-sm font-black text-slate-950">{liveStoreCount.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-[2.25rem] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.18)]">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Category snapshot</p>
                                        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Everything shoppers need at a glance</h2>
                                    </div>
                                    <div className="rounded-2xl bg-orange-50 px-3 py-2 text-right">
                                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-700">Verified source mix</p>
                                        <p className="mt-1 text-sm font-black text-orange-700">{liveStoreCount.toLocaleString('en-IN')} stores</p>
                                    </div>
                                </div>
                                <div className={`grid gap-3 ${couponsEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                    {(couponsEnabled ? [
                                        { label: 'live deals', value: matchingDeals.length, tone: 'orange' },
                                        { label: 'active coupons', value: activeCoupons.length, tone: 'green' },
                                        { label: 'stores', value: liveStoreCount, tone: 'slate' }
                                    ] : [
                                        { label: 'live deals', value: matchingDeals.length, tone: 'orange' },
                                        { label: 'stores', value: liveStoreCount, tone: 'slate' }
                                    ]).map((stat) => (
                                        <div
                                            key={stat.label}
                                            className={`rounded-[1.75rem] border p-4 text-center shadow-sm ${
                                                stat.tone === 'orange'
                                                    ? 'border-orange-100 bg-orange-50/80'
                                                    : stat.tone === 'green'
                                                        ? 'border-emerald-100 bg-emerald-50/80'
                                                        : 'border-slate-100 bg-slate-50'
                                            }`}
                                        >
                                            <p className={`text-3xl font-black tracking-tighter ${stat.tone === 'green' ? 'text-emerald-600' : stat.tone === 'orange' ? 'text-orange-600' : 'text-slate-950'}`}>
                                                {Number(stat.value || 0).toLocaleString('en-IN')}
                                            </p>
                                            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
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

                    <div className={`grid gap-5 ${couponsEnabled ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Deals</p>
                                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{resolvedCategory} product deals</h2>
                                </div>
                                <Package className="text-orange-500" />
                            </div>
                            <p className="text-sm font-semibold leading-relaxed text-slate-500">
                                Product-based offers stay price-first and image-first, with product pages and Buy Now flows kept separate from coupon behavior.
                            </p>
                            <div className="mt-6 space-y-3">
                                {heroDeals.length > 0 ? heroDeals.slice(0, 3).map((deal) => (
                                    <Link key={deal.id || deal._id} to={`/product/${deal.id || deal._id}`} className="block rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-4 transition hover:border-orange-200 hover:bg-orange-50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">{deal.store || deal.storeName}</p>
                                        <p className="mt-1 line-clamp-2 text-sm font-black leading-snug text-slate-900">{cleanDealTitle(deal.title)}</p>
                                    </Link>
                                )) : (
                                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                        No live deals in this category yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {couponsEnabled && (
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Coupons</p>
                                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{resolvedCategory} coupons & store offers</h2>
                                </div>
                                <BadgePercent className="text-orange-500" />
                            </div>
                            <p className="text-sm font-semibold leading-relaxed text-slate-500">
                                Code-based and offer-based promotions stay expiry- and reveal-driven, which keeps coupon usage clear and trustworthy.
                            </p>
                            <div className="mt-6 space-y-3">
                                {heroCoupons.length > 0 ? heroCoupons.slice(0, 3).map((coupon) => (
                                    <Link key={coupon._id || coupon.title} to={`/coupons/${coupon.storeSlug}`} className="block rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-4 transition hover:border-orange-200 hover:bg-orange-50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">{coupon.store} - {coupon.offerLabel}</p>
                                        <p className="mt-1 line-clamp-2 text-sm font-black leading-snug text-slate-900">{coupon.title}</p>
                                    </Link>
                                )) : (
                                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                        No active coupons in this category yet.
                                    </div>
                                )}
                            </div>
                        </div>
                        )}
                    </div>
                </section>

                {couponsEnabled && activeCoupons.length > 0 && (
                    <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8" style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 900px' }}>
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Trending Coupons</p>
                                <h2 className="mt-2 text-4xl font-black tracking-tighter text-slate-950">Best codes in {resolvedCategory}</h2>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
                                <Sparkles size={14} />
                                seo-ready
                            </div>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {(loadingCoupons ? [] : activeCoupons.slice(0, 6)).map((coupon) => (
                                <CouponCard key={coupon._id || coupon.title} coupon={coupon} onToast={showToast} />
                            ))}
                        </div>
                    </section>
                )}

                {matchingDeals.length > 0 && (
                    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 1200px' }}>
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Latest Deals</p>
                                <h2 className="mt-2 text-4xl font-black tracking-tighter text-slate-950">Shop live {resolvedCategory.toLowerCase()} deals</h2>
                            </div>
                        </div>
                        <DealsGrid deals={matchingDeals.slice(0, 12)} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                    </section>
                )}

                <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8" style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 700px' }}>
                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-950">Programmatic SEO ready</h2>
                            <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500">
                                {couponsEnabled
                                    ? 'Category pages like this are built from live catalog data, which helps the platform target search intent such as category offers, category deals, and category coupon queries cleanly.'
                                    : 'Category pages like this are built from live catalog data, which helps the platform target search intent such as category offers and category deals cleanly.'}
                            </p>
                        </div>
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                <BadgePercent />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-950">Clean separation, better trust</h2>
                            <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500">
                                {couponsEnabled
                                    ? 'Users can see product discounts and coupon-led savings in one category journey without the platform blending those two systems into one confusing card model.'
                                    : 'Users can see product discounts in one category journey without the platform blending separate systems into one confusing card model.'}
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default CategoryDetails;
