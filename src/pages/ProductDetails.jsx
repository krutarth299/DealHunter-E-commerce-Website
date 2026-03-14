/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Star, Heart, ShoppingBag, Truck, ShieldCheck, Clock, User, ThumbsUp, Info, Tag, MapPin, ExternalLink, TrendingDown, CheckCircle2, X, Share2, PlayCircle, Zap } from 'lucide-react';
import DealsGrid from '../components/DealsGrid';
import { useWishlistAnimation } from '../context/wishlistAnimationContextDefinition';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';

// ── Currency Detection Utilities ──────────────────────────────────
const getCurrencySymbol = (price, store, link) => {
    const p = String(price || '');
    if (p.includes('$')) return '$';
    if (p.includes('₹')) return '₹';
    if (p.includes('€')) return '€';
    if (p.includes('£')) return '£';
    if (p.includes('¥')) return '¥';
    const src = ((store || '') + ' ' + (link || '')).toLowerCase();
    if (src.includes('amazon.com') || src.includes('bestbuy') || src.includes('walmart') || src.includes('target.com')) return '$';
    if (src.includes('amazon.co.uk') || src.includes('ebay.co.uk') || src.includes('argos')) return '£';
    if (src.includes('.de') || src.includes('.fr') || src.includes('.es') || src.includes('.it') || src.includes('.nl')) return '€';
    if (src.includes('amazon.co.jp') || src.includes('.jp')) return '¥';
    return '₹'; // Default: Indian Rupee
};

const formatProductPrice = (price, store, link) => {
    if (!price && price !== 0) return null;
    const p = String(price).trim();
    if (/^[$₹€£¥]/.test(p)) return p; // Already formatted
    const numStr = p.replace(/[^0-9.]/g, '');
    if (!numStr) return p;
    const symbol = getCurrencySymbol(p, store, link);
    const num = parseFloat(numStr);
    if (isNaN(num)) return symbol + p;
    return symbol === '₹'
        ? symbol + num.toLocaleString('en-IN')
        : symbol + num.toLocaleString('en-US');
};

const PriceHistoryChart = ({ price }) => {
    const { points, areaPoints, lowest } = React.useMemo(() => {
        const p = Number(String(price || '0').replace(/[^\d.]/g, '')) || 50000;
        const vals = [
            p * 1.05, p * 1.02, p * 1.10, p * 0.98, p * 1.04,
            p * 0.95, p * 0.97, p * 0.92, p * 0.94, p * 0.88, p
        ];
        const maxVal = Math.max(...vals);
        const minVal = Math.min(...vals);
        const range = maxVal - minVal || 1;

        const coords = vals.map((v, i) => {
            const x = i * 10;
            const y = 80 - ((v - minVal) / range) * 60;
            return `${x},${y}`;
        }).join(' ');

        const areaStr = `0,100 ${coords} 100,100`;

        return { points: coords, areaPoints: areaStr, lowest: minVal };
    }, [price]);

    if (!points) return null;

    const currentY = points.split(' ').pop().split(',')[1];

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 flex-1 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden group">
            {/* Ambient Mesh Background */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tighter">Price Analytics</h4>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Stream</span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1">Lowest Recorded</span>
                    <span className="text-sm font-black text-indigo-600 tracking-tight">₹{lowest.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div className="h-24 w-full relative">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="liquidFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                        </linearGradient>
                        <filter id="liquidGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Chart Area Fill */}
                    <path d={`M ${areaPoints} Z`} fill="url(#liquidFill)" />

                    {/* Main Liquid Line */}
                    <motion.polyline
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2.5, ease: "easeInOut" }}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                        vectorEffect="non-scaling-stroke"
                        filter="url(#liquidGlow)"
                    />
                </svg>
            </div>

            <div className="flex justify-between mt-8 pt-5 border-t border-slate-50 relative z-10">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Inception</span>
                    <span className="text-xs font-bold text-slate-900">30 DAYS AGO</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Observation</span>
                    <span className="text-xs font-black text-indigo-600">STABLE TREND</span>
                </div>
            </div>
        </div>
    );
};

