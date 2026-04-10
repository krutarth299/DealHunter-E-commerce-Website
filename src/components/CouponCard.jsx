import React, { useState } from 'react';
import { BadgePercent, CheckCircle2, Clock, Copy, ExternalLink, ShieldCheck, Sparkles, Store, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    copyText,
    formatCouponExpiry,
    formatCouponTime,
    getCouponActionLabel,
    getStoreSlug,
    normalizeCouponForUi
} from '../utils/couponUi';

const TYPE_ICON = {
    cashback: WalletCards,
    bank: WalletCards,
    wallet: WalletCards,
    deal: Sparkles,
    sale: BadgePercent,
    coupon: BadgePercent
};

const getStoreLogo = (coupon = {}) => {
    try {
        const url = new URL(coupon.landingUrl || coupon.affiliateUrl || coupon.revealUrl || '');
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
    } catch {
        return `https://www.google.com/s2/favicons?domain=${getStoreSlug(coupon.store)}.com&sz=128`;
    }
};

const CouponCard = ({ coupon: rawCoupon, variant = 'default', onToast }) => {
    const coupon = normalizeCouponForUi(rawCoupon);
    const [revealed, setRevealed] = useState(!coupon.code || variant === 'compact');
    const [copied, setCopied] = useState(false);
    const Icon = TYPE_ICON[coupon.offerType] || BadgePercent;
    const actionLabel = getCouponActionLabel(coupon, revealed);
    const isFeatured = variant === 'featured';

    const openMerchant = () => {
        if (coupon.revealUrl && typeof window !== 'undefined') {
            window.open(coupon.revealUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const handlePrimaryAction = async () => {
        if (coupon.code && !revealed) {
            setRevealed(true);
            openMerchant();
            return;
        }

        if (coupon.code) {
            await copyText(coupon.code);
            setCopied(true);
            onToast?.('Coupon code copied. Opening store...', 'success');
            window.setTimeout(() => setCopied(false), 1800);
        }

        openMerchant();
    };

    return (
        <article className={`group relative overflow-hidden rounded-[2rem] border bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_30px_70px_-45px_rgba(15,23,42,0.95)] ${isFeatured ? 'border-orange-200 p-5 md:p-6' : 'border-slate-200 p-4 md:p-5'}`}>
            <div className="absolute right-0 top-0 h-36 w-36 translate-x-14 -translate-y-16 rounded-full bg-orange-100/70 blur-3xl transition-transform group-hover:scale-125" />
            <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <Link to={`/coupons/${coupon.storeSlug}`} className="flex min-w-0 items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-3 shadow-inner">
                            <img src={getStoreLogo(coupon)} alt="" className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-xs font-black uppercase tracking-[0.2em] text-orange-600">{coupon.store}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                <ShieldCheck size={12} />
                                {coupon.isVerified ? formatCouponTime(coupon.verifiedAt) : 'pending verification'}
                            </p>
                        </div>
                    </Link>

                    <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white">
                        <Icon size={12} />
                        {coupon.offerLabel}
                    </div>
                </div>

                <h3 className={`${isFeatured ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'} line-clamp-2 font-black leading-tight tracking-tight text-slate-950`}>
                    {coupon.title}
                </h3>
                {coupon.description && (
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">
                        {coupon.description}
                    </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <Clock size={11} />
                            Expiry
                        </p>
                        <p className="font-black text-slate-900">{formatCouponExpiry(coupon.expiryDate)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <Store size={11} />
                            Value
                        </p>
                        <p className="line-clamp-1 font-black text-slate-900">{coupon.discountValue || coupon.cashbackValue || 'Store offer'}</p>
                    </div>
                </div>

                {coupon.code && (
                    <div className="mt-5 rounded-[1.5rem] border border-dashed border-orange-300 bg-orange-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <code className="min-w-0 truncate text-lg font-black tracking-[0.22em] text-slate-950">
                                {revealed ? coupon.code : `${coupon.code.slice(0, 3)}••••`}
                            </code>
                            {copied ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                    <CheckCircle2 size={12} />
                                    Copied
                                </span>
                            ) : (
                                <Copy size={16} className="text-orange-600" />
                            )}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={!coupon.revealUrl}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 hover:from-slate-950 hover:to-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {actionLabel}
                    <ExternalLink size={15} />
                </button>
            </div>
        </article>
    );
};

export default CouponCard;
