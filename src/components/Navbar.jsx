import React, { useState, useEffect, useContext } from 'react';
import { Search, Menu, X, Heart, Flame, Bell, Zap, Tag, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWishlistAnimation } from '../context/wishlistAnimationContextDefinition';
import { AuthContext } from '../context/authContextDefinition';
import { motion, AnimatePresence } from 'framer-motion';
import { getMainProductImage } from '../utils/imageOptimizer';
import { getCardTitle } from '../utils/productTitles';
import { formatPriceDisplay, parsePriceNumber, parseDealPrice } from '../utils/dealUi';
import { getProductPath } from '../utils/productUrls';
import logo from '../assets/logo.png';


const Navbar = ({ onSearch, wishlistCount = 0 }) => {
    const { wishlistRef, arrivalEffect } = useWishlistAnimation();
    const { apiBase, user, logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchVal, setSearchVal] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const [latestDeals, setLatestDeals] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [hasFreebies, setHasFreebies] = useState(
        typeof window !== 'undefined' ? !!window.__HAS_ACTIVE_FREEBIES__ : false
    );
    const routeLocation = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => routeLocation.pathname === path;

    const fetchNotifications = React.useCallback(() => {
        if (!apiBase) return;
        fetch(`${apiBase.replace('/user', '')}/deals/latest?limit=5`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setLatestDeals(data.slice(0, 5));
                    
                    // Check if the newest deal is unread
                    if (data.length > 0) {
                        const lastSeenId = sessionStorage.getItem('lastSeenDealId');
                        const currentNewestId = String(data[0]._id || data[0].id);
                        if (lastSeenId !== currentNewestId) {
                            setHasUnread(true);
                        }
                    }
                }
            })
            .catch(err => console.error("Failed to fetch notifications:", err));
    }, [apiBase]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Fetch freebies status
    useEffect(() => {
        if (apiBase) {
            fetch(`${apiBase.replace('/user', '')}/freebies`)
                .then(res => res.json())
                .then(data => {
                    if (data && Array.isArray(data.items)) {
                        setHasFreebies(data.items.length > 0);
                    }
                })
                .catch(() => {});
        }
    }, [apiBase]);

    // Listen for new deals added in current session
    useEffect(() => {
        const handleNewDeal = (event) => {
            if (event?.type === 'dealsphere:data-changed' && event?.detail?.entity && event.detail.entity !== 'deal') {
                return;
            }
            setHasUnread(true);
            fetchNotifications();
        };
        window.addEventListener('newDealAdded', handleNewDeal);
        window.addEventListener('dealsphere:data-changed', handleNewDeal);
        return () => {
            window.removeEventListener('newDealAdded', handleNewDeal);
            window.removeEventListener('dealsphere:data-changed', handleNewDeal);
        };
    }, [fetchNotifications]);

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setScrolled(window.scrollY > 10);
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                setIsNotificationsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (onSearch) onSearch(searchVal);
        navigate(`/deals?search=${encodeURIComponent(searchVal)}`);
    };

    const searchSuggestions = React.useMemo(() => {
        const query = searchVal.trim().toLowerCase();
        if (query.length < 2) return [];
        
        const queryWords = query.split(/\s+/).filter(Boolean);

        return latestDeals
            .filter((deal) => {
                const haystack = `${deal.title || ''} ${deal.store || deal.storeName || ''} ${deal.category || ''}`.toLowerCase();
                return queryWords.every(word => haystack.includes(word));
            })
            .slice(0, 4);
    }, [latestDeals, searchVal]);

    const closeSearch = () => {
        setIsOpen(false);
        setSearchVal('');
    };

    const getDealPriceLabel = (deal) => {
        const value = parseDealPrice(deal);
        return value > 0 ? formatPriceDisplay(value) : '';
    };

    return (
        <>
            {/* Announcement Bar */}
            <div className="hidden sm:flex bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2.5 items-center justify-center gap-4 border-b border-white/5 relative z-[60]">
                <span className="flex items-center gap-1.5 opacity-60">
                    <Zap size={10} className="text-[#FF6A00] fill-[#FF6A00]" /> 
                    Limited Time Offer
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="flex items-center gap-2 text-[#FF6A00] group transition-all">
                    Handpicked Premium Deals for You
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="opacity-60 flex items-center gap-1.5">
                    <ShieldCheck size={10} className="text-emerald-500" />
                    100% Verified Deals
                </span>
            </div>

            {/* Sticky Header Container */}
            <div className="sticky top-0 z-40 w-full optimize-gpu">
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl border-b border-slate-100 shadow-premium-sm" />
                
                <nav className="relative py-3">
                    <div className="w-full mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
                        <div className="flex items-center justify-between relative py-2 sm:py-3">

                            {/* Logo */}
                            <Link to="/" className="flex items-center gap-2 shrink-0 group">
                                <div className="flex items-center h-10 sm:h-12">
                                    <img 
                                        src={logo} 
                                        alt="DealSphere" 
                                        className={`h-full w-auto object-contain filter drop-shadow-sm group-hover:drop-shadow-md transition-transform duration-300 ${scrolled ? 'scale-90' : 'scale-100 sm:scale-105'}`} 
                                    />
                                </div>
                                <div className="flex flex-col leading-none">
                                    <span className="font-[1000] tracking-tighter flex items-baseline transition-all duration-300 text-xl sm:text-2xl">
                                        <span className="text-[#0F172A]">Deal</span>
                                        <span className="text-[#FF6A00]">Sphere</span>
                                    </span>
                                </div>
                            </Link>

                            {/* Center Section: Search + Links */}
                            <div className="flex-1 hidden lg:flex items-center justify-center gap-4 xl:gap-8 px-4 max-w-[1000px] mx-auto">
                                {/* Search Bar */}
                                <form onSubmit={handleSearch} className="flex-1 w-full max-w-[600px] flex items-center relative group/search">
                                    <div className="absolute left-5 text-slate-400 group-focus-within/search:text-[#FF6A00] transition-colors">
                                        <Search size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchVal}
                                        onChange={e => { setSearchVal(e.target.value); if (onSearch) onSearch(e.target.value); }}
                                        placeholder="Search 10,000+ verified deals..."
                                        className="w-full bg-slate-100/30 border border-slate-200/60 rounded-2xl py-2.5 pl-12 pr-6 text-sm font-semibold focus:outline-none focus:bg-white focus:border-[#FF6A00]/50 focus:ring-[6px] focus:ring-[#FF6A00]/5 transition-all"
                                    />
                                    <AnimatePresence>
                                        {searchVal.trim().length >= 2 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                                className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white/98 shadow-2xl shadow-slate-900/12 backdrop-blur-xl"
                                            >
                                                {searchSuggestions.length > 0 ? searchSuggestions.map((deal) => {
                                                    const productPath = getProductPath(deal);
                                                    return (
                                                        <Link
                                                            key={deal._id || deal.id || deal.title}
                                                            to={productPath}
                                                            onClick={() => {
                                                                closeSearch();
                                                            }}
                                                            className="flex items-center gap-4 border-b border-slate-50 p-3 transition-colors hover:bg-orange-50/60"
                                                        >
                                                            <div className="h-14 w-14 shrink-0 rounded-2xl bg-slate-50 p-2">
                                                                <img src={getMainProductImage(deal)} alt="" className="h-full w-full object-contain" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="line-clamp-1 text-xs font-black text-slate-900">{getCardTitle(deal.displayTitle || deal.title)}</p>
                                                                <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                    <span>{deal.store || deal.storeName || 'Store'}</span>
                                                                    {getDealPriceLabel(deal) && <span className="text-orange-600">{getDealPriceLabel(deal)}</span>}
                                                                </div>
                                                            </div>
                                                            <ArrowRight size={16} className="text-slate-300" />
                                                        </Link>
                                                    );
                                                }) : (
                                                    <div className="px-5 py-4 text-xs font-bold text-slate-500">Press Enter to search all live deals for “{searchVal.trim()}”.</div>
                                                )}
                                                <Link
                                                    to={`/deals?search=${encodeURIComponent(searchVal)}`}
                                                    onClick={closeSearch}
                                                    className="flex items-center justify-between bg-[#0F172A] px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#FF6A00]"
                                                >
                                                    Search all deals
                                                    <ArrowRight size={15} />
                                                </Link>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </form>

                                {/* Desktop Links */}
                                <div className="flex items-center gap-2 xl:gap-4 shrink-0">
                                    {[
                                        { to: '/', label: '🔥 Hot Deals' },
                                        { to: '/deals', label: 'All Deals' },
                                        { to: '/stores', label: 'Stores' },
                                        { to: '/blog', label: 'Blog' },
                                        ...(hasFreebies ? [{ to: '/freebies', label: '🎁 Freebies' }] : [])
                                    ].map(link => (
                                        <Link key={link.to} to={link.to} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${isActive(link.to) ? 'bg-[#FF6A00] text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-[#FF6A00] hover:bg-orange-50/50'}`}>
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Mobile/Tablet Search (shows when Center Section is hidden) */}
                            <form onSubmit={handleSearch} className="flex-1 mx-4 lg:hidden hidden md:flex items-center relative group/search">
                                <div className="absolute left-5 text-slate-400 group-focus-within/search:text-[#FF6A00] transition-colors">
                                    <Search size={18} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="text"
                                    value={searchVal}
                                    onChange={e => { setSearchVal(e.target.value); if (onSearch) onSearch(e.target.value); }}
                                    placeholder="Search deals..."
                                    className="w-full bg-slate-100/30 border border-slate-200/60 rounded-2xl py-2.5 pl-12 pr-6 text-sm font-semibold focus:outline-none focus:bg-white focus:border-[#FF6A00]/50 focus:ring-[6px] focus:ring-[#FF6A00]/5 transition-all"
                                />
                            </form>

                            {/* Right Actions */}
                            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                                {/* Wishlist */}
                                <Link to="/wishlist" ref={wishlistRef} className="relative flex items-center justify-center w-10 h-10 rounded-2xl hover:bg-orange-50 transition-all group">
                                    <Heart size={20} className={`${wishlistCount > 0 ? 'text-[#FF6A00] fill-[#FF6A00]' : 'text-slate-500'} group-hover:text-[#FF6A00] transition-colors`} />
                                    {wishlistCount > 0 && (
                                        <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF6A00] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                            {wishlistCount}
                                        </span>
                                    )}
                                </Link>

                                {/* Notifications */}
                                <div className="relative">
                                    <button 
                                        onClick={() => { 
                                            const nextState = !isNotificationsOpen;
                                            setIsNotificationsOpen(nextState); 
                                            setIsOpen(false); 
                                            
                                            // Clear notification dot when opening
                                            if (nextState && latestDeals.length > 0) {
                                                setHasUnread(false);
                                                sessionStorage.setItem('lastSeenDealId', String(latestDeals[0]._id || latestDeals[0].id));
                                            }
                                        }} 
                                        className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${isNotificationsOpen ? 'bg-orange-50 text-[#FF6A00]' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        <Bell size={20} />
                                        {hasUnread && <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6A00] rounded-full border-2 border-white animate-pulse" />}
                                    </button>
                                    <AnimatePresence>
                                        {isNotificationsOpen && (
                                            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-12 right-0 w-80 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-100 z-50 overflow-hidden transform origin-top-right">
                                                <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">New Deals</h4>
                                                    <span className="text-[10px] font-black bg-[#FF6A00] text-white px-2 py-0.5 rounded-lg">{latestDeals.length}</span>
                                                </div>
                                                <div className="max-h-[350px] overflow-y-auto no-scrollbar py-2">
                                                    {latestDeals.length > 0 ? latestDeals.map((deal, idx) => (
                                                        <Link
                                                            key={idx}
                                                            to={getProductPath(deal)}
                                                            onClick={() => {
                                                                setIsNotificationsOpen(false);
                                                            }}
                                                            className="flex gap-4 p-4 hover:bg-slate-50 transition-colors group/notif"
                                                        >
                                                            <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 p-1 flex-shrink-0">
                                                                <img src={getMainProductImage(deal)} alt="" className="w-full h-full object-contain" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-black text-emerald-600 mb-0.5 flex items-center gap-1"><Zap size={10} fill="currentColor" /> FRESH PRICE DROP</p>
                                                                <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight group-hover/notif:text-[#FF6A00] transition-colors">{deal.title}</p>
                                                                <p className="text-[10px] text-slate-400 mt-1 font-bold">{deal.store} • {deal.price}</p>
                                                            </div>
                                                        </Link>
                                                    )) : (
                                                        <div className="py-10 text-center">
                                                            <Bell size={32} className="text-slate-200 mx-auto mb-3" />
                                                            <p className="text-xs text-slate-400 font-bold">Nothing new here</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <Link to="/deals" onClick={() => setIsNotificationsOpen(false)} className="block p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] font-black text-slate-500 hover:text-[#FF6A00] transition-colors uppercase tracking-[0.2em]">View All Live Deals</Link>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* User Profile */}
                                {user && (
                                    <div className="hidden md:flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 hover:bg-white hover:border-orange-200 transition-all cursor-pointer group ml-1">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF6A00] font-black text-xs border border-white shadow-sm overflow-hidden">
                                            {user.name && user.name.charAt(0)}
                                        </div>
                                        <button onClick={logout} className="p-1 text-slate-300 hover:text-[#FF6A00] transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Mobile menu toggle */}
                                <button onClick={() => setIsOpen(!isOpen)} className="xl:hidden flex items-center justify-center w-10 h-10 rounded-2xl hover:bg-slate-100 transition-colors">
                                    {isOpen ? <X size={20} className="text-slate-900" /> : <Menu size={20} className="text-slate-900" />}
                                </button>
                            </div>
                        </div>

                        {/* Mobile Menu Open State */}
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden border-t border-slate-100 bg-white overflow-hidden">
                                    <div className="px-4 py-6 space-y-2">
                                        <form onSubmit={handleSearch} className="relative mb-6">
                                            <input type="text" value={searchVal} onChange={e => { setSearchVal(e.target.value); if (onSearch) onSearch(e.target.value); }} placeholder="Search for deals..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-5 pr-12 text-sm font-bold focus:outline-none" />
                                            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><Search size={20} /></button>
                                        </form>
                                        {searchVal.trim().length >= 2 && searchSuggestions.length > 0 && (
                                            <div className="-mt-4 mb-4 space-y-2 rounded-[1.5rem] bg-slate-50 p-3">
                                                {searchSuggestions.slice(0, 3).map((deal) => (
                                                    <Link
                                                        key={deal._id || deal.id || deal.title}
                                                        to={getProductPath(deal)}
                                                        onClick={() => {
                                                            closeSearch();
                                                        }}
                                                        className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm"
                                                    >
                                                        <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-50 p-1.5">
                                                            <img src={getMainProductImage(deal)} alt="" className="h-full w-full object-contain" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="line-clamp-1 text-[11px] font-black text-slate-900">{getCardTitle(deal.displayTitle || deal.title)}</p>
                                                            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-orange-600">{getDealPriceLabel(deal) || deal.store || 'Live deal'}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                        {[
                                            { to: '/', label: '🔥 Hot Deals' },
                                            { to: '/deals', label: 'All Deals' },
                                            { to: '/stores', label: 'Stores' },
                                            { to: '/blog', label: '✍️ Shopping Blog' },
                                            ...(hasFreebies ? [{ to: '/freebies', label: '🎁 Freebies' }] : [])
                                        ].map(link => (
                                            <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)} className={`block px-5 py-4 rounded-2xl font-black text-sm transition-all ${isActive(link.to) ? 'bg-orange-50 text-[#FF6A00]' : 'text-slate-700 hover:bg-slate-50'}`}>
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </nav>
            </div>

            {/* Mobile Bottom Float Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-6 pointer-events-none">
                <div className="w-full max-w-md h-16 bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between px-2 pointer-events-auto">
                    <Link to="/" className={`flex flex-col items-center justify-center flex-1 h-[3.25rem] rounded-2xl gap-1 transition-all ${isActive('/') ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 active:bg-white/5'}`}>
                        <Flame size={20} className={isActive('/') ? 'fill-[#FF6A00] text-[#FF6A00]' : ''} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
                    </Link>
                    <Link to="/deals" className={`flex flex-col items-center justify-center flex-1 h-[3.25rem] rounded-2xl gap-1 transition-all ${isActive('/deals') ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 active:bg-white/5'}`}>
                        <Tag size={20} className={isActive('/deals') ? 'fill-[#FF6A00] text-[#FF6A00]' : ''} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Deals</span>
                    </Link>
                    <Link to="/wishlist" className={`relative flex flex-col items-center justify-center flex-1 h-[3.25rem] rounded-2xl gap-1 transition-all ${isActive('/wishlist') ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 active:bg-white/5'}`}>
                        <Heart size={20} className={isActive('/wishlist') ? 'fill-[#FF6A00] text-[#FF6A00]' : ''} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Saved</span>
                        {wishlistCount > 0 && <span className="absolute top-2 right-4 w-4 h-4 bg-[#FF6A00] text-white text-[8px] font-black rounded-full flex items-center justify-center border border-slate-900">{wishlistCount}</span>}
                    </Link>
                </div>
            </div>
        </>
    );
};

export default Navbar;
