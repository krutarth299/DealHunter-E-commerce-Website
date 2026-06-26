import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, ExternalLink, Filter, Search, ArrowRight, Loader2, Calendar } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { SITE_ORIGIN } from '../config/brand';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { AuthContext } from '../context/authContextDefinition';

const Freebies = ({ user, wishlist, setIsAddDealOpen }) => {
    const { apiBase } = useContext(AuthContext);
    const navigate = useNavigate();

    // SSR Support
    const getInitialFreebies = () => {
        if (typeof window !== 'undefined' && window.__INITIAL_FREEBIES__) return window.__INITIAL_FREEBIES__;
        if (typeof global !== 'undefined' && global.__INITIAL_FREEBIES__) return global.__INITIAL_FREEBIES__;
        return null;
    };

    const initialData = getInitialFreebies();
    const [freebies, setFreebies] = useState(initialData?.items || []);
    const [types, setTypes] = useState(initialData?.types || []);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        let mounted = true;

        const loadFreebies = async () => {
            try {
                if (!initialData) setLoading(true);
                const res = await fetch(`${apiBase.replace('/user', '')}/freebies`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Failed to load freebies');
                
                if (mounted) {
                    setFreebies(data.items || []);
                    setTypes(data.types || []);
                }
            } catch (err) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (apiBase) loadFreebies();

        return () => { mounted = false; };
    }, [apiBase, initialData]);

    const filteredFreebies = freebies.filter(f => {
        const matchesType = selectedType === 'All' || f.type === selectedType;
        const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (f.provider && f.provider.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesType && matchesSearch;
    });

    const pageUrl = `${SITE_ORIGIN}/freebies`;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <SEO
                title="100% Free Games, Software, and Samples | DealSphere Freebies"
                description="Discover the best daily freebies including free PC games, premium software licenses, and physical product samples. 100% free with no hidden costs."
                canonical="/freebies"
                type="website"
            />
            
            <Navbar user={user} wishlistCount={wishlist?.length || 0} onAddDealClick={() => setIsAddDealOpen(true)} />

            <main className="flex-grow pt-24 pb-20">
                {/* Header Section */}
                <div className="bg-slate-900 pt-16 pb-24 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-purple-500/20 opacity-50"></div>
                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center z-10">
                        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-orange-400 backdrop-blur-md mb-6 border border-white/10">
                            <Gift size={14} /> 100% Free Stuff
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Epic Freebies & Giveaways</h1>
                        <p className="text-slate-300 max-w-2xl mx-auto text-lg font-medium">Grab premium games, software, and exclusive samples absolutely free. Limited time offers updated daily.</p>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
                    {/* Filters & Search */}
                    <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between mb-10">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar">
                            <button
                                onClick={() => setSelectedType('All')}
                                className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${selectedType === 'All' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                            >
                                All Freebies
                            </button>
                            {types.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedType(t)}
                                    className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${selectedType === t ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="w-full md:w-72 relative shrink-0">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search freebies..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
                            <p className="font-bold tracking-widest uppercase text-sm">Loading Freebies...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center font-bold">
                            {error}
                        </div>
                    ) : filteredFreebies.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <Gift size={48} className="mx-auto text-slate-200 mb-4" />
                            <h3 className="text-xl font-black text-slate-900 mb-2">No freebies found</h3>
                            <p className="text-slate-500 font-medium max-w-md mx-auto">We couldn't find any freebies matching your filters. Check back later for new drops!</p>
                            <button onClick={() => { setSelectedType('All'); setSearchQuery(''); }} className="mt-6 px-6 py-2.5 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-colors">Clear Filters</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredFreebies.map(freebie => (
                                <Link 
                                    key={freebie._id} 
                                    to={`/freebies/${freebie.slug}`}
                                    className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                                >
                                    <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden p-6 flex items-center justify-center">
                                        <div className="absolute top-4 left-4 z-10 flex gap-2">
                                            <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">100% Free</span>
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
                                        <img 
                                            src={optimizeImageUrl(freebie.image)} 
                                            alt={freebie.title} 
                                            className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform duration-500 relative z-0"
                                        />
                                    </div>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">
                                            <span>{freebie.provider || freebie.type}</span>
                                            {freebie.value > 0 && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span className="line-through">₹{Number(freebie.value).toLocaleString('en-IN')}</span>
                                                </>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 leading-snug mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">{freebie.title}</h3>
                                        <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-6 flex-grow">{freebie.description}</p>
                                        
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-2 text-xs font-black text-orange-600">
                                                <Gift size={16} /> Claim Now
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                                                <ArrowRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Freebies;
