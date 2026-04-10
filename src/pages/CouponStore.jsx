import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BadgePercent, CheckCircle2, HelpCircle, Package, ShieldCheck, Store as StoreIcon } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import CouponCard from '../components/CouponCard';
import DealsGrid from '../components/DealsGrid';
import { getStoreSlug, normalizeCouponsForUi } from '../utils/couponUi';
import { normalizeDealsForUi } from '../utils/dealUi';

const titleFromSlug = (slug = '') => (
    slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Store'
);

const CouponStore = ({ user, onSearch, setIsAddDealOpen, wishlist, toggleWishlist, apiBase, deals = [], showToast }) => {
    const { storeSlug } = useParams();
    const [storeData, setStoreData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!apiBase || !storeSlug) return;

        let cancelled = false;
        const fetchStoreCoupons = async ({ silent = false } = {}) => {
            if (!silent) setLoading(true);
            setError('');
            try {
                const response = await fetch(`${apiBase.replace('/user', '')}/coupons/stores/${encodeURIComponent(storeSlug)}`);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data?.message || 'Failed to load store coupons');
                if (!cancelled) {
                    setStoreData({
                        ...data,
                        coupons: normalizeCouponsForUi(data.coupons),
                        relatedDeals: normalizeDealsForUi(data.relatedDeals)
                    });
                }
            } catch (fetchError) {
                if (!cancelled) setError(fetchError.message || 'Failed to load store coupons');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchStoreCoupons();
        const refreshStoreCouponsSilently = () => fetchStoreCoupons({ silent: true });
        window.addEventListener('dealsphere:coupons-changed', refreshStoreCouponsSilently);
        const intervalId = window.setInterval(refreshStoreCouponsSilently, 30000);

        return () => {
            cancelled = true;
            window.removeEventListener('dealsphere:coupons-changed', refreshStoreCouponsSilently);
            window.clearInterval(intervalId);
        };
    }, [apiBase, storeSlug]);

    const storeName = storeData?.store || titleFromSlug(storeSlug);
    const coupons = storeData?.coupons || [];
    const activeCount = coupons.filter((coupon) => coupon.isActive).length;
    const relatedDeals = useMemo(() => {
        const fromApi = storeData?.relatedDeals || [];
        const fromGlobal = deals.filter((deal) => getStoreSlug(deal.storeName || deal.store) === getStoreSlug(storeName));
        const byId = new Map([...fromApi, ...fromGlobal].map((deal) => [String(deal._id || deal.id || deal.productUrl || deal.title), deal]));
        return [...byId.values()].slice(0, 8);
    }, [deals, storeData, storeName]);
    const hasCashback = coupons.some((coupon) => coupon.offerType === 'cashback');
    const hasBankOffers = coupons.some((coupon) => coupon.offerType === 'bank' || coupon.offerType === 'wallet');

    const faqStructuredData = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: `How do I use ${storeName} coupons on DealSphere?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `Reveal the coupon on DealSphere, copy the code if one exists, then open the ${storeName} store link and apply it during checkout.`
                }
            }
        ]
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
            <SEO
                title={`${storeName} Coupons, Promo Codes & Live Offers`}
                description={`Find active ${storeName} coupons, promo codes, cashback-style offers, bank offers and related live product deals on DealSphere.`}
                canonical={`/coupons/${storeSlug}`}
                itemList={coupons.map((coupon) => ({ ...coupon, pageUrl: `/coupons/${coupon.storeSlug}` }))}
                structuredData={faqStructuredData}
                breadcrumbs={[
                    { name: 'Home', url: '/' },
                    { name: 'Coupons', url: '/coupons' },
                    { name: storeName, url: `/coupons/${storeSlug}` }
                ]}
            />
            <Navbar user={user} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />

            <main>
                <section className="relative overflow-hidden bg-slate-950 text-white">
                    <div className="absolute right-0 top-0 h-96 w-96 translate-x-1/3 -translate-y-1/3 rounded-full bg-orange-500/20 blur-3xl" />
                    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
                        <Link to="/coupons" className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-300">
                            <ArrowRight size={14} className="rotate-180" />
                            All coupons
                        </Link>
                        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div>
                                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-300 ring-1 ring-white/10">
                                    <StoreIcon size={14} />
                                    Store coupon page
                                </div>
                                <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-tighter md:text-7xl">
                                    {storeName} coupons, codes & live offers.
                                </h1>
                                <p className="mt-7 max-w-2xl text-lg font-semibold leading-relaxed text-slate-300">
                                    Browse verified store promotions, reveal coupon codes, and compare related live product deals from {storeName}.
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 rounded-[2.5rem] bg-white p-3 text-slate-950">
                                {[
                                    { label: 'active', value: activeCount },
                                    { label: 'cashback', value: hasCashback ? 'yes' : '—' },
                                    { label: 'bank offers', value: hasBankOffers ? 'yes' : '—' }
                                ].map((stat) => (
                                    <div key={stat.label} className="min-w-24 rounded-[2rem] bg-slate-50 p-4 text-center">
                                        <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
                                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Active store offers</p>
                        <h2 className="mt-2 text-4xl font-black tracking-tighter text-slate-950">Verified {storeName} savings</h2>
                    </div>

                    {error && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
                    {loading ? (
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((item) => <div key={item} className="h-96 animate-pulse rounded-[2rem] bg-white" />)}
                        </div>
                    ) : coupons.length > 0 ? (
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {coupons.map((coupon) => <CouponCard key={coupon._id || coupon.title} coupon={coupon} onToast={showToast} />)}
                        </div>
                    ) : (
                        <div className="rounded-[2.5rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                            <BadgePercent size={42} className="mx-auto mb-5 text-slate-300" />
                            <h3 className="text-3xl font-black tracking-tight text-slate-950">No active coupons for {storeName} yet</h3>
                            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-slate-500">
                                This store coupon page is ready. Add verified coupons from admin and they will appear here automatically.
                            </p>
                        </div>
                    )}
                </section>

                {relatedDeals.length > 0 && (
                    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
                        <div className="mb-8 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Coupon + deal combo</p>
                                <h2 className="mt-2 text-4xl font-black tracking-tighter text-slate-950">Related {storeName} product deals</h2>
                            </div>
                            <Package className="hidden text-slate-300 md:block" size={34} />
                        </div>
                        <DealsGrid deals={relatedDeals} wishlist={wishlist || []} toggleWishlist={toggleWishlist} />
                    </section>
                )}

                <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-7 shadow-sm">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><HelpCircle /></div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-950">How to use these coupons</h2>
                            <div className="mt-6 space-y-4">
                                {['Reveal the coupon or deal on DealSphere.', `Copy the code when the ${storeName} offer requires one.`, 'Open the merchant in a new tab and complete checkout on the store website.'].map((item) => (
                                    <div key={item} className="flex gap-3 text-sm font-bold leading-relaxed text-slate-600">
                                        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={18} />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-7 shadow-sm">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><ShieldCheck /></div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-950">Terms & trust notes</h2>
                            <p className="mt-6 text-sm font-semibold leading-relaxed text-slate-500">
                                Always review coupon expiry, verification time and terms. Codes are controlled by each merchant and can change, but DealSphere keeps store coupon pages structured for quick discovery and clean redirection.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default CouponStore;
