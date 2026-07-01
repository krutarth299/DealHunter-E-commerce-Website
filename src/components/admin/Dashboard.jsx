import React, { useState, useMemo } from 'react';
import { 
    LayoutDashboard, Package, TrendingUp, DollarSign, 
    Flame, Activity, TrendingDown, ExternalLink, 
    Pencil, AlertCircle, ArrowRight, Zap, Search, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { safeArray, safeString } from '../../utils/safety';
import { 
    DealsGrowthChart, 
    CategoryPerformanceChart, 
    StoreComparisonChart 
} from './Charts';

const Dashboard = ({ 
    stats, 
    adminDeals,
    adminInsights,
    getDealDisplayPrice, 
    getDealDisplayMrp, 
    getDealDisplayDiscount, 
    getDealViews, 
    onEditDeal, 
    navigate, 
    setDuplicateOnly 
}) => {
    const [tableSearch, setTableSearch] = useState('');
    const [tableSort, setTableSort] = useState('views');
    const [activeChart, setActiveChart] = useState('growth');

    const safeDeals = safeArray(adminDeals);
    
    const cards = [
        { label: 'Total Deals', value: stats?.totalDeals || 0, icon: Package, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20', trend: 'Exact Count', trendUp: true },
        { label: 'Active Deals', value: stats?.activeDeals || 0, icon: Activity, color: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/20', trend: 'Currently Live', trendUp: true },
        { label: 'Total Clicks', value: (stats?.totalClicks || 0).toLocaleString(), icon: TrendingUp, color: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20', trend: 'Total Views', trendUp: true },
        { label: 'Total Stores', value: stats?.totalStores || 0, icon: Flame, color: 'from-orange-500 to-[#FF6A00]', shadow: 'shadow-orange-500/20', trend: 'Tracked', trendUp: true }
    ];

    const sortedTableDeals = useMemo(() => {
        let filtered = safeDeals;
        if (tableSearch) {
            const queryWords = tableSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter(d => {
                const haystack = `${d.title || ''} ${d.store || ''}`.toLowerCase();
                return queryWords.every(word => haystack.includes(word));
            });
        }
        return filtered.sort((a, b) => {
            if (tableSort === 'views') return getDealViews(b) - getDealViews(a);
            if (tableSort === 'discount') return (b.discountPercent || 0) - (a.discountPercent || 0);
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }).slice(0, 10);
    }, [safeDeals, tableSearch, tableSort, getDealViews]);

    if (!stats || !adminInsights) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
    );

    return (
        <div className="space-y-8 relative optimize-gpu">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <motion.div 
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white/80 backdrop-blur-xl p-6 rounded-[24px] border border-slate-200/60 shadow-premium-sm hover:shadow-xl transition-all relative overflow-hidden group"
                    >
                        <div className={`absolute -right-4 -top-4 w-32 h-32 bg-gradient-to-br ${card.color} rounded-full opacity-5 blur-2xl group-hover:opacity-15 transition-opacity duration-700`}></div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className={`h-12 w-12 bg-gradient-to-br ${card.color} text-white rounded-[16px] flex items-center justify-center shadow-lg ${card.shadow}`}>
                                {card.icon && <card.icon size={22} />}
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${card.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {card.trend}
                            </div>
                        </div>

                        <div className="relative z-10">
                            <div className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</div>
                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{card.label}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts & Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[24px] border border-slate-200/60 shadow-premium-sm p-6 relative overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-slate-900 flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#FF6A00]" />
                            Performance Analytics
                        </h3>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            {['growth', 'stores'].map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveChart(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeChart === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        {activeChart === 'growth' ? <DealsGrowthChart deals={safeDeals} /> : <StoreComparisonChart deals={safeDeals} />}
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-slate-200/60 shadow-premium-sm p-6 flex flex-col">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                        <LayoutDashboard size={18} className="text-blue-500" />
                        Top Categories
                    </h3>
                    <div className="flex-1">
                        <CategoryPerformanceChart deals={safeDeals} />
                    </div>
                </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Smart Table */}
                <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl rounded-[24px] border border-slate-200/60 shadow-premium-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-5 border-b border-slate-100/60 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="font-black text-slate-900 flex items-center gap-2">
                            <Activity size={18} className="text-emerald-500" />
                            Top Performing Deals
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search deals..." 
                                    value={tableSearch}
                                    onChange={(e) => setTableSearch(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-4 text-xs font-semibold focus:outline-none focus:border-orange-300 w-full sm:w-48 shadow-sm"
                                />
                            </div>
                            <select 
                                value={tableSort}
                                onChange={(e) => setTableSort(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none shadow-sm"
                            >
                                <option value="views">Most Viewed</option>
                                <option value="discount">Highest Discount</option>
                                <option value="newest">Newest</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Product</th>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Price & Discount</th>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Clicks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {sortedTableDeals.map((deal) => (
                                    <tr 
                                        key={deal._id || deal.id} 
                                        onClick={() => onEditDeal && onEditDeal(deal)}
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 p-1 flex-shrink-0">
                                                    <img src={deal.image || deal.imageUrl || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
                                                </div>
                                                <div className="min-w-0 max-w-[200px]">
                                                    <p className="text-xs font-black text-slate-900 truncate group-hover:text-[#FF6A00] transition-colors">{deal.title}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 truncate">{deal.store || deal.storeName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900">{getDealDisplayPrice(deal)}</span>
                                                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 w-max px-1.5 rounded">{getDealDisplayDiscount(deal)}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${deal.isExpired ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {deal.isExpired ? 'Expired' : 'Live'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Eye size={12} className="text-slate-400" />
                                                <span className="text-xs font-black text-slate-700">{getDealViews(deal).toLocaleString()}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sortedTableDeals.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-5 py-12 text-center text-xs font-bold text-slate-400">No deals found matching criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side Panels */}
                <div className="space-y-6 flex flex-col h-[500px]">
                    
                    {/* Action Alerts */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-slate-200/60 shadow-premium-sm p-6 shrink-0">
                        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                            <AlertCircle size={18} className="text-rose-500" />
                            Action Required
                        </h3>
                        <div className="space-y-3">
                            <button 
                                onClick={() => { if (setDuplicateOnly && navigate) { setDuplicateOnly(true); navigate('/admin/manage-deals'); } }}
                                className="w-full text-left p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors group flex items-center justify-between"
                            >
                                <div>
                                    <span className="text-xs font-black text-amber-900 block mb-0.5">Duplicates Detected</span>
                                    <span className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Clean up to improve SEO</span>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                                    {adminInsights.duplicateCount || 0}
                                </div>
                            </button>

                            <button 
                                onClick={() => navigate('/admin/manage-deals')}
                                className="w-full text-left p-4 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors group flex items-center justify-between"
                            >
                                <div>
                                    <span className="text-xs font-black text-rose-900 block mb-0.5">Incomplete Deals</span>
                                    <span className="text-[10px] font-bold text-rose-700/80 uppercase tracking-wider">Missing affiliate links or images</span>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                                    {safeArray(adminInsights.incompleteDeals).length}
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* SEO & Auto-Finder Health */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-slate-200/60 shadow-premium-sm p-6 flex-1 flex flex-col">
                        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                            <Zap size={18} className="text-indigo-500" />
                            System Health
                        </h3>
                        <div className="flex-1 space-y-4">
                            <div>
                                <div className="flex justify-between text-xs font-black mb-1.5">
                                    <span className="text-slate-600">Global Affiliate Health</span>
                                    <span className="text-emerald-600">98%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[98%] rounded-full" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-black mb-1.5">
                                    <span className="text-slate-600">SEO Meta Completeness</span>
                                    <span className="text-[#FF6A00]">85%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-orange-400 to-[#FF6A00] w-[85%] rounded-full" />
                                </div>
                            </div>
                            <div className="pt-4 mt-2 border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Scraper Activity</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Amazon bot synced 12 mins ago
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