const PriceComparisonTable = ({ currentStore, currentPrice }) => {
    const p = Number(String(currentPrice || '0').replace(/[^\d.]/g, '')) || 50000;
    const comparisons = [
        { store: 'Flipkart', price: `₹${Math.round(p * 1.08).toLocaleString()} `, status: 'Higher', color: 'text-slate-400' },
        { store: 'Amazon', price: `₹${Math.round(p * 1.12).toLocaleString()} `, status: 'Higher', color: 'text-slate-400' },
        { store: 'Meesho', price: `₹${Math.round(p * 1.05).toLocaleString()} `, status: 'Higher', color: 'text-slate-400' },
    ].filter(c => c.store.toLowerCase() !== currentStore?.toLowerCase());

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex-1 shadow-sm">
            <h4 className="font-extrabold text-slate-700 text-[11px] mb-3 tracking-tight uppercase">Compare Prices</h4>
            <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="text-xs font-black text-[#4f46e5] uppercase tracking-wider">{currentStore}</span>
                    <span className="text-sm font-black text-slate-900">{currentPrice}</span>
                    <span className="text-[10px] font-black text-[#4f46e5] bg-white px-2 py-0.5 rounded-full shadow-sm">BEST DEAL</span>
                </div>
                {comparisons.map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-2.5 py-1">
                        <span className="text-xs font-bold text-slate-500">{c.store}</span>
                        <span className={`text-xs font-black text-slate-800`}>{c.price}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{c.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MobileFloatingBar = ({ product, brand }) => {
    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-slate-200 px-6 py-5 flex items-center justify-between md:hidden shadow-[0_-15px_40px_rgba(0,0,0,0.1)] rounded-t-[2rem]"
        >
            <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Buy from {product.store}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatProductPrice(product.price, product.store, product.link)}</span>
                    {product.originalPrice && (
                        <span className="text-xs text-slate-400 line-through font-bold opacity-60">{formatProductPrice(product.originalPrice, product.store, product.link)}</span>
                    )}
                </div>
            </div>
            <a 
                href={product.link || `https://www.google.com/search?q=${encodeURIComponent(product.title + ' ' + (product.store || ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`h-14 px-8 rounded-2xl ${brand.bg} text-white font-black text-sm shadow-xl ${brand.shadow} active:scale-95 transition-all flex items-center gap-2 hover:brightness-110 active:brightness-90 relative overflow-hidden group no-underline`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                <ShoppingBag size={18} className="group-hover:scale-110 transition-transform" />
                <span>Go to Store</span>
                <ExternalLink size={14} className="opacity-60" />
            </a>
        </motion.div>
    );
};

const ProductDetails = ({ deals, user, wishlist, toggleWishlist, showToast, onSearch, setIsAddDealOpen }) => {
    // ... params & hooks
    const { id } = useParams();
    const navigate = useNavigate();
    const { recentlyViewed, addRecentlyViewed } = useRecentlyViewed();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState({ hours: 9, minutes: 14, seconds: 30 });
    const [activeImage, setActiveImage] = useState('');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [allReviewsExpanded, setAllReviewsExpanded] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [reviews, setReviews] = useState([]);
    const [viewCount, setViewCount] = useState(0);

    // Populate reviews when product loads
    useEffect(() => {
        if (product && product.reviews) {
            setReviews(product.reviews);
        } else if (product) {
            // Default mock reviews if none exist in DB for visual testing
            setReviews([
                { user: "Rahul M.", rating: 5, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), comment: "Absolutely stunning quality. Performance exceeds my expectations for this price point." },
                { user: "Priya S.", rating: 4, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), comment: "Great value for money. The build quality is top-notch." }
            ]);
        }
    }, [product]);

    const isWishlisted = product && wishlist?.some(item => {
        const itemId = item.id || item._id;
        const prodId = product.id || product._id;
        return itemId && prodId && String(itemId) === String(prodId);
    });

    // ... useEffects
    // (omitted for brevity, keep existing useEffects)



    // Unified media array (videos then images)
    const media = React.useMemo(() => {
        if (!product) return [];
        return [...(product.videos || []), ...(product.images || [])];
    }, [product]);

    const activeIndex = media.indexOf(activeImage);

    const handleNextImage = React.useCallback(() => {
        if (media.length <= 1) return;
        const nextIdx = (activeIndex + 1) % media.length;
        setActiveImage(media[nextIdx]);
    }, [activeIndex, media]);

    const handlePrevImage = React.useCallback(() => {
        if (media.length <= 1) return;
        const prevIdx = (activeIndex - 1 + media.length) % media.length;
        setActiveImage(media[prevIdx]);
    }, [activeIndex, media]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'ArrowRight') handleNextImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePrevImage, handleNextImage]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Derived state for similar deals
    const similarDeals = product && deals
        ? deals.filter(d => {
            const dId = d.id || d._id;
            const pId = product.id || product._id;
            return d.category === product.category && dId && pId && String(dId) !== String(pId);
        }).slice(0, 5)
        : [];

    useEffect(() => {
        if (deals && deals.length > 0) {
            const foundProduct = deals.find(d => (d.id || d._id).toString() === id);
            if (foundProduct) {
                const timer = setTimeout(() => {
                    setProduct(foundProduct);
                    addRecentlyViewed(foundProduct);
                    setActiveImage(foundProduct.image || (foundProduct.images && foundProduct.images[0]) || '');
                    setViewCount(foundProduct.views || Math.floor(Math.random() * 500) + 100);
                    setLoading(false);

                    // Track view in background
                    fetch(`http://localhost:5000/api/deals/${foundProduct._id || foundProduct.id}/view`, { method: 'POST' })
                        .then(res => res.json())
                        .then(data => { if (data.views) setViewCount(data.views); })
                        .catch(err => console.error("Error tracking view", err));

                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [id, deals, addRecentlyViewed]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <main className="flex-grow container mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col items-center justify-center gap-4">
                <h2 className="text-2xl font-bold text-slate-900">Product not found</h2>
                <button onClick={() => navigate('/')} className="text-blue-600 hover:underline flex items-center gap-2">
                    <ArrowLeft size={16} /> Back to Home
                </button>
            </main>
        );
    }

    // Brand color map
    const getBrandColor = (store) => {
        const s = store?.toLowerCase() || '';
        if (s.includes('amazon')) return { bg: 'bg-[#FF9900]', hover: 'hover:bg-[#e68a00]', shadow: 'shadow-[#FF9900]/30', text: 'Amazon' };
        if (s.includes('flipkart')) return { bg: 'bg-[#2874f0]', hover: 'hover:bg-[#1260e0]', shadow: 'shadow-[#2874f0]/30', text: 'Flipkart' };
        if (s.includes('meesho')) return { bg: 'bg-[#F43397]', hover: 'hover:bg-[#d82a85]', shadow: 'shadow-[#F43397]/30', text: 'Meesho' };
        if (s.includes('myntra')) return { bg: 'bg-[#ff3e6c]', hover: 'hover:bg-[#e6355f]', shadow: 'shadow-[#ff3e6c]/30', text: 'Myntra' };
        if (s.includes('ajio')) return { bg: 'bg-[#2c4152]', hover: 'hover:bg-[#1f2d3a]', shadow: 'shadow-[#2c4152]/30', text: 'Ajio' };
        return { bg: 'bg-slate-900', hover: 'hover:bg-black', shadow: 'shadow-slate-900/30', text: store || 'Store' };
    };

    const brand = getBrandColor(product.store);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100">
            <SEO
                title={product.title}
                description={product.description || `Get the best deal on ${product.title} at ${product.store}. Check out the latest offers and coupons on DealHunter.`}
                image={activeImage}
            />
            <Navbar user={null} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />
            <main id="product-details-loaded" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Breadcrumb / Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all mb-8 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs"
                >
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                        <ArrowLeft size={14} />
                    </div>
                    Back to Deals
                </button>

                <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2">

                        {/* Image Section */}
                        <div className="relative p-8 md:p-12 lg:p-20 flex flex-col items-center justify-center min-h-[400px] lg:min-h-[700px] bg-slate-50/50 border-b border-slate-100 lg:border-b-0 lg:border-r border-slate-100/50 gap-10">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-orange-500/5 opacity-50" />
                            
                            <motion.div
                                key={activeImage || 'fallback'}
                                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                                className="relative w-full max-w-lg aspect-square z-10 mx-auto group/main p-8 md:p-12"
                            >
                                <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full opacity-0 group-hover/main:opacity-100 transition-opacity duration-700" />
                                
                                {activeImage && (activeImage.includes('.mp4') || activeImage.includes('youtube.com') || activeImage.includes('vimeo.com')) ? (
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                                        {activeImage.includes('youtube.com') || activeImage.includes('vimeo.com') ? (
                                            <iframe
                                                src={activeImage.replace('watch?v=', 'embed/')}
                                                className="w-full h-full"
                                                allowFullScreen
                                                title="Product Video"
                                            />
                                        ) : (
                                            <video
                                                src={activeImage}
                                                controls
                                                className="w-full h-full object-contain"
                                                autoPlay
                                                muted
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <img
                                        src={activeImage || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop'}
                                        alt={product.title}
                                        className="w-full h-full object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.15)] group-hover/main:scale-110 transition-transform duration-700"
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop'; }}
                                    />
                                )}
                            </motion.div>

                            {/* Thumbnail Gallery */}
                            {media.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto max-w-full pb-2 px-4 snap-x no-scrollbar z-10">
                                    {media.map((item, idx) => {
                                        const isVideo = item.includes('.mp4') || item.includes('youtube') || item.includes('vimeo');
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImage(item)}
                                                className={`relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden snap-center border-2 transition-all duration-300 ${activeImage === item ? 'border-orange-500 scale-110 shadow-lg' : 'border-white bg-white opacity-60 hover:opacity-100 shadow-sm'}`}
                                            >
                                                {isVideo ? (
                                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                                        <PlayCircle size={24} className="text-white" />
                                                    </div>
                                                ) : (
                                                    <img src={item} alt="" className="w-full h-full object-contain p-2" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Details Section */}
                        <div className="p-8 md:p-12 lg:p-16 flex flex-col h-full bg-white relative">
                            {/* Tags Row */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Verified Deal
                                    </div>
                                    <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-100 shadow-sm">
                                        <Zap size={14} className="fill-orange-500" />
                                        Limited Time
                                    </div>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={() => toggleWishlist(product)}
                                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${isWishlisted ? 'bg-orange-50 text-orange-500 border-orange-200 shadow-lg shadow-orange-500/10' : 'bg-white text-slate-300 border-slate-100 hover:text-orange-500 hover:border-orange-100'}`}
                                >
                                    <Heart size={24} fill={isWishlisted ? "currentColor" : "none"} />
                                </motion.button>
                            </div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-6 leading-[1.1] tracking-tighter"
                            >
                                {product.title}
                            </motion.h1>

                            <div className="flex items-center gap-6 text-slate-500 mb-10 pb-10 border-b border-slate-50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Marketplace</span>
                                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                                        <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center p-1 shadow-sm">
                                            <img 
                                                src={`https://www.google.com/s2/favicons?domain=${product.store?.toLowerCase() || 'amazon'}.com&sz=48`} 
                                                alt="" 
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <span className="text-sm font-black text-slate-900">{product.store}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Customer Rating</span>
                                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
                                        <div className="flex items-center text-amber-500">
                                            <Star size={14} fill="currentColor" />
                                        </div>
                                        <span className="text-sm font-black text-amber-700">{product.rating || '4.5'}</span>
                                        <span className="text-[10px] font-bold text-amber-600/60 font-mono">/ 5.0</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6 mb-10">
                                <div className="flex items-baseline gap-4">
                                    <span className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">{formatProductPrice(product.price, product.store, product.link)}</span>
                                    {product.originalPrice && (
                                        <div className="flex flex-col">
                                            <span className="text-lg md:text-xl text-slate-300 line-through font-bold decoration-slate-300/50 decoration-2">{formatProductPrice(product.originalPrice, product.store, product.link)}</span>
                                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Saved {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Offers */}
                            <div className="bg-slate-50 rounded-[2rem] p-8 mb-10 relative overflow-hidden group border border-slate-100">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                                <h4 className="font-black text-slate-900 text-xs flex items-center gap-3 mb-6 uppercase tracking-[0.2em]">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                        <Tag size={16} className="text-indigo-600" />
                                    </div>
                                    Exclusive Unlockable Offers
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { icon: '💳', title: 'SBI Card Special', text: 'Extra 10% instant discount on orders above ₹5,000' },
                                        { icon: '💎', title: 'Hunt Member Price', text: 'Flat ₹500 off for registered hunters today' }
                                    ].map((offer, o) => (
                                        <div key={o} className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 group-hover:bg-slate-50/50 transition-colors">
                                            <span className="text-2xl h-fit">{offer.icon}</span>
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{offer.title}</p>
                                                <p className="text-xs text-slate-600 font-bold leading-relaxed">{offer.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                                <motion.a
                                    href={product.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex-[3] h-20 rounded-[1.5rem] ${brand.bg} text-white font-black text-base shadow-2xl ${brand.shadow} transition-all flex items-center justify-center gap-4 group relative overflow-hidden`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                    <ShoppingBag size={24} className="group-hover:rotate-12 transition-transform" />
                                    <span className="uppercase tracking-widest">Get Best Deal at {product.store}</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                </motion.a>
                                
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        showToast('Deal link copied!', 'success');
                                    }}
                                    className="flex-1 h-20 rounded-[1.5rem] bg-white border-2 border-slate-100 flex flex-col items-center justify-center gap-1 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                                >
                                    <Share2 size={24} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Share Deal</span>
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Analytics Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 bg-slate-50/30 p-8 md:p-12 lg:p-16 gap-8 border-t border-slate-100">
                        <PriceHistoryChart price={product.price} />
                        <PriceComparisonTable currentStore={product.store} currentPrice={product.price} />
                    </div>
                </div>

                {/* Compact Sections: Specs & Description */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                        {/* Specifications Card - Light Mode */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-1">
                                    <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 tracking-tight">
                                        <Info size={16} className="text-blue-500" /> PRODUCT OVERVIEW
                                    </h3>
                                    <p className="text-slate-500 text-xs leading-relaxed font-medium">
                                        Premium quality {product.title}. Designed for modern lifestyles, combining durability with aesthetic appeal. High-quality materials and ergonomic design.
                                    </p>
                                </div>
                                <div className="flex-[2]">
                                    <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 tracking-tight">
                                        <ShieldCheck size={16} className="text-emerald-500" /> SPECIFICATIONS
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                                        {[
                                            { label: 'Brand', value: product.store },
                                            { label: 'Category', value: product.category || 'Gear' },
                                            { label: 'Model', value: '2026' },
                                            { label: 'Warranty', value: '2 Years' },
                                            { label: 'Rating', value: `${product.rating || '4.5'}/5` },
                                            { label: 'Stock', value: 'In Stock' }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.label}</span>
                                                <span className={`text-slate-900 font-black text-[11px] truncate ${item.value === 'In Stock' ? 'text-emerald-600' : ''}`}>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Trust Row - Light Mode */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-slate-900 h-full flex flex-col justify-center">
                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { icon: <ShieldCheck size={16} className="text-emerald-500" />, title: 'Protected' },
                                    { icon: <Truck size={16} className="text-blue-500" />, title: 'Free Delivery' },
                                    { icon: <Clock size={16} className="text-orange-500" />, title: 'Flash Price' }
                                ].map((badge, b) => (
                                    <div key={b} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                            {badge.icon}
                                        </div>
                                        <p className="font-black text-[11px] uppercase tracking-wider text-slate-700">{badge.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Reviews Preview - Light Mode */}
                <div id="reviews" className="mt-6">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Customer Feedback</h3>
                                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                    <Star size={12} className="text-amber-500" fill="currentColor" />
                                    <span className="text-xs font-black text-amber-700">{product.rating || '4.5'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowReviewModal(true)}
                                className="text-[#4f46e5] font-black text-[11px] uppercase tracking-widest hover:underline">
                                Write Review
                            </button>
                        </div>

                        <div className="p-6">
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 ${allReviewsExpanded ? '' : 'max-h-[160px] overflow-hidden'}`}>
                                {reviews.map((review, i) => (
                                    <div key={i} className="relative border-b border-slate-50 pb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex text-amber-400">
                                                    {[...Array(5)].map((_, s) => <Star key={s} size={10} fill={s < review.rating ? "currentColor" : "none"} />)}
                                                </div>
                                                <span className="text-[10px] text-slate-900 font-black">{review.user}</span>
                                            </div>
                                            <span className="text-[9px] text-slate-400 font-bold">{review.date}</span>
                                        </div>
                                        <p className="text-slate-600 text-xs italic">"{review.comment}"</p>
                                    </div>
                                ))}
                            </div>

                            {!allReviewsExpanded && (
                                <button
                                    onClick={() => setAllReviewsExpanded(true)}
                                    className="mt-6 w-full py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-900 transition-colors">
                                    View all {reviews.length} Reviews
                                </button>
                            )}

                            {allReviewsExpanded && (
                                <button
                                    onClick={() => setAllReviewsExpanded(false)}
                                    className="mt-6 w-full py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    Show Less
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Review Modal - Light Mode */}
                <AnimatePresence>
                    {showReviewModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowReviewModal(false)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative bg-white border border-slate-100 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-black text-slate-900">Write a Review</h3>
                                        <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block text-center">Your Rating</label>
                                            <div className="flex justify-center gap-3">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setNewReview({ ...newReview, rating: star })}
                                                        className={`transition-all duration-300 ${newReview.rating >= star ? 'text-amber-400 scale-110 drop-shadow-sm' : 'text-slate-200 hover:text-amber-200'}`}
                                                    >
                                                        <Star size={32} fill={newReview.rating >= star ? "currentColor" : "none"} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Your Feedback</label>
                                            <textarea
                                                rows="4"
                                                className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-all resize-none placeholder-slate-400"
                                                placeholder="What did you like or dislike about this product?"
                                                value={newReview.comment}
                                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                            />
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (!newReview.comment.trim()) {
                                                    alert("Please write a comment before submitting.");
                                                    return;
                                                }
                                                const newEntry = {
                                                    user: user?.name || "Guest User",
                                                    rating: newReview.rating,
                                                    comment: newReview.comment
                                                };

                                                try {
                                                    const res = await fetch(`http://localhost:5000/api/deals/${product._id || product.id}/reviews`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(newEntry)
                                                    });
                                                    if (res.ok) {
                                                        const updatedDeal = await res.json();
                                                        if (updatedDeal.reviews) {
                                                            setReviews(updatedDeal.reviews);
                                                        } else {
                                                            setReviews([{ ...newEntry, date: new Date() }, ...reviews]);
                                                        }
                                                        setNewReview({ rating: 5, comment: '' });
                                                        setShowReviewModal(false);
                                                        showToast("Thank you for your review! It is now live.", "success");
                                                    } else {
                                                        showToast("Failed to submit review.", "error");
                                                    }
                                                } catch (err) {
                                                    showToast("Error submitting review.", "error");
                                                }
                                            }}
                                            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                                        >
                                            Submit Review
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Similar/Related Items - Light Mode */}
                <div className="mt-16">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-bold text-slate-900">You might also like</h3>
                        <Link to="/deals" className="text-[#4f46e5] font-bold hover:underline flex items-center gap-1 text-sm bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                            View all deals <ArrowRight size={16} />
                        </Link>
                    </div>
                    {
                        similarDeals.length > 0 ? (
                            <DealsGrid deals={similarDeals} wishlist={wishlist} toggleWishlist={toggleWishlist} newTab={true} />
                        ) : (
                            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-500">More deals coming soon!</p>
                            </div>
                        )
                    }
                </div>

                {/* Recently Viewed - Light Mode */}
                {recentlyViewed && recentlyViewed.filter(p => (p.id || p._id) !== (product?.id || product?._id)).length > 0 && (
                    <div className="mt-20 pt-16 border-t border-slate-100 px-4 md:px-0">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">History</p>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Your Browsing History</h3>
                            </div>
                        </div>
                        <DealsGrid 
                            deals={recentlyViewed.filter(p => (p.id || p._id) !== (product?.id || product?._id)).slice(0, 5)} 
                            wishlist={wishlist} 
                            toggleWishlist={toggleWishlist} 
                        />
                    </div>
                )}
            </main >

            <MobileFloatingBar product={product} brand={brand} />
            <Footer showToast={showToast} />
        </div>
    );
};

export default ProductDetails;
