import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, FileText, ShoppingBag, Layers, AlertCircle, Link as LinkIcon, RefreshCw, Box, Tag, Zap } from 'lucide-react';

const getIconForType = (url) => {
    if (url.includes('/product/')) return ShoppingBag;
    if (url.includes('/category/')) return Layers;
    if (url.includes('/store/')) return Box;
    if (url.includes('/blog/')) return FileText;
    return LinkIcon;
};

const getTypeForUrl = (url) => {
    if (url.includes('/product/')) return 'Product';
    if (url.includes('/category/')) return 'Category';
    if (url.includes('/store/')) return 'Store';
    if (url.includes('/blog/')) return 'Blog';
    return 'Page';
};

const SitemapSeoManager = ({ adminApiBase, showToast }) => {
    const [loading, setLoading] = useState(true);
    const [sitemapData, setSitemapData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${adminApiBase}/sitemap-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch sitemap data');
            const data = await response.json();
            setSitemapData(data);
        } catch (err) {
            console.error('Sitemap fetch error:', err);
            showToast?.('Failed to load sitemap data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateManualLinks = async () => {
        setIsGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${adminApiBase}/generate-manual-sitemap`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to generate manual links');
            showToast?.('Manual links generated successfully!', 'success');
            await fetchData();
        } catch (err) {
            console.error('Generation error:', err);
            showToast?.('Failed to generate manual links', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const allLinks = useMemo(() => {
        if (!sitemapData) return [];
        const combined = [
            ...(sitemapData.pages || []),
            ...(sitemapData.products || []),
            ...(sitemapData.categories || []),
            ...(sitemapData.stores || []),
            ...(sitemapData.blogs || [])
        ];
        // Deduplicate just in case
        const seen = new Set();
        return combined.filter(entry => {
            if (!entry?.loc || seen.has(entry.loc)) return false;
            seen.add(entry.loc);
            return true;
        });
    }, [sitemapData]);

    const filteredLinks = useMemo(() => {
        return allLinks.filter(link => {
            if (!link?.loc) return false;
            const matchesSearch = link.loc.toLowerCase().includes(searchTerm.toLowerCase());
            const type = getTypeForUrl(link.loc);
            const matchesType = filterType === 'All' || type === filterType;
            return matchesSearch && matchesType;
        });
    }, [allLinks, searchTerm, filterType]);

    if (loading && !sitemapData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading Sitemap & SEO Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-orange-500" />
                        Sitemap & SEO Manager
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        View and manage all {allLinks.length} indexed URLs present in your sitemap line by line.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={handleGenerateManualLinks}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        <Loader2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : 'hidden'}`} />
                        {isGenerating ? 'Generating...' : 'Generate Manual Links'}
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search URL or path..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all sm:w-48"
                    >
                        <option value="All">All Types</option>
                        <option value="Page">Static Pages</option>
                        <option value="Product">Products</option>
                        <option value="Category">Categories</option>
                        <option value="Store">Stores</option>
                        <option value="Blog">Blogs</option>
                    </select>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-6 py-4">URL Path</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Last Modified</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLinks.length > 0 ? (
                                filteredLinks.map((link, idx) => {
                                    const TypeIcon = getIconForType(link.loc);
                                    const typeName = getTypeForUrl(link.loc);
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                        <TypeIcon className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                    <span className="text-slate-700 font-medium truncate max-w-[200px] sm:max-w-xs lg:max-w-md" title={link.loc}>
                                                        {link.loc.replace(/^https?:\/\/[^\/]+/, '') || '/'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                    {typeName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {link.priority || '0.5'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                {new Date(link.lastmod || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <a
                                                    href={link.loc}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors"
                                                >
                                                    <LinkIcon className="w-3 h-3" />
                                                    View Page
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No URLs match your search criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="flex items-center gap-2 p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm text-blue-800">
                    <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                    <p>
                        These URLs are dynamically injected with rich SEO <code>&lt;meta&gt;</code> tags and JSON-LD application schemas for optimal search engine rankings. Check "View Page Source" on any link to verify.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SitemapSeoManager;
