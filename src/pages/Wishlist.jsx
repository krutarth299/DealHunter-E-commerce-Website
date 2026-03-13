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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <SEO title="My Wishlist" description="View and manage your saved deals and discounts." />
            <Navbar
                user={user}
                onSearch={onSearch}
                onAddDealClick={() => setIsAddDealOpen(true)}
                wishlistCount={wishlistCount}
                wishlist={wishlist}
            />

            <main className="flex-grow container mx-auto px-4 md:px-8 pt-32 md:pt-40 pb-16">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-pink-500/30 transform rotate-3">
                            <Heart size={32} fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Wishlist</h1>
                            <p className="text-slate-500 font-medium">
                                {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} saved for later
                            </p>
                        </div>
                    </div>

                    {wishlistCount > 0 && (
                        <div className="bg-white px-6 py-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Value</p>
                                <p className="text-xl font-black text-slate-900">{formattedTotal}</p>
                            </div>
                            <div className="h-8 w-[1px] bg-slate-100"></div>
                            <button onClick={clearWishlist} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Clear Wishlist">
                                <Trash2 size={20} />
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
                    >
                        <div className="bg-white/50 backdrop-blur-sm p-1 rounded-[2rem] border border-slate-200/60">
                            {/* We Pass toggleWishlist to DealsGrid so hearts work as toggle buttons */}
                            <DealsGrid deals={wishlist} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-24 px-4 text-center"
                    >
                        <div className="relative mb-8 group cursor-pointer">
                            <div className="absolute inset-0 bg-pink-200 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-pink-100 relative z-10 custom-animate-float border border-slate-50">
                                <Heart size={48} className="text-pink-300 fill-pink-50" />
                                <div className="absolute top-0 right-0 bg-pink-500 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                                    <span className="text-xl font-bold">0</span>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Your wishlist is empty</h2>
                        <p className="text-slate-500 max-w-md mb-8 text-lg leading-relaxed">
                            Looks like you haven't found anything yet.
                            Browse our categories and find your next favorite thing!
                        </p>

                        <div className="flex gap-4">
                            <Link to="/deals" className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-slate-900/20 hover:translate-y-[-2px] transition-all">
                                <ShoppingBag size={20} /> Browse Deals
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
