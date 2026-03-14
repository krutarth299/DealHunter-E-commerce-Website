import React, { useState } from 'react';
import { Heart, ExternalLink, ShoppingBag, Star, Zap, TrendingDown, Flame, Search, X, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlistAnimation } from '../context/wishlistAnimationContextDefinition';

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

const DealCard = ({ deal, wishlist = [], toggleWishlist, index = 0, onQuickView }) => {
    const navigate = useNavigate();
    const { flyToWishlist } = useWishlistAnimation();
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05, ease: 'easeOut' }}
            whileHover={{ y: -8, scale: 1.01 }}
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
            className={`group relative bg-white rounded-[2.2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col overflow-hidden h-full ${deal.isExpired ? 'opacity-60 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-transparent'}`}
        >
            {/* ── Image Section ── */}
            <div className="relative w-full h-[220px] bg-white p-6 flex items-center justify-center overflow-hidden border-b border-slate-50">
                {deal.isExpired && (
                    <div className="absolute inset-0 bg-slate-50/70 backdrop-blur-sm z-40 flex items-center justify-center">
                        <span className="bg-slate-800 text-white font-black text-[10px] px-4 py-1.5 rounded-xl tracking-widest shadow-lg uppercase">
                            Offer Expired
                        </span>
                    </div>
                )}
                
                {/* Product Image */}
                <div className="w-full h-full relative">
                    <img 
                        src={(deal.images && deal.images.length > 0) ? deal.images[0] : (deal.image || '')} 
                        alt={deal.title}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out mix-blend-multiply drop-shadow-md"
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                </div>

                {/* Top Left Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {discountNum && discountNum > 0 && (
                        <div className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg shadow-emerald-600/20 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap size={12} fill="currentColor" /> {discountNum}% OFF
                        </div>
                    )}
                    {hot && (
                        <div className="bg-orange-500 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-lg shadow-orange-500/20 flex items-center gap-1 w-fit uppercase tracking-tighter">
                            <Flame size={12} fill="currentColor" /> HOT
                        </div>
                    )}
                </div>

                {/* Quick View Button (Slide Up) */}
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-20">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onQuickView?.(deal); }}
                        className="w-full bg-slate-900/90 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-2xl shadow-xl hover:bg-orange-600 transition-colors"
                    >
                        Quick View
                    </button>
                </div>

                {/* Wishlist Button */}
                <button
                    onClick={e => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        toggleWishlist?.(deal); 
                    }}
                    className={`absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-lg shadow-sm rounded-2xl flex items-center justify-center transition-all duration-300 z-30 border border-slate-100 ${isSaved ? 'text-red-500' : 'text-slate-400 hover:text-red-500 active:scale-90 hover:shadow-lg'}`}
                >
                    <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={isSaved ? 0 : 2} className={isSaved ? "scale-110" : "scale-100"} />
                </button>
            </div>

            {/* ── Content Section ── */}
            <div className="flex flex-col flex-1 p-5 bg-white relative z-20">
                {/* Store Branding */}
                <div className="flex items-center justify-between mb-3">
                    {deal.store ? (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">
                            <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm">
                                <img 
                                    src={`https://www.google.com/s2/favicons?domain=${deal.store.toLowerCase().replace(/\s/g, '')}.com&sz=64`} 
                                    alt={deal.store}
                                    className="w-full h-full object-contain"
                                    onError={e => { e.target.parentElement.innerHTML = `<span class="w-full h-full flex items-center justify-center text-[8px] font-black">${deal.store[0]}</span>`; }}
                                />
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{deal.store}</span>
                        </div>
                    ) : <div />}
                    
                    {deal.rating && (
                        <div className="flex items-center gap-1 text-orange-500 text-xs font-black">
                            <Star size={12} fill="currentColor" />
                            {deal.rating}
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-extrabold text-slate-800 line-clamp-2 leading-tight mb-4 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
                    {deal.title}
                </h3>

                {/* Price & Action Row */}
                <div className="mt-auto flex flex-col gap-4">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-slate-900 tracking-tighter">{price || 'Check Price'}</span>
                                {mrp && price && mrp !== price && (
                                    <span className="text-xs font-bold text-slate-400 line-through opacity-60 tracking-tighter">{mrp}</span>
                                )}
                            </div>
                            {savings && (
                                <div className="text-[10px] font-black text-emerald-600 mt-0.5 flex items-center gap-1 uppercase tracking-tighter">
                                    <Zap size={10} fill="currentColor" /> Save {savings}
                                </div>
                            )}
                        </div>
                        
                        {(index % 3 === 0) && (
                            <div className="bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 border border-blue-100">
                                <TrendingDown size={10} /> Best Trend
                            </div>
                        )}
                    </div>

                    {/* Main CTA */}
                    <button
                        onClick={deal.isExpired ? (e) => { e.preventDefault(); e.stopPropagation(); } : handleGetDeal}
                        className={`w-full flex items-center justify-center gap-2 font-black py-3.5 rounded-2xl text-[11px] uppercase tracking-widest transition-all duration-500 ${deal.isExpired ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] hover:bg-blue-700 active:scale-[0.97]'}`}
                    >
                        {deal.isExpired ? 'Sold Out' : 'Grab Deal'}
                        {!deal.isExpired && <ExternalLink size={14} strokeWidth={3} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                    </button>
                </div>
            </div>

            {/* Interactive Shine */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
        </motion.div>
    );
};

const DealsGrid = ({ deals = [], wishlist = [], toggleWishlist }) => {
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const validDeals = (Array.isArray(deals) ? deals : []).filter(d => d && (d.title || d.store));

    if (validDeals.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-[3.5rem] border border-dashed border-slate-200 min-h-[500px] relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-32 h-32 bg-slate-50/50 blur-3xl rounded-full" />
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-slate-50/50 blur-3xl rounded-full" />
                
                <motion.div 
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-[inset_0_4px_12px_rgba(0,0,0,0.03)] border border-white relative z-10"
                >
                    <Search size={44} className="text-slate-200" strokeWidth={1} />
                </motion.div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">No Intel Matches</h3>
                <p className="text-slate-500 font-medium max-w-sm mb-12 text-lg leading-relaxed">
                    Our sensors couldn't find any deals matching your current search parameters. 
                </p>
                <a
                    href="/deals"
                    className="bg-slate-900 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-slate-900/10 hover:shadow-orange-500/30 hover:translate-y-[-4px] active:scale-95"
                >
                    Clear Search Grid
                </a>
            </motion.div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {validDeals.map((deal, i) => (
                    <DealCard
                        key={deal.id || deal._id || i}
                        deal={deal}
                        wishlist={wishlist}
                        toggleWishlist={toggleWishlist}
                        index={i}
                        onQuickView={setQuickViewProduct}
                    />
                ))}
            </div>

            {/* Quick View Modal */}
            <AnimatePresence>
                {quickViewProduct && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setQuickViewProduct(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white border border-slate-100 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] z-10"
                        >
                            {/* Left: Enhanced Image Container */}
                            <div className="w-full md:w-[45%] p-10 bg-slate-50/50 flex items-center justify-center relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-100/30 opacity-50" />
                                <img 
                                    src={(quickViewProduct.images && quickViewProduct.images.length > 0) ? quickViewProduct.images[0] : (quickViewProduct.image || '')} 
                                    alt="" 
                                    className="max-h-[400px] w-full object-contain mix-blend-multiply drop-shadow-2xl group-hover:scale-105 transition-transform duration-700" 
                                />
                                <button 
                                    onClick={() => setQuickViewProduct(null)} 
                                    className="absolute top-6 left-6 w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-md border border-white flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 md:hidden shadow-lg"
                                >
                                    <X size={20} />
                                </button>
                                
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                </div>
                            </div>

                            {/* Right: Premium Info Panel */}
                            <div className="w-full md:w-[55%] p-10 md:p-14 lg:p-16 flex flex-col relative overflow-y-auto">
                                <div className="absolute top-0 right-0 p-8 hidden md:block">
                                    <button 
                                        onClick={() => setQuickViewProduct(null)} 
                                        className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100 group"
                                    >
                                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                    </button>
                                </div>

                                <div className="flex flex-col h-full">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest leading-none">
                                            {quickViewProduct.category}
                                        </span>
                                        <div className="h-1 w-1 rounded-full bg-slate-200" />
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            <ShieldCheck size={14} className="text-emerald-500" /> Verified Deal
                                        </div>
                                    </div>

                                    <h3 className="text-3xl md:text-4xl font-[1000] text-slate-900 leading-[1.1] mb-6 tracking-tight">
                                        {quickViewProduct.title}
                                    </h3>
                                    
                                    <div className="flex items-end gap-5 mb-10">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Price</span>
                                            <span className="text-5xl font-black text-slate-900 tracking-tighter">{formatPrice(quickViewProduct.price)}</span>
                                        </div>
                                        {quickViewProduct.originalPrice && (
                                            <div className="flex flex-col mb-1.5">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Was</span>
                                                <span className="text-xl font-bold text-slate-300 line-through tracking-tight decoration-slate-300/50">{formatPrice(quickViewProduct.originalPrice)}</span>
                                            </div>
                                        )}
                                        {quickViewProduct.discount && (
                                            <div className="mb-1.5 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[11px] font-[1000] uppercase tracking-widest shadow-sm border border-emerald-100">
                                                {quickViewProduct.discount} OFF
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-12">
                                        <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col gap-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-default">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <ShoppingBag size={12} className="text-blue-500" /> Source
                                            </span>
                                            <span className="text-base font-black text-slate-900">{quickViewProduct.store}</span>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col gap-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-default">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Flame size={12} className="text-orange-500" /> Intelligence
                                            </span>
                                            <span className="text-base font-black text-slate-900">Highly Rated</span>
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-auto pt-10 border-t border-slate-50 flex flex-col sm:flex-row gap-4">
                                        <button 
                                            onClick={() => {
                                                if (quickViewProduct.link) window.open(quickViewProduct.link, '_blank');
                                                setQuickViewProduct(null);
                                            }}
                                            className="flex-1 bg-slate-900 hover:bg-orange-500 text-white font-[1000] py-5 px-8 rounded-2xl shadow-2xl shadow-slate-900/10 hover:shadow-orange-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.1em]"
                                        >
                                            Secure This Deal <ExternalLink size={18} strokeWidth={2.5} />
                                        </button>
                                        <button 
                                            onClick={() => toggleWishlist?.(quickViewProduct)}
                                            className={`h-16 w-full sm:w-20 rounded-2xl border transition-all flex items-center justify-center group ${wishlist.some(w => (w.id || w._id) === (quickViewProduct.id || quickViewProduct._id)) ? 'bg-pink-50 text-pink-500 border-pink-100 shadow-xl shadow-pink-500/10' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-pink-200 hover:text-pink-400'}`}
                                        >
                                            <Heart 
                                                size={24} 
                                                className="group-hover:scale-110 transition-transform" 
                                                fill={wishlist.some(w => (w.id || w._id) === (quickViewProduct.id || quickViewProduct._id)) ? 'currentColor' : 'none'} 
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default DealsGrid;
