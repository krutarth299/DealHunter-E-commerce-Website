/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Star, Heart, ShoppingBag, ShieldCheck, Clock, Info, ExternalLink, TrendingDown, CheckCircle2, X, Share2, PlayCircle, Store, Eye, BarChart3, Sparkles, Maximize2, Zap } from 'lucide-react';
import DealsGrid from '../components/DealsGrid';
import ProductCouponStrip from '../components/ProductCouponStrip';
import { useWishlistAnimation } from '../context/wishlistAnimationContextDefinition';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeImageUrl, getMainProductImage, getProductImageGallery, NO_PRODUCT_IMAGE } from '../utils/imageOptimizer';
import { resolveBuyLink } from '../utils/affiliateLinks';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { resetProductRouteScroll } from '../utils/scroll';
import { getDisplayTitle } from '../utils/productTitles';
import useHasHydrated from '../hooks/useHasHydrated';

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

const parsePriceValue = (value) => {
    const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getReviewCount = (product = {}, reviews = []) => {
    if (Array.isArray(reviews) && reviews.length > 0) return reviews.length;
    if (Array.isArray(product.reviews)) return product.reviews.length;
    return Number(product.reviewCount || product.reviewsCount || 0) || 0;
};

const formatCompactCount = (count = 0) => {
    const value = Number(count) || 0;
    if (value >= 100000) return `${Math.round(value / 100000)}L+`;
    if (value >= 1000) return `${Math.round(value / 1000)}K+`;
    return value > 0 ? value.toLocaleString('en-IN') : '';
};

const getPopularityLabel = (product = {}) => {
    const boughtCount = Number(product.boughtCount || product.purchaseCount || product.soldCount || product.ordersCount || 0) || 0;
    if (boughtCount > 0) return `${formatCompactCount(boughtCount)} bought`;

    const popularity = String(product.popularity || product.salesVolume || '').trim();
    return popularity.length > 0 ? popularity : '';
};

const getLowStockLabel = (product = {}) => {
    const stockLeft = Number(product.stockLeft || product.remainingStock || product.quantityLeft || 0) || 0;
    if (stockLeft > 0 && stockLeft <= 5) return `Only ${stockLeft} left`;
    if (product.lowStock || product.isLowStock) return 'Only few left';
    return '';
};

const getUpdatedLabel = (product = {}) => {
    const stamp = product.updatedAt || product.createdAt || product.viewedAt;
    if (!stamp) return 'Live price checked';
    const time = new Date(stamp).getTime();
    if (!Number.isFinite(time)) return 'Live price checked';

    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (minutes < 2) return 'Updated just now';
    if (minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `Updated ${hours}h ago`;
    return `Updated ${Math.round(hours / 24)}d ago`;
};

const getPriceCheckedLabel = (product = {}) => {
    const stamp = product.updatedAt || product.createdAt || product.viewedAt;
    if (!stamp) return 'Price checked recently';
    const time = new Date(stamp).getTime();
    if (!Number.isFinite(time)) return 'Price checked recently';

    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (minutes < 2) return 'Price checked just now';
    if (minutes < 60) return `Price checked ${minutes} minutes ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `Price checked ${hours} hours ago`;
    return `Last updated ${Math.round(hours / 24)} days ago`;
};

const getStoreLogoUrl = (product = {}) => {
    const store = String(product.store || product.storeName || '').toLowerCase().replace(/\s+/g, '');
    try {
        const url = new URL(product.productUrl || product.link || product.affiliateLink || '');
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
    } catch {
        return store ? `https://www.google.com/s2/favicons?domain=${store}.com&sz=128` : '';
    }
};

const createProductHighlights = (product = {}, title = '') => {
    const rawDescription = String(product.description || '').replace(/\s+/g, ' ').trim();
    const descriptionPoints = rawDescription
        .split(/(?:\.\s+|•|\n|;)/)
        .map((point) => point.trim().replace(/^[-*]\s*/, ''))
        .filter((point) => point.length >= 18 && point.length <= 180)
        .slice(0, 5);

    if (descriptionPoints.length > 0) return descriptionPoints;

    return [
        product.category ? `${product.category} deal from ${product.store || 'the source store'}` : '',
        title ? `Product: ${title}` : '',
        product.availability ? `Availability: ${product.availability}` : '',
    ].filter(Boolean);
};

const buildPriceInsight = (product = {}, alternatives = []) => {
    const current = parsePriceValue(product.dealPrice || product.price);
    const mrp = parsePriceValue(product.mrp || product.originalPrice);
    const historyPrices = (Array.isArray(product.priceHistory) ? product.priceHistory : [])
        .map((point) => parsePriceValue(point?.price || point?.dealPrice || point))
        .filter((price) => price > 0);
    const livePrices = alternatives
        .map((deal) => parsePriceValue(deal.dealPrice || deal.price))
        .filter((price) => price > 0);
    const comparisonPrices = [current, ...livePrices].filter((price) => price > 0);
    const historyAndCurrent = [current, ...historyPrices].filter((price) => price > 0);
    const referencePrices = mrp > current ? [...comparisonPrices, ...historyPrices, mrp] : [...comparisonPrices, ...historyPrices];
    const lowest = historyAndCurrent.length ? Math.min(...historyAndCurrent) : current;
    const average = referencePrices.length
        ? Math.round(referencePrices.reduce((sum, price) => sum + price, 0) / referencePrices.length)
        : current;
    const discountPercent = mrp > current && current > 0
        ? Math.round(((mrp - current) / mrp) * 100)
        : Number(product.discountPercent || parseInt(product.discount, 10) || 0);

    const quality = discountPercent >= 50 || (current > 0 && lowest > 0 && current <= lowest)
        ? 'Best Deal'
        : discountPercent >= 15
            ? 'Good Deal'
            : 'Live Deal';

    return {
        current,
        mrp,
        lowest,
        average,
        discountPercent,
        quality,
        liveComparisonCount: comparisonPrices.length,
        hasPriceHistory: historyPrices.length > 0
    };
};

const PriceInsightPanel = ({ product, alternatives, store, link }) => {
    const insight = React.useMemo(() => buildPriceInsight(product, alternatives), [product, alternatives]);

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm relative overflow-hidden h-full">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-orange-100/70 blur-3xl" />
            <div className="relative z-10 flex items-start justify-between gap-4 mb-6">
                <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.22em] mb-2">Price Insight</p>
                    <h3 className="text-2xl font-black text-slate-950 tracking-tight">Deal quality: {insight.quality}</h3>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                        {insight.hasPriceHistory
                            ? 'Based on saved price history, current price and MRP.'
                            : `Based on this product price, MRP, and ${insight.liveComparisonCount} live listing${insight.liveComparisonCount === 1 ? '' : 's'} available here.`}
                    </p>
                </div>
                <div className="shrink-0 rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
                    <BarChart3 size={22} />
                </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-4">
                    <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Best price ever</span>
                    <p className="mt-2 text-xl font-black text-emerald-800">{formatProductPrice(insight.lowest, store, link)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Average price</span>
                    <p className="mt-2 text-xl font-black text-slate-950">{formatProductPrice(insight.average, store, link)}</p>
                </div>
                {insight.discountPercent > 0 && (
                    <div className="col-span-2 rounded-3xl bg-orange-50 border border-orange-100 p-4 flex items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-black text-orange-700 uppercase tracking-widest">Savings percentage</span>
                            <p className="mt-1 text-[11px] font-bold text-orange-700/70">Calculated from current deal price and MRP.</p>
                        </div>
                        <span className="text-3xl font-black text-orange-700">{insight.discountPercent}%</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const AlternativesSnapshot = ({ alternatives = [], currentStore = '', store = '', link = '' }) => {
    const rows = alternatives
        .map((deal) => ({
            id: deal.id || deal._id || deal.productUrl,
            title: deal.cardTitle || deal.displayTitle || deal.title,
            store: deal.store || deal.storeName || 'Store',
            price: parsePriceValue(deal.dealPrice || deal.price)
        }))
        .filter((deal) => deal.price > 0)
        .slice(0, 4);

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm h-full">
            <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em] mb-2">Best Alternatives</p>
                    <h3 className="text-xl font-black text-slate-950">Similar live prices</h3>
                </div>
                <TrendingDown size={22} className="text-blue-600" />
            </div>

            {rows.length > 0 ? (
                <div className="space-y-3">
                    {rows.map((deal) => (
                        <div key={deal.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{deal.store}</p>
                                <p className="mt-1 truncate text-xs font-bold text-slate-700">{deal.title}</p>
                            </div>
                            <span className="shrink-0 text-sm font-black text-slate-950">{formatProductPrice(deal.price, store, link)}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <p className="text-xs font-bold leading-relaxed text-slate-500">
                        No same-category alternatives are available on DealSphere right now. Continue with the verified {currentStore || 'store'} offer above.
                    </p>
                </div>
            )}
        </div>
    );
};

const MarketInsightPanel = ({ product, insight, alternatives = [], checkedLabel, store, link, onShare }) => {
    const validAlternativeCount = alternatives.filter((deal) => parsePriceValue(deal.dealPrice || deal.price) > 0).length;
    const savingsVsAverage = insight.average > insight.current ? insight.average - insight.current : 0;
    const savingsVsAveragePercent = savingsVsAverage > 0 && insight.average > 0
        ? Math.round((savingsVsAverage / insight.average) * 100)
        : 0;
    const timingSignal = insight.current > 0 && insight.lowest > 0 && insight.current <= insight.lowest
        ? 'Strong buy signal'
        : insight.discountPercent >= 25
            ? 'Worth checking now'
            : 'Compare before buying';
    const summary = savingsVsAverage > 0
        ? `This deal is ${savingsVsAveragePercent}% below the current comparison average on DealSphere.`
        : validAlternativeCount > 0
            ? 'Similar live prices are available below. Compare options before opening the source store.'
            : `This is the primary ${product.store || 'store'} listing we have for this product right now.`;

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm h-full flex flex-col">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.22em] mb-2">Market Insight</p>
                    <h3 className="text-xl font-black text-slate-950 tracking-tight">{timingSignal}</h3>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{summary}</p>
                </div>
                <div className="shrink-0 rounded-2xl bg-orange-50 p-3 text-orange-600 border border-orange-100">
                    <Sparkles size={22} />
                </div>
            </div>

            <div className="space-y-3 flex-1">
                <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={15} className="text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Price status</span>
                    </div>
                    <p className="mt-2 text-sm font-black leading-snug text-slate-900">{checkedLabel}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl bg-blue-50 border border-blue-100 p-4">
                        <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Similar listings</span>
                        <p className="mt-2 text-3xl font-black leading-none text-blue-700">{validAlternativeCount}</p>
                    </div>
                    <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-4">
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Vs average</span>
                        <p className="mt-2 text-lg font-black leading-tight text-emerald-800">
                            {savingsVsAverage > 0 ? `${formatProductPrice(savingsVsAverage, store, link)} less` : 'Check store'}
                        </p>
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={onShare}
                className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-sm flex items-center justify-center gap-2"
            >
                <Share2 size={16} />
                Share price check
            </button>
        </div>
    );
};

const MobileFloatingBar = ({ product, brand, buyLink }) => {
    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-[6.1rem] left-4 right-4 z-40 bg-white/95 backdrop-blur-2xl border border-slate-200 px-4 py-3.5 flex items-center justify-between gap-3 md:hidden shadow-[0_24px_60px_-22px_rgba(2,6,23,0.55)] rounded-[2rem]"
        >
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Buy from {product.store}</p>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-2xl font-black leading-none text-slate-900 tracking-tighter">{formatProductPrice(product.price, product.store, buyLink || product.link)}</span>
                    {product.originalPrice && (
                        <span className="text-xs text-slate-400 line-through font-bold opacity-60">{formatProductPrice(product.originalPrice, product.store, buyLink || product.link)}</span>
                    )}
                </div>
            </div>
            {buyLink ? (
                <a
                    href={buyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-14 px-5 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-blue-600 text-white font-black text-xs shadow-xl shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2 hover:brightness-110 active:brightness-90 relative overflow-hidden group no-underline uppercase tracking-wider"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    <ShoppingBag size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Grab Deal</span>
                    <ExternalLink size={14} className="opacity-60" />
                </a>
            ) : (
                <div className="h-14 px-6 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm border border-slate-200 flex items-center justify-center">
                    Deal Link Unavailable
                </div>
            )}
        </motion.div>
    );
};

const ProductDetails = ({ deals, user, wishlist, toggleWishlist, showToast, onSearch, setIsAddDealOpen, apiBase }) => {
    // ... params & hooks
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { flyToWishlist } = useWishlistAnimation();
    const { addRecentlyViewed } = useRecentlyViewed();
    const pageTopRef = useRef(null);
    const productHeroRef = useRef(null);
    const imageRef = useRef(null);
    const hasHydrated = useHasHydrated();
    const getProductEntryAnchor = () => productHeroRef.current || pageTopRef.current;

    useLayoutEffect(() => {
        resetProductRouteScroll(getProductEntryAnchor());
    }, [id, location.key]);

    // Synchronous initialization for SSR support
    const initialProduct = useMemo(() => {
        if (!deals || !id) return null;
        return deals.find(d => (d.id || d._id || d.dealId)?.toString() === id);
    }, [id, deals]);

    const [product, setProduct] = useState(initialProduct);
    const [loading, setLoading] = useState(!initialProduct);
    const [activeImage, setActiveImage] = useState(initialProduct ? getMainProductImage(initialProduct) : '');
    const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [allReviewsExpanded, setAllReviewsExpanded] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [reviews, setReviews] = useState(initialProduct?.reviews || []);
    const [viewCount, setViewCount] = useState(Number(initialProduct?.views || 0) || 0);
    const [selectedVariantKey, setSelectedVariantKey] = useState('');

    // Populate reviews when product loads
    useEffect(() => {
        if (product && product.reviews) {
            setReviews(product.reviews);
        } else if (product) {
            setReviews([]);
        }
    }, [product]);

    const isWishlisted = product && wishlist?.some(item => {
        const itemId = item.id || item._id;
        const prodId = product.id || product._id;
        return itemId && prodId && String(itemId) === String(prodId);
    });

    // ... useEffects
    // (omitted for brevity, keep existing useEffects)



    const variantOptions = React.useMemo(() => {
        const variants = Array.isArray(product?.variants) ? product.variants : [];
        const seen = new Set();
        return variants.filter((variant) => {
            const key = String(variant.variantKey || variant.id || variant.productUrl || variant.label || '');
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return Boolean(variant.label || variant.title || variant.image);
        });
    }, [product]);

    const selectedVariant = React.useMemo(() => (
        variantOptions.find((variant) => (
            String(variant.variantKey || variant.id) === selectedVariantKey
        )) || null
    ), [selectedVariantKey, variantOptions]);

    const displayProduct = React.useMemo(() => {
        if (!product || !selectedVariant) return product;

        return {
            ...product,
            title: selectedVariant.title || product.title,
            displayTitle: selectedVariant.displayTitle || undefined,
            cardTitle: selectedVariant.cardTitle || undefined,
            image: selectedVariant.image || product.image,
            images: selectedVariant.images?.length ? selectedVariant.images : product.images,
            price: selectedVariant.price || product.price,
            dealPrice: selectedVariant.dealPrice || product.dealPrice,
            originalPrice: selectedVariant.originalPrice || product.originalPrice,
            mrp: selectedVariant.mrp || product.mrp,
            discount: selectedVariant.discount || product.discount,
            discountPercent: selectedVariant.discountPercent || product.discountPercent,
            link: selectedVariant.link || selectedVariant.productUrl || product.link,
            productUrl: selectedVariant.productUrl || product.productUrl,
            affiliateLink: selectedVariant.affiliateLink || product.affiliateLink,
            affiliateOverrideLink: selectedVariant.affiliateOverrideLink || product.affiliateOverrideLink,
            selectedVariantLabel: selectedVariant.label,
            selectedVariantType: selectedVariant.type,
            availability: selectedVariant.availability || product.availability
        };
    }, [product, selectedVariant]);

    const productIdentity = displayProduct ? String(displayProduct.id || displayProduct._id || displayProduct.dealId || selectedVariantKey || '') : '';
    const productMainImage = React.useMemo(() => displayProduct ? getMainProductImage(displayProduct) : '', [displayProduct]);
    const productImages = React.useMemo(() => getProductImageGallery(displayProduct), [displayProduct]);

    // Unified media array (videos then trusted product images)
    const media = React.useMemo(() => {
        if (!displayProduct) return [];
        return [...(displayProduct.videos || []), ...productImages];
    }, [displayProduct, productImages]);

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
            if (media.length <= 1) return;
            const currentIndex = media.indexOf(activeImage);
            const safeIndex = currentIndex >= 0 ? currentIndex : 0;
            if (e.key === 'ArrowLeft') {
                setActiveImage(media[(safeIndex - 1 + media.length) % media.length]);
            }
            if (e.key === 'ArrowRight') {
                setActiveImage(media[(safeIndex + 1) % media.length]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeImage, media]);

    // Derived state for similar deals
    const similarDeals = product && deals
        ? deals.filter(d => {
            const dId = d.id || d._id;
            const pId = product.id || product._id;
            return d.category === product.category && dId && pId && String(dId) !== String(pId);
        }).slice(0, 5)
        : [];

    // Real-time View Tracking & Sync
    useEffect(() => {
        if (deals && deals.length > 0) {
            const foundProduct = deals.find(d => (d.id || d._id || d.dealId)?.toString() === id);
            if (foundProduct) {
                setProduct(foundProduct);
                setLoading(false);

                // Track view in background (client only)
                if (typeof window !== 'undefined') {
                    const nid = foundProduct._id || foundProduct.id;
                    const api = apiBase?.replace('/user', '') || 'http://localhost:5000/api';
                    fetch(`${api}/deals/${nid}/view`, { method: 'POST' })
                        .then(res => res.json())
                        .then(data => { if (data.views) setViewCount(data.views); })
                        .catch(err => console.error("Error tracking view", err));
                }
            }
        }
    }, [id, deals, apiBase]);

    useEffect(() => {
        if (!productMainImage) return;
        setActiveImage(productMainImage);
    }, [productIdentity, productMainImage]);

    useLayoutEffect(() => {
        if (loading) return;
        resetProductRouteScroll(getProductEntryAnchor());
    }, [loading, productIdentity]);

    useEffect(() => {
        if (!product) return;
        addRecentlyViewed(product);
    }, [product, addRecentlyViewed]);

    useEffect(() => {
        setSelectedVariantKey('');
    }, [id]);

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

    const activeProduct = displayProduct || product;
    const groupedVariantOptions = variantOptions.reduce((acc, variant) => {
        const type = variant.type || 'Option';
        if (!acc[type]) acc[type] = [];
        acc[type].push(variant);
        return acc;
    }, {});
    const hasVariantOptions = variantOptions.length > 1;
    const brand = getBrandColor(activeProduct.store);
    const buyLink = resolveBuyLink(activeProduct);
    const activeDisplayTitle = activeProduct.displayTitle || getDisplayTitle(activeProduct.title);
    const storeLogoUrl = getStoreLogoUrl(activeProduct);
    const productRating = Number(activeProduct.rating || 0);
    const reviewCount = getReviewCount(activeProduct, reviews);
    const updatedLabel = getUpdatedLabel(activeProduct);
    const priceCheckedLabel = getPriceCheckedLabel(activeProduct);
    const productHighlights = createProductHighlights(activeProduct, activeDisplayTitle);
    const priceInsight = buildPriceInsight(activeProduct, similarDeals);
    const availabilityLabel = activeProduct.availability || (activeProduct.isExpired ? 'Unavailable' : 'Check on store');
    const popularityLabel = getPopularityLabel(activeProduct);
    const lowStockLabel = getLowStockLabel(activeProduct);
    const handleShareDeal = async () => {
        if (typeof window === 'undefined') return;

        try {
            if (window.navigator?.clipboard?.writeText) {
                await window.navigator.clipboard.writeText(window.location.href);
            }

            if (typeof showToast === 'function') {
                showToast('Link copied to clipboard!', 'success');
                return;
            }

            window.dispatchEvent(new CustomEvent('showToast', {
                detail: { message: 'Link copied to clipboard!', type: 'success' }
            }));
        } catch {
            if (typeof showToast === 'function') {
                showToast('Could not copy the link automatically.', 'error');
            }
        }
    };

    return (
        <div ref={pageTopRef} className="product-route-page min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100">
            <SEO
                title={activeDisplayTitle}
                description={activeProduct.description || `Get the best deal on ${activeDisplayTitle} at ${activeProduct.store}. Check out the latest offers and coupons on DealSphere.`}
                image={productImages[0]}
                type="product"
                product={{
                    ...activeProduct,
                    displayTitle: activeDisplayTitle,
                    affiliateLink: buyLink
                }}
                breadcrumbs={[
                    { name: 'Home', url: '/' },
                    { name: activeProduct.category || 'Deals', url: activeProduct.category ? `/deals?category=${encodeURIComponent(activeProduct.category)}` : '/deals' },
                    { name: activeDisplayTitle, url: `/product/${activeProduct._id || activeProduct.id || id}` }
                ]}
            />
            <Navbar user={null} onSearch={onSearch} onAddDealClick={() => setIsAddDealOpen(true)} wishlistCount={wishlist?.length ?? 0} wishlist={wishlist} />
            <main id="product-details-loaded" data-ssr-ready={!loading ? "true" : "false"} className="product-details-container container mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-52 md:pb-16">
                {/* Breadcrumb / Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 md:mb-6 font-bold uppercase tracking-widest text-[9px] md:text-sm bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-100 w-fit shadow-sm"
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <div ref={productHeroRef} className="scroll-mt-24 md:scroll-mt-32 bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                    <div className="grid grid-cols-1 lg:grid-cols-2">

                        {/* Image Section */}
                        <div className="relative p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[560px] group overflow-hidden gap-4 md:gap-5 border-b border-slate-100 lg:border-b-0 lg:border-r bg-gradient-to-br from-slate-50 via-white to-slate-50">
                            <motion.div
                                key={activeImage || 'fallback'}
                                initial={hasHydrated ? { opacity: 0, scale: 0.95 } : false}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                                className="relative w-full max-w-xl aspect-square group-hover:scale-[1.01] transition-transform duration-500 z-10 mx-auto rounded-[2rem] overflow-hidden bg-white border border-slate-100 flex items-center justify-center group/main shadow-[0_30px_80px_-50px_rgba(15,23,42,0.7)]"
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
                                    <div
                                        onClick={() => setIsImageZoomOpen(true)}
                                        className="relative w-full h-full group/main cursor-zoom-in"
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open larger product image"
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setIsImageZoomOpen(true);
                                            }
                                        }}
                                    >
                                        <img
                                            ref={imageRef}
                                            src={optimizeImageUrl(activeImage) || NO_PRODUCT_IMAGE}
                                            alt={activeDisplayTitle}
                                            className="w-full h-full object-contain filter drop-shadow-2xl p-5 sm:p-8 transition-transform duration-700 md:group-hover/main:scale-110"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = NO_PRODUCT_IMAGE;
                                            }}
                                        />
                                        <div className="absolute right-4 top-4 rounded-2xl bg-white/90 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-0 shadow-lg transition-opacity md:group-hover/main:opacity-100 inline-flex items-center gap-1.5">
                                            <Maximize2 size={13} />
                                            Zoom
                                        </div>

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
                            {(productImages.length > 0 || (activeProduct.videos && activeProduct.videos.length > 0)) && (
                                <div className="flex gap-4 overflow-x-auto max-w-full pb-4 px-2 snap-x no-scrollbar">
                                    {/* Video Thumbnails First */}
                                    {activeProduct.videos && activeProduct.videos.map((vid, idx) => (
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
                                    {productImages.map((img, idx) => (
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
                                    {parseInt(activeProduct.discount) > 40 && (
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
                                                flyToWishlist(activeProduct.image, rect);
                                            }
                                            toggleWishlist(activeProduct);
                                        }}
                                        className={`p-2.5 rounded-full border transition-all ${isWishlisted ? 'bg-indigo-50 text-[#4f46e5] border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-[#4f46e5] hover:border-indigo-200 hover:bg-indigo-50'} `}
                                    >
                                        <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                                    </motion.button>
                                </div>
                            </div>

                            <motion.h1
                                initial={hasHydrated ? { opacity: 0, y: 10 } : false}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xl md:text-3xl font-extrabold text-slate-900 mb-3 leading-snug tracking-tight"
                            >
                                {activeDisplayTitle}
                            </motion.h1>

                            <div className="mb-6 rounded-[2rem] border border-slate-100 bg-slate-50 p-4 sm:p-5">
                                <div className="flex flex-wrap items-center gap-4">
                                    {storeLogoUrl && (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                                            <img src={storeLogoUrl} alt="" className="h-full w-full object-contain" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Source Store</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <span className="text-lg font-black text-slate-950">{activeProduct.store || 'Online Store'}</span>
                                            {productRating > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 border border-amber-100">
                                                    <Star size={12} fill="currentColor" />
                                                    {productRating}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {viewCount > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 border border-slate-100">
                                                <Eye size={12} /> {viewCount.toLocaleString('en-IN')} views
                                            </span>
                                        )}
                                        {reviewCount > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 border border-slate-100">
                                                <Star size={12} /> {reviewCount} reviews
                                            </span>
                                        )}
                                        {popularityLabel && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 border border-slate-100">
                                                <ShoppingBag size={12} /> {popularityLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span className="inline-flex items-center gap-1.5 text-emerald-600">
                                        <ShieldCheck size={13} /> Store link verified
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock size={13} /> {updatedLabel}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span>{availabilityLabel}</span>
                                </div>
                            </div>

                            <div className="mb-6 rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50/80 via-white to-white p-5 shadow-sm">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">Deal Price</p>
                                    {priceInsight.discountPercent > 0 && (
                                        <span className="rounded-2xl bg-orange-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20">
                                            Save {priceInsight.discountPercent}%
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-end gap-3">
                                    <span className="font-black text-slate-950 tracking-tighter leading-none text-5xl md:text-7xl">
                                        {formatProductPrice(activeProduct.price, activeProduct.store, buyLink || activeProduct.link)}
                                    </span>
                                    {activeProduct.originalPrice && (
                                        <span className="pb-1 text-xl text-slate-400 line-through decoration-2 font-black opacity-80 tracking-tight">{formatProductPrice(activeProduct.originalPrice, activeProduct.store, buyLink || activeProduct.link)}</span>
                                    )}
                                    {priceInsight.discountPercent > 0 && (
                                        <span className="mb-1 rounded-2xl bg-red-600 px-3 py-2 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20">
                                            {priceInsight.discountPercent}% OFF
                                        </span>
                                    )}
                                </div>
                                <p className="mt-3 text-xs font-semibold text-slate-500">
                                    Final price and availability are confirmed on {activeProduct.store || 'the source store'} before purchase.
                                </p>
                            </div>

                            <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {[
                                    {
                                        show: priceInsight.discountPercent > 0,
                                        icon: <Zap size={14} fill="currentColor" />,
                                        label: 'Limited Time Deal',
                                        className: 'bg-orange-50 text-orange-700 border-orange-100'
                                    },
                                    {
                                        show: Boolean(lowStockLabel),
                                        icon: <ShoppingBag size={14} />,
                                        label: lowStockLabel,
                                        className: 'bg-red-50 text-red-700 border-red-100'
                                    },
                                    {
                                        show: true,
                                        icon: <Clock size={14} />,
                                        label: updatedLabel || 'Recently updated',
                                        className: 'bg-blue-50 text-blue-700 border-blue-100'
                                    }
                                ].filter((item) => item.show).map((item) => (
                                    <div key={item.label} className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[10px] font-black uppercase tracking-widest ${item.className}`}>
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-6">
                                {activeProduct.isExpired ? (
                                    <div className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-100 px-6 py-5 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                                        Deal Ended <X size={18} />
                                    </div>
                                ) : buyLink ? (
                                    <motion.a
                                        href={buyLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.01, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-gradient-to-r from-orange-600 via-orange-500 to-blue-600 px-6 py-5 text-base font-black uppercase tracking-[0.16em] text-white shadow-2xl shadow-orange-500/25 transition-all no-underline hover:brightness-110 hover:shadow-blue-500/25"
                                    >
                                        <ShoppingBag size={22} />
                                        <span>Buy Now on {brand.text}</span>
                                        <ExternalLink size={16} className="opacity-70" />
                                    </motion.a>
                                ) : (
                                    <div className="flex w-full items-center justify-center rounded-[1.5rem] bg-slate-100 px-6 py-5 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                                        Deal Link Unavailable
                                    </div>
                                )}
                                <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <ShieldCheck size={13} className="text-emerald-500" />
                                    Buy button opens the exact original product page
                                </div>
                            </div>

                            {hasVariantOptions && (
                                <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                                Select Options
                                            </p>
                                            {selectedVariant && (
                                                <p className="mt-1 text-xs font-extrabold text-slate-900">
                                                    Selected: {selectedVariant.label}
                                                </p>
                                            )}
                                        </div>
                                        <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            {variantOptions.length} choices
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {Object.entries(groupedVariantOptions).map(([type, options]) => (
                                            <div key={type}>
                                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                    {type}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {options.map((variant) => {
                                                        const variantKey = String(variant.variantKey || variant.id);
                                                        const isActive = selectedVariant
                                                            ? variantKey === String(selectedVariant.variantKey || selectedVariant.id)
                                                            : variant.dealId && String(variant.dealId) === String(product._id || product.id);

                                                        return (
                                                            <button
                                                                key={variantKey}
                                                                type="button"
                                                                onClick={() => setSelectedVariantKey(isActive ? '' : variantKey)}
                                                                className={`flex min-h-12 max-w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-all ${isActive ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'}`}
                                                            >
                                                                {variant.image && (
                                                                    <img
                                                                        src={optimizeImageUrl(variant.image)}
                                                                        alt=""
                                                                        className="h-8 w-8 rounded-xl object-contain bg-white"
                                                                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                )}
                                                                <span className="max-w-[12rem] truncate text-xs font-black uppercase tracking-tight">
                                                                    {variant.label}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-6 rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
                                <h4 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900">
                                    <Sparkles size={15} className="text-blue-600" /> Product Highlights
                                </h4>
                                <div className="space-y-3">
                                    {productHighlights.map((highlight, h) => (
                                        <div key={h} className="flex items-start gap-3">
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-white text-emerald-600">
                                                <CheckCircle2 size={12} />
                                            </span>
                                            <p className="text-xs font-semibold leading-relaxed text-slate-700">{highlight}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 items-stretch">
                        <PriceInsightPanel product={activeProduct} alternatives={similarDeals} store={activeProduct.store} link={buyLink || activeProduct.link} />
                        <AlternativesSnapshot alternatives={similarDeals} currentStore={activeProduct.store} store={activeProduct.store} link={buyLink || activeProduct.link} />
                        <MarketInsightPanel
                            product={activeProduct}
                            insight={priceInsight}
                            alternatives={similarDeals}
                            checkedLabel={priceCheckedLabel}
                            store={activeProduct.store}
                            link={buyLink || activeProduct.link}
                            onShare={handleShareDeal}
                        />
                    </div>

                    <ProductCouponStrip store={activeProduct.store || activeProduct.storeName} apiBase={apiBase} onToast={showToast} />
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
                                    <p className="text-slate-500 text-sm leading-relaxed font-semibold">
                                        {activeProduct.description || `${activeDisplayTitle} from ${activeProduct.store || 'the source store'}. Use the verified Buy Now button to view final price, stock and delivery details on the original product page.`}
                                    </p>
                                </div>
                                <div className="flex-[2]">
                                    <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 tracking-tight">
                                        <ShieldCheck size={16} className="text-emerald-500" /> SPECIFICATIONS
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                                        {[
                                            { label: 'Store', value: activeProduct.store || 'Online Store' },
                                            { label: 'Category', value: activeProduct.category || 'Deals' },
                                            { label: 'Deal Quality', value: priceInsight.quality },
                                            { label: 'Rating', value: productRating > 0 ? `${productRating}/5` : 'Not rated yet' },
                                            { label: 'Reviews', value: reviewCount > 0 ? `${reviewCount} reviews` : 'No reviews yet' },
                                            { label: 'Status', value: availabilityLabel }
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
                                    { icon: <ShieldCheck size={16} className="text-emerald-500" />, title: 'Verified Link' },
                                    { icon: <Store size={16} className="text-blue-500" />, title: activeProduct.store || 'Source Store' },
                                    { icon: <Clock size={16} className="text-orange-500" />, title: updatedLabel }
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
                                {productRating > 0 && (
                                    <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                        <Star size={12} className="text-amber-500" fill="currentColor" />
                                        <span className="text-xs font-black text-amber-700">{productRating}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowReviewModal(true)}
                                className="text-[#4f46e5] font-black text-[11px] uppercase tracking-widest hover:underline">
                                Write Review
                            </button>
                        </div>

                        <div className="p-6">
                            {reviews.length > 0 ? (
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
                            ) : (
                                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                                    <Star size={22} className="mx-auto mb-3 text-slate-300" />
                                    <p className="text-sm font-bold text-slate-600">No customer reviews yet for this deal.</p>
                                    <p className="mt-2 text-xs font-semibold text-slate-400">If you have bought it, you can leave the first review.</p>
                                </div>
                            )}

                            {reviews.length > 0 && !allReviewsExpanded && (
                                <button
                                    onClick={() => setAllReviewsExpanded(true)}
                                    className="mt-6 w-full py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-900 transition-colors">
                                    View all {reviews.length} Reviews
                                </button>
                            )}

                            {reviews.length > 0 && allReviewsExpanded && (
                                <button
                                    onClick={() => setAllReviewsExpanded(false)}
                                    className="mt-6 w-full py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    Show Less
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isImageZoomOpen && activeImage && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xl">
                            <motion.button
                                type="button"
                                aria-label="Close image preview"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 cursor-zoom-out"
                                onClick={() => setIsImageZoomOpen(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.94 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.94 }}
                                className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col rounded-[2rem] bg-white p-4 shadow-2xl"
                            >
                                <div className="mb-3 flex items-center justify-between gap-4 px-2">
                                    <p className="truncate text-xs font-black uppercase tracking-widest text-slate-500">
                                        {activeDisplayTitle}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsImageZoomOpen(false)}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-900 hover:text-white"
                                        aria-label="Close image preview"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="min-h-0 flex-1 rounded-[1.5rem] bg-slate-50 p-4">
                                    <img
                                        src={optimizeImageUrl(activeImage) || NO_PRODUCT_IMAGE}
                                        alt={activeDisplayTitle}
                                        className="h-full max-h-[74vh] w-full object-contain"
                                    />
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

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

                <div className="mt-16">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 mb-2">Keep Comparing</p>
                            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950">Similar Deals & Best Alternatives</h3>
                        </div>
                        <Link to="/deals" className="text-[#4f46e5] font-bold hover:underline flex items-center gap-1 text-sm bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                            View all deals <ArrowRight size={16} />
                        </Link>
                    </div>
                    {
                        similarDeals.length > 0 ? (
                            <>
                                <div className="flex gap-4 overflow-x-auto pb-4 md:hidden snap-x no-scrollbar">
                                    {similarDeals.map((deal) => (
                                        <Link
                                            key={deal.id || deal._id || deal.productUrl}
                                            to={`/product/${deal.id || deal._id}`}
                                            className="w-64 shrink-0 snap-start rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm no-underline"
                                        >
                                            <div className="mb-4 flex h-44 items-center justify-center rounded-[1.5rem] bg-slate-50 p-4">
                                                <img
                                                    src={getMainProductImage(deal)}
                                                    alt={deal.cardTitle || deal.title}
                                                    className="h-full w-full object-contain"
                                                    loading="lazy"
                                                />
                                            </div>
                                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-600">{deal.store || deal.storeName}</p>
                                            <h4 className="line-clamp-2 text-sm font-black leading-tight text-slate-950">{deal.cardTitle || getDisplayTitle(deal.title)}</h4>
                                            <p className="mt-3 text-xl font-black text-slate-950">{formatProductPrice(deal.price || deal.dealPrice, deal.store, deal.link)}</p>
                                        </Link>
                                    ))}
                                </div>
                                <div className="hidden md:block">
                                    <DealsGrid deals={similarDeals} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-500">More deals coming soon!</p>
                            </div>
                        )
                    }
                </div>
            </main >

            <MobileFloatingBar product={activeProduct} brand={brand} buyLink={buyLink} />
            <Footer showToast={showToast} />
        </div>
    );
};

export default ProductDetails;
