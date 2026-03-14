import React, { useState, useEffect, useContext } from 'react';
import { Search, Menu, X, Heart, Flame, Bell, Zap, Tag, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWishlistAnimation } from '../context/wishlistAnimationContextDefinition';
import { AuthContext } from '../context/authContextDefinition';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ onSearch, wishlistCount = 0 }) => {
    const { wishlistRef, arrivalEffect } = useWishlistAnimation();
    const { apiBase, user, logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchVal, setSearchVal] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const [latestDeals, setLatestDeals] = useState([]);
    const routeLocation = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => routeLocation.pathname === path;

    useEffect(() => {
        if (!apiBase) return;
        fetch(apiBase.replace('/user', '') + '/deals')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const sorted = [...data].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                    setLatestDeals(sorted.slice(0, 5));
                }
            })
            .catch(err => console.error("Failed to fetch notifications:", err));
    }, [apiBase]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
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

    return (
        <>
            {/* Announcement Bar */}
            <div className="hidden sm:flex bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2.5 items-center justify-center gap-4 border-b border-white/5 relative z-[60]">
                <span className="flex items-center gap-1.5 opacity-60">
                    <Zap size={10} className="text-orange-500 fill-orange-500" /> 
                    Limited Time Offer
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <a href="https://t.me/yourtelegram" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-orange-400 transition-colors group">
                    <span className="bg-orange-600 text-[8px] px-1.5 py-0.5 rounded leading-none mr-1">NEW</span>
                    Join our Telegram for Instant Deal Alerts
                    <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="opacity-60 flex items-center gap-1.5">
                    <ShieldCheck size={10} className="text-emerald-500" />
                    100% Verified Deals
                </span>
            </div>

            {/* Sticky Header Container */}
            <div className={`sticky top-0 z-40 w-full transition-all duration-500`}>
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl border-b border-slate-100 shadow-premium-sm" />
                
                <nav className={`relative transition-all duration-500 ${scrolled ? 'py-1' : 'py-4'}`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className={`flex items-center justify-between gap-4 relative transition-all duration-500 ${scrolled ? 'h-14' : 'h-16'}`}>

                            {/* Logo */}
                            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-orange-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                                    <div className="relative w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                        <Flame size={20} className="text-white" fill="currentColor" />
                                    </div>
                                </div>
                                <span className="font-black text-2xl tracking-tighter text-slate-900 hidden lg:block">
                                    DEAL<span className="text-orange-500">HUNTER</span>
                                </span>
                            </Link>

                            {/* Search Bar */}
                            <form onSubmit={handleSearch} className={`flex-1 max-w-2xl mx-4 lg:mx-8 hidden md:flex items-center relative group/search transition-all duration-500 ${scrolled ? 'scale-95' : ''}`}>
                                <div className="absolute left-5 text-slate-400 group-focus-within/search:text-orange-500 transition-colors">
                                    <Search size={18} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="text"
                                    value={searchVal}
                                    onChange={e => { setSearchVal(e.target.value); if (onSearch) onSearch(e.target.value); }}
                                    placeholder="Search 10,000+ verified deals..."
                                    className="w-full bg-slate-100/30 border border-slate-200/60 rounded-2xl py-3.5 pl-12 pr-6 text-sm font-semibold focus:outline-none focus:bg-white focus:border-orange-500/50 focus:ring-[6px] focus:ring-orange-500/5 transition-all"
                                />
                            </form>

                            {/* Right Actions */}
                            <div className="flex items-center gap-1 sm:gap-3">
                                {/* Wishlist */}
                                <Link to="/wishlist" ref={wishlistRef} className="relative flex items-center justify-center w-11 h-11 rounded-2xl hover:bg-red-50 transition-all group">
                                    <Heart size={22} className={`${wishlistCount > 0 ? 'text-red-500 fill-red-500' : 'text-slate-500'} group-hover:text-red-500 transition-colors`} />
                                    {wishlistCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                            {wishlistCount}
                                        </span>
                                    )}
                                </Link>

                                {/* Notifications */}
                                <div className="relative">
                                    <button onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsOpen(false); }} className={`relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all ${isNotificationsOpen ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                                        <Bell size={22} />
                                        {latestDeals.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white animate-pulse" />}
                                    </button>
                                    <AnimatePresence>
                                        {isNotificationsOpen && (
                                            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-14 right-0 w-80 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-100 z-50 overflow-hidden transform origin-top-right">
                                                <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">New Deals</h4>
                                                    <span className="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-lg">{latestDeals.length}</span>
                                                </div>
                                                <div className="max-h-[350px] overflow-y-auto no-scrollbar py-2">
                                                    {latestDeals.length > 0 ? latestDeals.map((deal, idx) => (
                                                        <Link key={idx} to={`/product/${deal._id || deal.id}`} onClick={() => setIsNotificationsOpen(false)} className="flex gap-4 p-4 hover:bg-slate-50 transition-colors group/notif">
                                                            <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 p-1 flex-shrink-0">
                                                                <img src={deal.image || (deal.images && deal.images[0])} alt="" className="w-full h-full object-contain" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-black text-emerald-600 mb-0.5 flex items-center gap-1"><Zap size={10} fill="currentColor" /> FRESH PRICE DROP</p>
                                                                <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight group-hover/notif:text-orange-500 transition-colors">{deal.title}</p>
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
                                                <Link to="/deals" onClick={() => setIsNotificationsOpen(false)} className="block p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] font-black text-slate-500 hover:text-orange-500 transition-colors uppercase tracking-[0.2em]">View All Live Deals</Link>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* User Profile */}
                                {user && (
                                    <div className="hidden md:flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-100 hover:bg-white hover:border-orange-200 transition-all cursor-pointer group">
                                        <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-black text-sm border border-white shadow-sm overflow-hidden">
                                            {user.name && user.name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col pr-3">
                                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Account</span>
                                            <span className="text-xs font-black text-slate-900 leading-none">{user.name.split(' ')[0]}</span>
                                        </div>
                                        <button onClick={logout} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Mobile menu toggle */}
                                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden flex items-center justify-center w-11 h-11 rounded-2xl hover:bg-slate-100 transition-colors">
                                    {isOpen ? <X size={22} className="text-slate-900" /> : <Menu size={22} className="text-slate-900" />}
                                </button>
                            </div>
                        </div>

                        {/* Secondary Desktop Navigation Row */}
                        <AnimatePresence>
                            {!scrolled && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="hidden md:block overflow-hidden">
                                    <div className="max-w-7xl mx-auto border-t border-slate-100/50 py-2 mt-4 flex items-center gap-1">
                                        {[
                                            { to: '/', label: '🔥 Hot Deals' },
                                            { to: '/deals', label: 'All Deals' },
                                            { to: '/stores', label: 'Stores' },
                                            { to: '/blog', label: 'Blog' },
                                        ].map(link => (
                                            <Link key={link.to} to={link.to} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${isActive(link.to) ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-orange-500 hover:bg-orange-50/50'}`}>
                                                {link.label}
                                            </Link>
                                        ))}
                                        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Updates</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Mobile Menu Open State */}
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden border-t border-slate-100 bg-white overflow-hidden">
                                    <div className="px-4 py-6 space-y-2">
                                        <form onSubmit={handleSearch} className="relative mb-6">
                                            <input type="text" value={searchVal} onChange={e => { setSearchVal(e.target.value); if (onSearch) onSearch(e.target.value); }} placeholder="Search for deals..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-5 pr-12 text-sm font-bold focus:outline-none" />
                                            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><Search size={20} /></button>
                                        </form>
                                        {[
                                            { to: '/', label: '🔥 Hot Deals' },
                                            { to: '/deals', label: 'All Deals' },
                                            { to: '/stores', label: 'Stores' },
                                            { to: '/blog', label: '✍️ Shopping Blog' },
                                        ].map(link => (
                                            <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)} className={`block px-5 py-4 rounded-2xl font-black text-sm transition-all ${isActive(link.to) ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'}`}>
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
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
                <div className="max-w-md mx-auto h-16 bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between px-2">
                    <Link to="/" className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive('/') ? 'text-white scale-110' : 'text-slate-500'}`}>
                        <Flame size={20} className={isActive('/') ? 'fill-orange-500 text-orange-500' : ''} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
                    </Link>
                    <Link to="/deals" className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive('/deals') ? 'text-white scale-110' : 'text-slate-500'}`}>
                        <Tag size={20} className={isActive('/deals') ? 'fill-blue-500 text-blue-500' : ''} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Deals</span>
                    </Link>
                    <Link to="/wishlist" className={`relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive('/wishlist') ? 'text-white scale-110' : 'text-slate-500'}`}>
                        <Heart size={20} className={isActive('/wishlist') ? 'fill-red-500 text-red-500' : ''} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Saved</span>
                        {wishlistCount > 0 && <span className="absolute top-2 right-4 w-4 h-4 bg-orange-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-slate-900">{wishlistCount}</span>}
                    </Link>
                </div>
            </div>
        </>
    );
};

export default Navbar;
