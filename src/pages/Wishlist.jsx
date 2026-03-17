import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DealsGrid from '../components/DealsGrid';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

const Wishlist = ({ user, wishlist, wishlistCount, toggleWishlist, clearWishlist, onSearch, setIsAddDealOpen, showToast }) => {

    // Calculate total value of wishlist
    const totalValue = wishlist?.reduce((acc, item) => {
        // Extract number from price string (e.g. "₹1,19,900" -> 119900)
        const priceString = item.price?.toString().replace(/[^0-9.]/g, '') || '0';
        return acc + parseFloat(priceString);
    }, 0) || 0;

    const formattedTotal = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(totalValue);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden no-scrollbar">
            <SEO title="My Wishlist" description="View and manage your saved deals and discounts." />
            <Navbar
                user={user}
                onSearch={onSearch}
                onAddDealClick={() => setIsAddDealOpen(true)}
                wishlistCount={wishlistCount}
                wishlist={wishlist}
            />

            <main className="flex-grow container mx-auto px-4 md:px-8 pt-32 md:pt-44 pb-24 relative overflow-x-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-50/50 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/50 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 relative z-10"
                >
                    <div className="flex items-center gap-6">
                        <motion.div 
                            whileHover={{ rotate: 15, scale: 1.1 }}
                            className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-pink-500/30 transform -rotate-3 border-4 border-white/50 backdrop-blur-sm"
                        >
                            <Heart size={40} fill="currentColor" />
                        </motion.div>
                        <div>
                            <h1 className="text-5xl md:text-6xl font-[1000] text-slate-900 tracking-tight leading-none mb-2">My Wishlist</h1>
                            <div className="flex items-center gap-3">
                                <span className="bg-pink-100 text-pink-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-pink-200">
                                    {wishlistCount} {wishlistCount === 1 ? 'Treasure' : 'Treasures'}
                                </span>
                                <span className="text-slate-400 text-sm font-medium">Saved for your next move</span>
                            </div>
                        </div>
                    </div>

                    {wishlistCount > 0 && (
                        <div className="bg-white/70 backdrop-blur-xl px-5 py-4 md:px-8 md:py-5 rounded-[2rem] border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex items-center gap-4 md:gap-8 group self-start md:self-auto">
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Portfolio Value</p>
                                <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">{formattedTotal}</p>
                            </div>
                            <div className="h-10 w-[1px] bg-slate-100"></div>
                            <button 
                                onClick={clearWishlist} 
                                className="group/btn w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300" 
                                title="Clear Wishlist"
                            >
                                <Trash2 size={20} className="md:size-6 group-hover/btn:rotate-12 transition-transform" />
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Content Section */}
                {wishlist && wishlist.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative z-10"
                    >
                        <div className="bg-white/40 backdrop-blur-md p-2 rounded-[3.5rem] border border-white/60 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
                            <DealsGrid deals={wishlist} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                        </div>
                        
                        <div className="mt-12 text-center h-20 flex items-center justify-center">
                            <Link to="/deals" className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:text-orange-500 transition-colors flex items-center gap-2">
                                <ShoppingBag size={14} /> Continue Hunting for More Deals
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-32 px-4 text-center relative z-10"
                    >
                        <div className="relative mb-12 group">
                            <div className="absolute inset-0 bg-pink-400/20 rounded-full blur-[80px] group-hover:bg-pink-400/30 transition-all duration-1000 scale-150" />
                            <motion.div 
                                animate={{ y: [0, -20, 0], rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                                className="w-48 h-48 bg-white rounded-[3rem] flex items-center justify-center shadow-[0_50px_100px_-20px_rgba(244,114,182,0.2)] relative z-10 border border-slate-50"
                            >
                                <Heart size={80} className="text-pink-100 fill-pink-50" strokeWidth={1} />
                                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-pink-500 to-rose-600 w-14 h-14 rounded-3xl flex items-center justify-center text-white shadow-2xl border-4 border-white">
                                    <span className="text-2xl font-black">0</span>
                                </div>
                            </motion.div>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-[1000] text-slate-900 mb-4 tracking-tight leading-none">Your Sanctuary is Empty</h2>
                        <p className="text-slate-500 max-w-lg mb-12 text-lg md:text-xl font-medium leading-relaxed opacity-80">
                            The wishlist is where great deals wait for the perfect moment. 
                            Start hunting and fill this space with your future treasures.
                        </p>

                        <div className="flex gap-6">
                            <Link to="/deals" className="bg-slate-900 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] hover:shadow-orange-500/30 hover:translate-y-[-4px] transition-all active:scale-95 group">
                                <ShoppingBag size={20} className="group-hover:rotate-12 transition-transform" /> Explore Live Deals
                            </Link>
                        </div>
                    </motion.div>
                )}
            </main>

            <Footer showToast={showToast} />
        </div>
    );
};

export default Wishlist;
