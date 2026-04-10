import React, { useEffect, useState } from 'react';
import { BadgePercent, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { copyText, formatCouponTime, getStoreSlug, normalizeCouponsForUi } from '../utils/couponUi';

const ProductCouponStrip = ({ store = '', apiBase = '', onToast }) => {
    const [coupons, setCoupons] = useState([]);

    useEffect(() => {
        if (!apiBase || !store) return;

        let cancelled = false;
        const fetchCoupons = async () => {
            try {
                const response = await fetch(`${apiBase.replace('/user', '')}/coupons/stores/${getStoreSlug(store)}`);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) return;
                const activeCoupons = normalizeCouponsForUi(data.coupons)
                    .filter((coupon) => coupon.isActive)
                    .slice(0, 3);
                if (!cancelled) setCoupons(activeCoupons);
            } catch {
                if (!cancelled) setCoupons([]);
            }
        };

        fetchCoupons();
        return () => {
            cancelled = true;
        };
    }, [apiBase, store]);

    const handleCopyAndOpen = async (coupon) => {
        if (coupon.code) {
            await copyText(coupon.code);
            onToast?.('Coupon code copied. Opening store...', 'success');
        }
        if (coupon.revealUrl && typeof window !== 'undefined') {
            window.open(coupon.revealUrl, '_blank', 'noopener,noreferrer');
        }
    };

    if (!coupons.length) return null;

    return (
        <section className="mb-6 rounded-[2rem] border border-orange-100 bg-orange-50/80 p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
                        <BadgePercent size={13} />
                        Matching store coupons
                    </p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950">Extra savings for {store}</h3>
                </div>
                <Link to={`/coupons/${getStoreSlug(store)}`} className="text-xs font-black uppercase tracking-widest text-orange-700 hover:text-slate-950">
                    See store coupons
                </Link>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
                {coupons.map((coupon) => (
                    <div key={coupon._id || coupon.title} className="rounded-[1.5rem] border border-white bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                <ShieldCheck size={12} />
                                {formatCouponTime(coupon.verifiedAt)}
                            </span>
                            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                                {coupon.offerLabel}
                            </span>
                        </div>
                        <h4 className="line-clamp-2 min-h-[2.5rem] text-sm font-black leading-tight text-slate-950">{coupon.title}</h4>
                        {coupon.code && (
                            <div className="mt-4 rounded-2xl border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-sm font-black tracking-[0.18em] text-slate-950">
                                {coupon.code}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => handleCopyAndOpen(coupon)}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-orange-500"
                        >
                            {coupon.code ? <Copy size={13} /> : <ExternalLink size={13} />}
                            {coupon.code ? 'Copy + Open' : 'Get Offer'}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProductCouponStrip;
