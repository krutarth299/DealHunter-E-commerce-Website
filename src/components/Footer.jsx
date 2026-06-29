import React, { useState } from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, ArrowRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Footer = ({ showToast }) => {
    const [email, setEmail] = useState('');

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (!email) return;
        if (showToast) showToast('Thanks for subscribing to Deal Alerts!', 'success');
        setEmail('');
    };

    return (
        <footer className="relative overflow-hidden border-t border-slate-800 bg-[#0F172A] pt-16 pb-28 md:pb-8 text-sm text-slate-300">
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#FF6A00] via-[#FF8C42] to-[#22C55E]" />

            <div className="mx-auto mb-12 grid max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-5">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logo} alt="DealSphere" className="h-16 w-auto scale-110 rounded-xl bg-white/95 object-contain p-1.5 shadow-md" />
                        <span className="text-3xl font-black tracking-tighter text-white">
                            Deal<span className="text-[#FF6A00]">Sphere</span>
                        </span>
                    </Link>
                    <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                        India's clean, premium affiliate deals platform. Discover verified offers from trusted stores with a consistent shopping experience.
                    </p>
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white">Get Deal Alerts</p>
                        <form onSubmit={handleSubscribe} className="flex items-center rounded-xl border border-slate-700 bg-slate-800 p-1 transition-all focus-within:border-[#FF6A00]/50">
                            <Mail size={16} className="ml-2 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your email address"
                                className="flex-1 border-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                                required
                            />
                            <button type="submit" className="rounded-lg bg-gradient-to-r from-[#FF6A00] to-[#FF8C42] p-2 text-white transition-transform hover:scale-[1.03]">
                                <ArrowRight size={14} />
                            </button>
                        </form>
                        <p className="mt-1.5 text-[10px] text-slate-500">Join shoppers who prefer clean, verified deal alerts.</p>
                    </div>
                </div>

                <div>
                    <h3 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white">
                        <span className="h-0.5 w-6 rounded-full bg-[#FF6A00]" /> Explore
                    </h3>
                    <ul className="space-y-3">
                        {[
                            { label: '🔥 Hot Deals', path: '/' },
                            { label: '🏪 All Stores', path: '/stores' },
                            { label: '✍️ Blog', path: '/blog' },
                            { label: '❤️ Wishlist', path: '/wishlist' },
                        ].map(({ label, path }) => (
                            <li key={label}>
                                <Link to={path} className="group flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-[#FF6A00]">
                                    <span className="h-1 w-1 rounded-full bg-slate-700 transition-colors group-hover:bg-[#FF6A00]" />
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white">
                        <span className="h-0.5 w-6 rounded-full bg-[#FF6A00]" /> Top Categories
                    </h3>
                    <ul className="space-y-3">
                        {[
                            { name: 'Electronics', label: '📱 Electronics' },
                            { name: 'Fashion', label: '👗 Fashion' },
                            { name: 'Gaming', label: '🎮 Gaming' },
                            { name: 'Groceries', label: '🛒 Grocery' },
                            { name: 'Travel', label: '✈️ Travel' },
                            { name: 'Home & Kitchen', label: '🏠 Home & Living' }
                        ].map((item) => (
                            <li key={item.name}>
                                <Link to={`/deals?category=${encodeURIComponent(item.name)}`} className="group flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-[#FF6A00]">
                                    <span className="h-1 w-1 rounded-full bg-slate-700 transition-colors group-hover:bg-[#FF6A00]" />
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white">
                        <span className="h-0.5 w-6 rounded-full bg-[#FF6A00]" /> Contact
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <MapPin size={16} className="mt-0.5 shrink-0 text-[#FF6A00]" />
                            <span className="text-sm leading-relaxed text-slate-300">Embassy Tech Village,<br />Bengaluru, India - 560103</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Mail size={16} className="shrink-0 text-[#FF6A00]" />
                            <a href="mailto:support@dealsphere.com" className="text-sm transition-colors hover:text-[#FF6A00]">support@dealsphere.com</a>
                        </li>
                    </ul>

                    <div className="mt-6 flex gap-2">
                        {[
                            { icon: Facebook, url: 'https://facebook.com' },
                            { icon: Twitter, url: 'https://twitter.com' },
                            { icon: Instagram, url: 'https://instagram.com' },
                            { icon: Youtube, url: 'https://youtube.com' },
                        ].map(({ icon: Icon, url }, i) => (
                            <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                            >
                                <Icon size={16} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-6 border-t border-slate-800 pt-6">
                <div className="flex flex-col items-center gap-4 text-xs text-slate-500 md:flex-row md:justify-between">
                    <p>
                        © 2026 DealSphere. Made with <Heart size={10} className="mx-0.5 inline fill-[#22C55E] text-[#22C55E]" /> for Indian shoppers.
                    </p>
                    <div className="flex gap-4">
                        <Link to="/privacy-policy" className="transition-colors hover:text-white">Privacy Policy</Link>
                        <Link to="/terms" className="transition-colors hover:text-white">Terms of Service</Link>
                        <Link to="/about" className="transition-colors hover:text-white">About</Link>
                        <Link to="/admin" className="transition-colors hover:text-[#FF6A00]">Admin</Link>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22C55E]" />
                        <span className="font-bold text-[#22C55E]">All deals verified</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
