import React from 'react';
import { 
    Zap, Sparkles, Loader2, AlertCircle, 
    CheckCircle, Shield 
} from 'lucide-react';
import { optimizeImageUrl } from '../../utils/imageOptimizer';

export const DealAutomationChecklist = ({ form, isLikelyHttpUrl, sanitizeUrl, normalizeNumberLike }) => {
    const price = Number(normalizeNumberLike(form.dealPrice || form.price) || 0);
    const mrp = Number(normalizeNumberLike(form.mrp || form.originalPrice) || 0);
    const imageCount = [form.imageUrl, form.image, ...(Array.isArray(form.images) ? form.images : [])].filter(Boolean).length;
    const finalUrl = sanitizeUrl(form.affiliateOverrideLink || form.affiliateLink || form.productUrl);
    
    const checks = [
        { label: 'Original product URL is valid', ok: isLikelyHttpUrl(form.productUrl) },
        { label: 'Final outbound / affiliate URL is ready', ok: isLikelyHttpUrl(finalUrl) },
        { label: 'Title, store and category are mapped', ok: Boolean(form.title && form.store && form.category) },
        { label: 'Deal price is greater than zero', ok: price > 0 },
        { label: 'MRP is blank or not lower than deal price', ok: !mrp || mrp >= price },
        { label: `${imageCount || 'No'} product image${imageCount === 1 ? '' : 's'} selected`, ok: imageCount > 0 }
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h4 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Shield size={16} className="text-emerald-500" /> Publish Readiness
            </h4>
            <div className="space-y-3">
                {checks.map((check) => (
                    <div key={check.label} className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${check.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {check.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        </span>
                        <span className={`text-xs font-bold leading-relaxed ${check.ok ? 'text-slate-700' : 'text-amber-700'}`}>
                            {check.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const DuplicateCandidatesPanel = ({ candidates = [], onEdit, getDealId, getDealDisplayPrice }) => {
    if (!candidates.length) {
        return (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                <div className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-600" />
                    <div>
                        <h4 className="text-sm font-black text-emerald-900">No obvious duplicate found</h4>
                        <p className="text-xs font-semibold text-emerald-700 mt-1">The admin UI did not find a matching URL/title in the loaded deals.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={18} className="text-amber-700 mt-0.5" />
                <div>
                    <h4 className="text-sm font-black text-amber-900">Possible duplicate</h4>
                    <p className="text-xs font-semibold text-amber-700 mt-1">Review existing products before publishing a second card.</p>
                </div>
            </div>
            <div className="space-y-3">
                {candidates.slice(0, 3).map((deal) => (
                    <div key={getDealId(deal)} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 border border-amber-100">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white">
                            {deal.imageUrl && <img src={optimizeImageUrl(deal.imageUrl)} alt="" className="h-full w-full object-contain" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black text-slate-900">{deal.title}</p>
                            <p className="text-[10px] font-bold text-slate-500">{deal.store} · {getDealDisplayPrice(deal)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onEdit?.(deal)}
                            className="rounded-xl bg-amber-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-800 hover:bg-amber-200"
                        >
                            Edit
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
