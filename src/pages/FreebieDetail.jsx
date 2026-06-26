import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Gift, ExternalLink, Calendar, ShieldCheck, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { SITE_ORIGIN } from '../config/brand';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { AuthContext } from '../context/authContextDefinition';

const FreebieDetail = ({ user, wishlist, setIsAddDealOpen }) => {
    const { slug } = useParams();
    const { apiBase } = useContext(AuthContext);

    const getInitialFreebie = () => {
        if (typeof window !== 'undefined' && window.__INITIAL_FREEBIE__ && window.__INITIAL_FREEBIE__.slug === slug) return window.__INITIAL_FREEBIE__;
        if (typeof global !== 'undefined' && global.__INITIAL_FREEBIE__ && global.__INITIAL_FREEBIE__.slug === slug) return global.__INITIAL_FREEBIE__;
        return null;
    };

    const initialData = getInitialFreebie();
    const [freebie, setFreebie] = useState(initialData);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        let mounted = true;

        const loadFreebie = async () => {
            try {
                if (!initialData) setLoading(true);
                const res = await fetch(`${apiBase.replace('/user', '')}/freebies/${slug}`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Freebie not found');
                
                if (mounted) setFreebie(data);
            } catch (err) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (apiBase) loadFreebie();

        return () => { mounted = false; };
    }, [apiBase, slug, initialData]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50">
                <Navbar user={user} wishlistCount={wishlist?.length || 0} onAddDealClick={() => setIsAddDealOpen(true)} />
                <main className="flex-grow pt-32 pb-20">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                        <div className="h-10 w-40 animate-pulse rounded bg-slate-200 mb-8" />
                        <div className="h-[400px] w-full animate-pulse rounded-3xl bg-slate-200 mb-8" />
                        <div className="h-12 w-3/4 animate-pulse rounded bg-slate-200 mb-4" />
                        <div className="h-24 w-full animate-pulse rounded bg-slate-200" />
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !freebie) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50">
                <Navbar user={user} wishlistCount={wishlist?.length || 0} onAddDealClick={() => setIsAddDealOpen(true)} />
                <main className="flex-grow pt-32 pb-20 flex flex-col items-center justify-center text-center">
                    <Gift size={64} className="text-slate-300 mb-6" />
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Freebie not found</h1>
                    <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">{error || 'This freebie may have expired or been removed.'}</p>
                    <Link to="/freebies" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors inline-flex items-center gap-2">
                        <ArrowLeft size={16} /> Back to Freebies
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    const canonicalPath = `/freebies/${freebie.slug}`;
    const pageUrl = `${SITE_ORIGIN}${canonicalPath}`;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <SEO
                title={freebie.seoTitle || `${freebie.title} - 100% Free`}
                description={freebie.seoDescription || freebie.description}
                canonical={canonicalPath}
                type="product"
                image={freebie.image}
                keywords={freebie.seoKeywords?.length ? freebie.seoKeywords.join(', ') : 'freebie, free stuff, giveaway'}
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: freebie.title,
                    description: freebie.description,
                    image: optimizeImageUrl(freebie.image),
                    offers: {
                        '@type': 'Offer',
                        price: '0.00',
                        priceCurrency: 'INR',
                        availability: freebie.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                        url: pageUrl
                    }
                }}
            />
            
            <Navbar user={user} wishlistCount={wishlist?.length || 0} onAddDealClick={() => setIsAddDealOpen(true)} />

            <main className="flex-grow pt-24 pb-20">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-12">
                    <Link to="/freebies" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-orange-600 transition-colors mb-8">
                        <ArrowLeft size={14} /> Back to All Freebies
                    </Link>

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col md:flex-row">
                        {/* Image Section */}
                        <div className="w-full md:w-1/2 relative bg-slate-50 p-8 flex items-center justify-center min-h-[300px] md:min-h-[400px]">
                            <div className="absolute top-6 left-6 z-10 flex gap-2">
                                <span className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/30">100% Free</span>
                                {freebie.status === 'expired' && (
                                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">Expired</span>
                                )}
                            </div>
                            <img 
                                src={optimizeImageUrl(freebie.image)} 
                                alt={freebie.title} 
                                className="w-[80%] h-auto object-contain filter drop-shadow-2xl relative z-0"
                            />
                        </div>

                        {/* Content Section */}
                        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                                <span className="text-slate-600">{freebie.provider || 'Exclusive'}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <span>{freebie.type}</span>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4">{freebie.title}</h1>
                            
                            <p className="text-base font-medium text-slate-600 leading-relaxed mb-8">
                                {freebie.description}
                            </p>

                            <div className="flex items-center gap-4 mb-8 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600 shrink-0">
                                    <Zap size={24} className="fill-orange-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-1">Your Price</p>
                                    <div className="flex items-end gap-3">
                                        <span className="text-2xl font-black text-slate-900 leading-none">FREE</span>
                                        {freebie.value > 0 && (
                                            <span className="text-sm font-bold text-slate-400 line-through mb-0.5">₹{Number(freebie.value).toLocaleString('en-IN')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {freebie.expiresAt && new Date(freebie.expiresAt) > new Date() && (
                                <div className="flex items-center gap-2 text-sm font-bold text-red-500 mb-6 bg-red-50 p-3 rounded-xl">
                                    <Calendar size={16} /> Ends on {new Date(freebie.expiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </div>
                            )}

                            {freebie.status === 'active' ? (
                                <a 
                                    href={freebie.productUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-base font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-orange-600/30 transition-all active:scale-[0.98]"
                                >
                                    Get it for Free <ExternalLink size={20} />
                                </a>
                            ) : (
                                <button disabled className="w-full flex items-center justify-center gap-2 bg-slate-200 text-slate-500 text-base font-black uppercase tracking-widest py-5 rounded-2xl cursor-not-allowed">
                                    Offer Expired
                                </button>
                            )}

                            <div className="flex items-center justify-center gap-2 mt-6 text-xs font-bold text-slate-400">
                                <ShieldCheck size={14} className="text-emerald-500" /> 100% Verified Offer
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default FreebieDetail;
