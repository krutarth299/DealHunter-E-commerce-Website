import React from 'react';
import { Activity, BadgePercent, CheckCircle, Copy, Edit3, ExternalLink, RefreshCw, Search, Shield, Trash2, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const checkboxClass = 'h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500';

const AdminCouponManager = ({
    coupons = [],
    filteredCoupons = [],
    couponForm,
    couponSearch,
    couponTypeFilter,
    couponStoreOptions = [],
    offerTypes = [],
    inputCls,
    isSavingCoupon = false,
    couponsLoading = false,
    isScanningCoupons = false,
    couponScanStatus = null,
    editingCouponId,
    onSearchChange,
    onTypeFilterChange,
    onFormChange,
    onSubmit,
    onReset,
    onEdit,
    onDelete,
    onRefresh,
    onScan,
    showToast
}) => {
    const copyCode = async (code) => {
        if (!code || !navigator?.clipboard?.writeText) return;
        await navigator.clipboard.writeText(code);
        showToast?.('Coupon code copied.', 'success');
    };

    const lastScan = couponScanStatus?.lastResult;
    const lastScanAt = couponScanStatus?.lastRunAt || lastScan?.finishedAt;
    const activeCoupons = coupons.filter((coupon) => coupon.status === 'active').length;
    const autoFetchedCoupons = coupons.filter((coupon) => coupon.autoFetched).length;
    const expiredCoupons = coupons.filter((coupon) => coupon.status === 'expired').length;
    const formatTime = (stamp) => stamp ? new Date(stamp).toLocaleString() : 'Not run yet';

    return (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
            <form onSubmit={onSubmit} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-600">
                            <BadgePercent size={13} />
                            {editingCouponId ? 'Edit coupon' : 'Add coupon'}
                        </div>
                        <h3 className="text-3xl font-black tracking-tight text-slate-950">Coupon control room</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-500">Create codes, deals, cashback, bank and app-only offers.</p>
                    </div>
                    {editingCouponId && (
                        <button type="button" onClick={onReset} className="rounded-2xl bg-slate-100 p-3 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Coupon Title*</label>
                        <input className={inputCls} value={couponForm.title} onChange={(event) => onFormChange('title', event.target.value)} placeholder="Extra 10% off on prepaid fashion orders" required />
                    </div>
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Store*</label>
                        <input className={inputCls} list="coupon-store-options" value={couponForm.store} onChange={(event) => onFormChange('store', event.target.value)} placeholder="Amazon / Flipkart / Myntra" required />
                        <datalist id="coupon-store-options">
                            {couponStoreOptions.map((store) => <option key={store} value={store} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Offer Type</label>
                        <select className={inputCls} value={couponForm.offerType} onChange={(event) => onFormChange('offerType', event.target.value)}>
                            {offerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Coupon Code</label>
                        <input className={inputCls} value={couponForm.code} onChange={(event) => onFormChange('code', event.target.value.toUpperCase())} placeholder="DEALSPHERE10" />
                    </div>
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Category</label>
                        <input className={inputCls} value={couponForm.category} onChange={(event) => onFormChange('category', event.target.value)} placeholder="Fashion / Electronics / Bank Offers" />
                    </div>
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Discount Value</label>
                        <input className={inputCls} value={couponForm.discountValue} onChange={(event) => onFormChange('discountValue', event.target.value)} placeholder="10% OFF / Up to ₹500 off" />
                    </div>
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Cashback Value</label>
                        <input className={inputCls} value={couponForm.cashbackValue} onChange={(event) => onFormChange('cashbackValue', event.target.value)} placeholder="Up to 5% rewards / ₹100 bonus" />
                    </div>
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Expiry Date</label>
                        <input className={inputCls} type="date" value={couponForm.expiryDate} onChange={(event) => onFormChange('expiryDate', event.target.value)} />
                    </div>
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
                        <select className={inputCls} value={couponForm.status} onChange={(event) => onFormChange('status', event.target.value)}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Affiliate / Redirect URL*</label>
                        <input className={inputCls} value={couponForm.affiliateUrl} onChange={(event) => onFormChange('affiliateUrl', event.target.value)} placeholder="https://store.com/product-or-sale?tag=..." />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Landing URL</label>
                        <input className={inputCls} value={couponForm.landingUrl} onChange={(event) => onFormChange('landingUrl', event.target.value)} placeholder="Original sale / category / store page" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Short Description</label>
                        <textarea className={`${inputCls} min-h-28 resize-y`} value={couponForm.description} onChange={(event) => onFormChange('description', event.target.value)} placeholder="What does this offer do? Who can use it?" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Terms & Conditions</label>
                        <textarea className={`${inputCls} min-h-28 resize-y`} value={couponForm.terms} onChange={(event) => onFormChange('terms', event.target.value)} placeholder="Minimum order, bank/card eligibility, exclusions, app-only notes..." />
                    </div>
                </div>

                <div className="mt-6 grid gap-3 rounded-[1.75rem] bg-slate-50 p-4 sm:grid-cols-3">
                    {[
                        ['isVerified', 'Verified', Shield],
                        ['isFeatured', 'Featured', Zap],
                        ['isTrending', 'Trending', CheckCircle]
                    ].map(([field, label, Icon]) => (
                        <label key={field} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-black text-slate-700">
                            <input className={checkboxClass} type="checkbox" checked={Boolean(couponForm[field])} onChange={(event) => onFormChange(field, event.target.checked)} />
                            <Icon size={16} className="text-orange-500" />
                            {label}
                        </label>
                    ))}
                </div>

                <button type="submit" disabled={isSavingCoupon} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-slate-950 disabled:opacity-60">
                    {isSavingCoupon ? 'Saving coupon...' : editingCouponId ? 'Update Coupon' : 'Publish Coupon'}
                </button>
            </form>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="text-3xl font-black tracking-tight text-slate-950">Coupons Library</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{coupons.length} total coupon / offer records</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={onScan} disabled={isScanningCoupons || couponScanStatus?.running} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-slate-950 disabled:opacity-60">
                            <RefreshCw size={14} className={isScanningCoupons || couponScanStatus?.running ? 'animate-spin' : ''} />
                            {isScanningCoupons || couponScanStatus?.running ? 'Scanning...' : 'Auto Scan'}
                        </button>
                        <button type="button" onClick={onRefresh} className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">
                            {couponsLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                <div className="mb-6 grid gap-3 md:grid-cols-4">
                    {[
                        { label: 'active', value: activeCoupons, tone: 'text-emerald-700 bg-emerald-50' },
                        { label: 'auto fetched', value: autoFetchedCoupons, tone: 'text-orange-700 bg-orange-50' },
                        { label: 'expired', value: expiredCoupons, tone: 'text-rose-700 bg-rose-50' },
                        { label: 'last scan', value: lastScan ? `${lastScan.created || 0}+${lastScan.updated || 0}` : '--', tone: 'text-blue-700 bg-blue-50' }
                    ].map((stat) => (
                        <div key={stat.label} className={`rounded-[1.5rem] border border-slate-100 p-4 ${stat.tone}`}>
                            <p className="text-2xl font-black tracking-tight">{stat.value}</p>
                            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] opacity-70">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mb-6 rounded-[1.75rem] border border-blue-100 bg-blue-50/70 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                                <Activity size={14} />
                                Automatic coupon discovery
                            </p>
                            <p className="text-xs font-bold leading-relaxed text-slate-600">
                                Last scan: {formatTime(lastScanAt)} · fetched {lastScan?.fetched || 0} source page(s), extracted {lastScan?.extracted || 0} candidate offer(s).
                            </p>
                            {couponScanStatus?.lastError && (
                                <p className="mt-2 text-xs font-bold text-rose-600">{couponScanStatus.lastError}</p>
                            )}
                        </div>
                        <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${couponScanStatus?.running ? 'bg-orange-500 text-white' : 'bg-white text-blue-700'}`}>
                            {couponScanStatus?.running ? 'scanner running' : 'scanner ready'}
                        </span>
                    </div>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
                    <label className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className={`${inputCls} pl-11`} value={couponSearch} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search coupon title, store, category, code..." />
                    </label>
                    <select className={inputCls} value={couponTypeFilter} onChange={(event) => onTypeFilterChange(event.target.value)}>
                        <option value="all">All offer types</option>
                        {offerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                </div>

                <div className="space-y-4 max-h-[72rem] overflow-y-auto pr-1">
                    {filteredCoupons.map((coupon) => (
                        <div key={coupon._id || coupon.id || coupon.title} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-4 md:flex-row">
                                <div className="flex-1 min-w-0">
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">{coupon.store}</span>
                                        <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-700">{coupon.offerType}</span>
                                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${coupon.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{coupon.status}</span>
                                        {coupon.autoFetched && (
                                            <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-700">{coupon.sourceType || 'auto'}</span>
                                        )}
                                    </div>
                                    <h4 className="line-clamp-2 text-lg font-black leading-tight text-slate-950">{coupon.title}</h4>
                                    {coupon.description && <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-500">{coupon.description}</p>}
                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>{coupon.category}</span>
                                        {coupon.expiryDate && <span>Expires {coupon.expiryDate}</span>}
                                        {coupon.code && <span>Code {coupon.code}</span>}
                                        {coupon.lastSeenAt && <span>Seen {formatTime(coupon.lastSeenAt)}</span>}
                                        {coupon.sourceUrl && <span className="max-w-full truncate">Source {coupon.sourceUrl}</span>}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2 md:flex-col">
                                    {coupon.code && (
                                        <button type="button" onClick={() => copyCode(coupon.code)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700">
                                            <Copy size={14} />
                                            Copy
                                        </button>
                                    )}
                                    {coupon.affiliateUrl && (
                                        <a href={coupon.affiliateUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-white">
                                            <ExternalLink size={14} />
                                            Test
                                        </a>
                                    )}
                                    <Link to={`/coupons/${coupon.storeSlug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-700">
                                        Page
                                    </Link>
                                    <button type="button" onClick={() => onEdit(coupon)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700">
                                        <Edit3 size={14} />
                                        Edit
                                    </button>
                                    <button type="button" onClick={() => onDelete(coupon._id || coupon.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-700">
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!couponsLoading && filteredCoupons.length === 0 && (
                        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                            <BadgePercent size={34} className="mx-auto mb-4 text-slate-300" />
                            <h4 className="text-xl font-black text-slate-950">No coupons found</h4>
                            <p className="mt-2 text-sm font-semibold text-slate-500">Create your first coupon or clear the current search / type filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminCouponManager;
