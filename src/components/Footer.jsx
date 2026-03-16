import React, { useState } from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, ArrowRight, Heart, ShoppingCart, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = ({ showToast }) => {
    const [email, setEmail] = useState('');

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (!email) return;
        if (showToast) showToast('Thanks for subscribing to Deal Alerts!', 'success');
        setEmail('');
    };

    const handleComingSoon = (e) => {
        e.preventDefault();
        if (showToast) showToast('This feature is coming soon!', 'info');
    };

    return (
        <footer className="bg-slate-900 pt-16 pb-8 text-slate-400 text-sm border-t border-slate-800 relative overflow-hidden">
            {/* Orange top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-400" />

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

                {/* Brand */}
                <div className="space-y-5">
                    <Link to="/" className="flex items-center gap-3">
                        <img src="/logo.png" alt="DealOrbit" className="h-12 w-auto object-contain bg-white rounded-xl p-1.5 shadow-md" />
                        <span className="text-3xl font-black text-white tracking-tighter">Deal<span className="text-[#F97316]">Orbit</span></span>
                    </Link>
                    <p className="text-slate-400 leading-relaxed text-sm max-w-xs">
                        India's #1 affiliate deals platform. Discover the best offers, coupons, and cashback across 100+ top stores.
                    </p>
                    {/* Newsletter */}
                    <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">Get Deal Alerts</p>
                        <form onSubmit={handleSubscribe} className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-1 focus-within:border-orange-500/50 transition-all">
                            <Mail size={16} className="text-slate-500 ml-2" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your email address"
                                className="bg-transparent border-none text-white text-sm flex-1 px-3 py-2 focus:outline-none placeholder:text-slate-600"
                                required
                            />
                            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-colors">
                                <ArrowRight size={14} />
                            </button>
                        </form>
                        <p className="text-[10px] text-slate-600 mt-1.5">Join 50,000+ smart orbiters. Unsubscribe anytime.</p>
                    </div>
                </div>

                {/* Quick Links */}
                <div>
                    <h3 className="text-white font-bold mb-5 text-xs uppercase tracking-widest flex items-center gap-2">
                        <span className="w-6 h-0.5 bg-orange-500 rounded-full" /> Explore
                    </h3>
                    <ul className="space-y-3">
                        {[
                            { label: '🔥 Hot Deals', path: '/' },
                            { label: '🏪 All Stores', path: '/stores' },
                            { label: '✍️ Blog', path: '/blog' },
                            { label: '❤️ Wishlist', path: '/wishlist' },
                        ].map(({ label, path }) => (
                            <li key={label}>
                                <Link to={path} className="text-slate-400 hover:text-orange-400 transition-colors text-sm font-medium flex items-center gap-2 group">
                                    <span className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-orange-500 transition-colors" />
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Categories */}
                <div>
                    <h3 className="text-white font-bold mb-5 text-xs uppercase tracking-widest flex items-center gap-2">
                        <span className="w-6 h-0.5 bg-orange-500 rounded-full" /> Top Categories
                    </h3>
                    <ul className="space-y-3">
                        {[
                            { name: 'Electronics', label: '📱 Electronics' },
                            { name: 'Fashion', label: '👗 Fashion' },
                            { name: 'Gaming', label: '🎮 Gaming' },
                            { name: 'Groceries', label: '🛒 Grocery' },
                            { name: 'Travel', label: '✈️ Travel' },
                            { name: 'Home & Kitchen', label: '🏠 Home & Living' }
                        ].map(item => (
                            <li key={item.name}>
                                <Link to={`/deals?category=${encodeURIComponent(item.name)}`} className="text-slate-400 hover:text-orange-400 transition-colors text-sm font-medium flex items-center gap-2 group">
                                    <span className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-orange-500 transition-colors" />
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact + Social */}
                <div>
                    <h3 className="text-white font-bold mb-5 text-xs uppercase tracking-widest flex items-center gap-2">
                        <span className="w-6 h-0.5 bg-orange-500 rounded-full" /> Contact
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <MapPin size={16} className="text-orange-500 mt-0.5 shrink-0" />
                            <span className="text-sm leading-relaxed">Embassy Tech Village,<br />Bengaluru, India - 560103</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Mail size={16} className="text-orange-500 shrink-0" />
                            <a href="mailto:support@dealorbit.com" className="hover:text-orange-400 transition-colors text-sm">support@dealorbit.com</a>
                        </li>
                    </ul>

                    {/* Social */}
                    <div className="flex gap-2 mt-6">
                        {[
                            { icon: Facebook, color: 'hover:bg-[#1877F2] hover:border-[#1877F2]', url: 'https://facebook.com' },
                            { icon: Twitter, color: 'hover:bg-[#1DA1F2] hover:border-[#1DA1F2]', url: 'https://twitter.com' },
                            { icon: Instagram, color: 'hover:bg-[#E1306C] hover:border-[#E1306C]', url: 'https://instagram.com' },
                            { icon: Youtube, color: 'hover:bg-[#FF0000] hover:border-[#FF0000]', url: 'https://youtube.com' },
                        ].map(({ icon: Icon, color, url }, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={`bg-slate-800 border border-slate-700 ${color} hover:text-white text-slate-400 p-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5`}>
                                <Icon size={16} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-slate-800 pt-6 mx-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
                    <p>© 2026 DealOrbit. Made with <Heart size={10} className="inline text-red-500 fill-red-500 mx-0.5" /> for Indian shoppers.</p>
                    <div className="flex gap-4">
                        <a href="#" onClick={handleComingSoon} className="hover:text-slate-400 transition-colors">Privacy Policy</a>
                        <a href="#" onClick={handleComingSoon} className="hover:text-slate-400 transition-colors">Terms of Service</a>
                        <a href="#" onClick={handleComingSoon} className="hover:text-slate-400 transition-colors">Disclosure</a>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-400 font-bold">All deals verified</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
