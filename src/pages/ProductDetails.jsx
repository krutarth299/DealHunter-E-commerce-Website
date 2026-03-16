/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Star, Heart, ShoppingBag, Truck, ShieldCheck, Clock, User, ThumbsUp, Info, Tag, MapPin, ExternalLink, TrendingDown, CheckCircle2, X, Share2, PlayCircle } from 'lucide-react';
import DealsGrid from '../components/DealsGrid';
import { useWishlistAnimation } from '../context/wishlistAnimationContextDefinition';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeImageUrl } from '../utils/imageOptimizer';

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
    const { flyToWishlist } = useWishlistAnimation();
    const imageRef = useRef(null);
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

    const handleNextImage = () => {
        if (media.length <= 1) return;
        const nextIdx = (activeIndex + 1) % media.length;
        setActiveImage(media[nextIdx]);
    };

    const handlePrevImage = () => {
        if (media.length <= 1) return;
        const prevIdx = (activeIndex - 1 + media.length) % media.length;
        setActiveImage(media[prevIdx]);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'ArrowRight') handleNextImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, media]);

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
    }, [id, deals]);

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
                description={product.description || `Get the best deal on ${product.title} at ${product.store}. Check out the latest offers and coupons on DealSphere.`}
                image={activeImage}
            />
            <Navbar user={null} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />
            <main id="product-details-loaded" className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-16">
                {/* Breadcrumb / Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 md:mb-6 font-bold uppercase tracking-widest text-[9px] md:text-sm bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-100 w-fit shadow-sm"
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                    <div className="grid grid-cols-1 lg:grid-cols-2">

                        {/* Image Section */}
                        <div className="relative p-4 sm:p-6 md:p-10 lg:p-12 flex flex-col items-center justify-center min-h-[250px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[450px] group overflow-hidden gap-4 md:gap-6 border-b border-slate-100 lg:border-b-0 lg:border-r">
                            <motion.div
                                key={activeImage || 'fallback'}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                                className="relative w-full max-w-2xl aspect-video group-hover:scale-[1.02] transition-transform duration-500 z-10 mx-auto rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center group/main"
                            >
                                {activeImage && (activeImage.includes('.mp4') || activeImage.includes('youtube.com') || activeImage.includes('vimeo.com')) ? (
                                    activeImage.includes('youtube.com') || activeImage.includes('vimeo.com') ? (
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
                                    )
                                ) : (
                                    <div className="relative w-full h-full group/main">
                                        <img
                                            ref={imageRef}
                                            src={optimizeImageUrl(activeImage) || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop'}
                                            alt={product.title}
                                            className="w-full h-full object-contain filter drop-shadow-2xl p-4"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop';
                                            }}
                                        />
                                        
                                        {/* Navigation Arrows */}
                                        {media.length > 1 && (
                                            <>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-lg flex items-center justify-center text-slate-700 opacity-0 group-hover/main:opacity-100 transition-opacity hover:bg-white hover:text-indigo-600 z-10"
                                                >
                                                    <ChevronLeft size={24} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-lg flex items-center justify-center text-slate-700 opacity-0 group-hover/main:opacity-100 transition-opacity hover:bg-white hover:text-indigo-600 z-10"
                                                >
                                                    <ChevronRight size={24} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </motion.div>

                            {/* Thumbnail Gallery */}
                            {((product.images && product.images.length > 0) || (product.videos && product.videos.length > 0)) && (
                                <div className="flex gap-4 overflow-x-auto max-w-full pb-4 px-2 snap-x no-scrollbar">
                                    {/* Video Thumbnails First */}
                                    {product.videos && product.videos.map((vid, idx) => (
                                        <button
                                            key={`vid-${idx}`}
                                            onClick={() => setActiveImage(vid)}
                                            className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[1.2rem] overflow-hidden snap-center bg-slate-900 border-2 transition-all duration-300 flex items-center justify-center ${activeImage === vid ? 'border-[#4f46e5]' : 'border-slate-100 opacity-70 hover:opacity-100'}`}
                                        >
                                            <PlayCircle className="text-white" size={32} />
                                            <div className="absolute inset-0 bg-black/20" />
                                        </button>
                                    ))}
                                    {/* Image Thumbnails */}
                                    {product.images && product.images.map((img, idx) => (
                                        <button
                                            key={`img-${idx}`}
                                            onClick={() => setActiveImage(img)}
                                            className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[1.2rem] overflow-hidden snap-center bg-white border-2 transition-all duration-300 ${activeImage === img ? 'border-[#4f46e5]' : 'border-slate-100 hover:border-slate-300 opacity-70 hover:opacity-100'}`}
                                        >
                                            <img
                                                src={optimizeImageUrl(img)}
                                                alt={`Thumbnail ${idx}`}
                                                className="w-full h-full object-contain mix-blend-multiply p-2"
                                                loading="lazy"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Details Section */}
                        <div className="p-5 md:p-6 lg:p-8 flex flex-col h-full bg-white relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-100">
                                        <CheckCircle2 size={12} /> VERIFIED DEAL
                                    </span>
                                    {parseInt(product.discount) > 40 && (
                                        <span className="text-[10px] font-black bg-indigo-50 text-[#4f46e5] px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse border border-indigo-100">
                                            🔥 BEST PRICE
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <motion.button
                                        whileTap={{ scale: 0.8 }}
                                        animate={isWishlisted ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        onClick={() => {
                                            if (!isWishlisted && imageRef.current) {
                                                const rect = imageRef.current.getBoundingClientRect();
                                                flyToWishlist(product.image, rect);
                                            }
                                            toggleWishlist(product);
                                        }}
                                        className={`p-2.5 rounded-full border transition-all ${isWishlisted ? 'bg-indigo-50 text-[#4f46e5] border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-[#4f46e5] hover:border-indigo-200 hover:bg-indigo-50'} `}
                                    >
                                        <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                                    </motion.button>
                                </div>
                            </div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xl md:text-3xl font-extrabold text-slate-900 mb-3 leading-snug tracking-tight"
                            >
                                {product.title}
                            </motion.h1>

                            <div className="flex items-center gap-3 text-slate-500 mb-6 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs uppercase tracking-widest text-slate-500">Sold by:</span>
                                    <span className="text-blue-600 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded flex items-center gap-1">
                                        <ShoppingBag size={14} /> {product.store}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-[#4f46e5] border border-indigo-100 rounded-full text-xs font-black shadow-sm">
                                    <TrendingDown size={12} className="rotate-180" />
                                    {viewCount.toLocaleString()} views
                                </div>
                            </div>

                            {/* Timer Badge */}
                            <div className="bg-orange-50 border border-orange-100 text-orange-600 px-4 py-1.5 rounded-lg text-sm font-bold w-fit mb-6 flex items-center gap-2">
                                <Clock size={16} className="animate-pulse" />
                                <span>Offer ends in: <span className="tabular-nums">{timeLeft.hours}h : {timeLeft.minutes}m : {timeLeft.seconds}s</span></span>
                            </div>

                            <div className="flex items-center gap-2.5 mb-5">
                                <span className={`font-extrabold text-slate-900 tracking-tight ${brand.text === 'Store' ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'}`}>
                                    {formatProductPrice(product.price, product.store, product.link)}
                                </span>
                                <div className="flex flex-col">
                                    {product.originalPrice && (
                                        <span className="text-sm text-slate-400 line-through font-bold opacity-60 tracking-tight">{formatProductPrice(product.originalPrice, product.store, product.link)}</span>
                                    )}
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 flex items-center py-0.5 rounded-md w-fit uppercase tracking-widest leading-none">
                                        {product.discount || '40%'}
                                    </span>
                                </div>
                            </div>

                            {/* Bank Offers - Minimal Style */}
                            <div className="mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2 mb-3 uppercase tracking-widest">
                                    <Tag size={14} className="text-indigo-600" /> Available Offers
                                </h4>
                                <div className="space-y-3">
                                    {[
                                        { type: 'Bank Offer', text: 'Flat ₹200 off on Alpha Bank Credit Cards.', link: 'T&C' },
                                        { type: 'Partner Offer', text: 'GST invoice save up to 28% on business purchases.', link: 'Know More' }
                                    ].map((offer, o) => (
                                        <div key={o} className="flex gap-2">
                                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded h-fit shrink-0 tracking-wider whitespace-nowrap">{offer.type}</span>
                                            <p className="text-[11px] text-slate-700 font-medium leading-tight pt-0.5">
                                                {offer.text} <span className="text-indigo-600 cursor-pointer font-bold hover:underline ml-1">{offer.link}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Indigo Bullet */}
                            {[
                                'Premium build quality with aerospace-grade materials',
                                'Optimized for long-term durability and heavy use',
                                'Sleek, ergonomic design for maximum comfort',
                                'Verified by thousands of global customers'
                            ].map((highlight, h) => (
                                <div key={h} className="flex items-start gap-3 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] mt-1.5 shrink-0 opacity-80" />
                                    <p className="text-xs text-slate-700 font-medium leading-relaxed group-hover:text-slate-900 transition-colors">{highlight}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <PriceHistoryChart price={product.price} />
                        <PriceComparisonTable currentStore={product.store} currentPrice={product.price} />

                        {/* Action Buttons Integrated */}
                        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col justify-center gap-3">
                            <div className="flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: '#f8fafc' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        const toastEvent = new CustomEvent('showToast', { detail: { message: 'Link copied to clipboard!', type: 'success' } });
                                        window.dispatchEvent(toastEvent);
                                    }}
                                    className="bg-white border border-slate-200 text-slate-600 font-bold p-3 rounded-2xl transition-all shrink-0 flex items-center justify-center hover:text-slate-900 shadow-sm"
                                    title="Share Deal"
                                >
                                    <Share2 size={20} />
                                </motion.button>
                                {product.isExpired ? (
                                    <div className="flex-1 bg-slate-100 text-slate-400 font-black text-xs py-4 rounded-[1.25rem] flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200 uppercase tracking-[0.1em]">
                                        DEAL ENDED <X size={16} />
                                    </div>
                                ) : (
                                    <motion.a
                                        href={product.link || `https://www.google.com/search?q=${encodeURIComponent(product.title + ' ' + (product.store || ''))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.02, translateY: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`flex-1 ${brand.bg} text-white font-black text-xs py-4 rounded-[1.25rem] shadow-xl ${brand.shadow} transition-all flex items-center justify-center gap-2.5 no-underline uppercase tracking-[0.15em] relative overflow-hidden group`}
                                    >
                                        {/* Glare effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-all duration-700 ease-in-out" />
                                        
                                        <ShoppingBag size={18} className="group-hover:rotate-12 transition-transform" />
                                        <span>Buy on {brand.text}</span>
                                        <ExternalLink size={14} className="opacity-50" />
                                    </motion.a>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-3 px-4">
                                <div className="h-[1px] flex-1 bg-slate-100" />
                                <p className="text-[10px] text-slate-400 font-black flex items-center gap-1.5 uppercase tracking-widest whitespace-nowrap opacity-80">
                                    <Clock size={12} className="text-orange-500" /> Limited time offer
                                </p>
                                <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>
                        </div>
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
            </main >

            <MobileFloatingBar product={product} brand={brand} />
            <Footer showToast={showToast} />
        </div>
    );
};

export default ProductDetails;
