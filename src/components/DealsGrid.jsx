import React from 'react';
import { Heart, ExternalLink, ShoppingBag, Star, Zap, TrendingDown, Flame, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const storeColors = {
    'Amazon': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
    'Flipkart': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
    'Myntra': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-400' },
    'Blinkit': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
    'Meesho': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400' },
    'Ajio': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
    'Nykaa': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-400' },
    'Croma': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
};
const getStoreStyle = (store) => storeColors[store] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };

const formatPrice = (p) => {
    if (!p && p !== 0) return null;
    const num = parseFloat(String(p).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : `₹${num.toLocaleString('en-IN')}`;
};

const getDiscountNum = (d) => {
    if (!d) return null;
    const match = String(d).match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
};

const getDiscountColor = (pct) => {
    if (!pct) return 'bg-slate-400';
    if (pct >= 60) return 'bg-red-600';
    if (pct >= 40) return 'bg-orange-500';
    if (pct >= 20) return 'bg-amber-500';
    return 'bg-green-600';
};

/* ─── HOT threshold ─── */
const isHotDeal = (discountNum) => discountNum && discountNum >= 40;

const DealCard = ({ deal, wishlist = [], toggleWishlist, index = 0 }) => {
    const navigate = useNavigate();
    const [activeImageIndex, setActiveImageIndex] = React.useState(0);
    const isSaved = wishlist.some(w => {
        const wId = w.id || w._id;
        const dId = deal.id || deal._id;
        return wId && dId && String(wId) === String(dId);
    });
    const price = formatPrice(deal.price);
    const mrp = formatPrice(deal.originalPrice);
    const discountNum = getDiscountNum(deal.discount);
    // getStoreStyle provides bg, text, border, dot
    const storeStyle = getStoreStyle(deal.store);
    const hot = isHotDeal(discountNum);

    const priceNum = deal.price ? parseFloat(String(deal.price).replace(/[^0-9.]/g, '')) : null;
    const mrpNum = deal.originalPrice ? parseFloat(String(deal.originalPrice).replace(/[^0-9.]/g, '')) : null;

    let savings = null;
    if (priceNum !== null && mrpNum !== null && mrpNum > priceNum) {
        savings = `₹${(mrpNum - priceNum).toLocaleString('en-IN')}`;
    }

    const handleGetDeal = (e) => {
        e.stopPropagation();
        if (deal.link) window.open(deal.link, '_blank', 'noopener,noreferrer');
        else navigate(`/product/${deal.id || deal._id}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            onClick={() => !deal.isExpired && navigate(`/product/${deal.id || deal._id}`)}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !deal.isExpired) {
                    e.preventDefault();
                    navigate(`/product/${deal.id || deal._id}`);
                }
            }}
            tabIndex={0}
            role="button"
            aria-label={`View deal: ${deal.title}`}
            className={`group relative bg-white rounded-2xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col overflow-hidden h-full ${deal.isExpired ? 'opacity-60 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-slate-300'}`}
        >
            {/* ── Image Section ── */}
            <div className="relative w-full aspect-[4/3] bg-white p-4 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {deal.isExpired && (
                    <div className="absolute inset-0 bg-slate-50/70 backdrop-blur-sm z-40 flex items-center justify-center">
                        <span className="bg-slate-800 text-white font-bold text-xs px-3 py-1 rounded-md tracking-wider shadow-sm uppercase">
                            Expired
                        </span>
                    </div>
                )}
                
                {/* Product Image */}
                <div className="w-full h-full relative">
                    <img 
                        src={(deal.images && deal.images.length > 0) ? deal.images[0] : (deal.image || '')} 
                        alt={deal.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 mix-blend-multiply"
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                    {!deal.image && (!deal.images || deal.images.length === 0) && (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag size={40} className="text-slate-200" />
                        </div>
                    )}
                </div>

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
                    {discountNum && discountNum > 0 && (
                        <span className="bg-[#E5F6EE] text-[#008A3D] text-[11px] font-extrabold px-2.5 py-1 rounded-md shadow-sm border border-[#008A3D]/20 leading-none flex items-center">
                            {discountNum}% OFF
                        </span>
                    )}
                    {hot && (
                        <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-orange-200 flex items-center gap-0.5 w-fit leading-none">
                            <Flame size={10} className="text-orange-600" /> HOT
                        </span>
                    )}
                </div>

                {/* Wishlist */}
                <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); toggleWishlist?.(deal); }}
                    className={`absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 backdrop-blur shadow-sm rounded-full flex items-center justify-center transition-all duration-300 z-30 border border-slate-100 ${isSaved ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
                >
                    <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={isSaved ? 0 : 2} className={isSaved ? "scale-110" : "scale-100"} />
                </button>
            </div>

            {/* ── Content Section ── */}
            <div className="flex flex-col flex-1 p-4 bg-white relative z-20">
                {/* Store Name & Rating */}
                <div className="flex items-center justify-between mb-2">
                    {deal.store ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            <span className={`w-[3px] h-[3px] rounded-full ${storeStyle.dot}`}></span>
                            {deal.store}
                        </div>
                    ) : <div />}
                    
                    {deal.rating && (
                        <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200/50 text-yellow-700 px-1.5 py-0.5 rounded-md text-[11px] font-extrabold shadow-sm">
                            <Star size={10} fill="currentColor" className="text-yellow-500" />
                            {deal.rating}
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-[14px] font-semibold text-slate-800 line-clamp-2 leading-snug mb-3 group-hover:text-blue-600 transition-colors">
                    {deal.title}
                </h3>

                {/* Price, MRP and Button Container */}
                <div className="mt-auto flex flex-col gap-3">
                    {/* Prices */}
                    <div className="flex flex-col">
                        <div className="flex items-end gap-2">
                            {price ? (
                                <span className="text-[20px] font-black text-slate-900 tracking-tight leading-none">{price}</span>
                            ) : (
                                <span className="text-sm font-semibold text-blue-600">Check Price</span>
                            )}
                            {mrp && price && mrp !== price && (
                                <span className="text-[12px] font-semibold text-slate-400 line-through leading-relaxed mb-0.5">{mrp}</span>
                            )}
                        </div>
                        {savings && (
                            <div className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                                <Zap size={10} fill="currentColor" /> Save {savings}
                            </div>
                        )}
                    </div>

                    {/* Button */}
                    <button
                        onClick={deal.isExpired ? (e) => { e.preventDefault(); e.stopPropagation(); } : handleGetDeal}
                        className={`w-full flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-sm transition-all duration-300 ${deal.isExpired ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.3)]'}`}
                    >
                        {deal.isExpired ? 'Offer Ended' : 'Get Deal'}
                        {!deal.isExpired && <ExternalLink size={14} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const DealsGrid = ({ deals = [], wishlist = [], toggleWishlist }) => {
    const validDeals = (Array.isArray(deals) ? deals : []).filter(d => d && (d.title || d.store));

    if (validDeals.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center glass-panel rounded-3xl border border-slate-100 min-h-[400px]"
            >
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-white">
                    <Search size={40} className="text-slate-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">No Deals Found</h3>
                <p className="text-slate-500 font-medium max-w-sm mb-8">
                    We couldn't find any deals matching your current filters or search terms.
                </p>
                <a
                    href="/deals"
                    className="bg-slate-900 hover:bg-orange-500 text-white px-8 py-3.5 rounded-xl font-bold transition-colors shadow-lg shadow-orange-500/0 hover:shadow-orange-500/20 flex items-center gap-2"
                >
                    Clear All Filters
                </a>
            </motion.div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {validDeals.map((deal, i) => (
                <DealCard
                    key={deal.id || deal._id || i}
                    deal={deal}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    index={i}
                />
            ))}
        </div>
    );
};

export default DealsGrid;
