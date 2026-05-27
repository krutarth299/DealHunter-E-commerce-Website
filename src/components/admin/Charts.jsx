import React, { useMemo } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { safeArray } from '../../utils/safety';

const COLORS = ['#FF6A00', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#F59E0B', '#14B8A6'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-3 rounded-2xl shadow-xl">
                <p className="text-xs font-black text-slate-500 uppercase mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}: {entry.value}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const DealsGrowthChart = ({ deals }) => {
    const data = useMemo(() => {
        const sorted = safeArray(deals).sort((a, b) => new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt));
        const countsByDate = {};
        let cumulative = 0;

        sorted.forEach(deal => {
            const date = new Date(deal.createdAt || deal.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (date !== 'Invalid Date') {
                cumulative++;
                countsByDate[date] = cumulative;
            }
        });

        const dates = Object.keys(countsByDate);
        if (dates.length > 7) {
            // Take last 7 days or sample to avoid overcrowding
            return dates.slice(-14).map(date => ({ date, total: countsByDate[date] }));
        }

        return dates.map(date => ({ date, total: countsByDate[date] }));
    }, [deals]);

    if (!data.length) return <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">No data available</div>;

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#FF6A00" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" name="Total Deals" stroke="#FF6A00" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export const CategoryPerformanceChart = ({ deals }) => {
    const data = useMemo(() => {
        const counts = {};
        safeArray(deals).forEach(deal => {
            const cat = deal.category || 'Other';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5
    }, [deals]);

    if (!data.length) return <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">No data available</div>;

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export const StoreComparisonChart = ({ deals }) => {
    const data = useMemo(() => {
        const counts = {};
        safeArray(deals).forEach(deal => {
            const store = deal.storeName || deal.store || 'Unknown';
            counts[store] = (counts[store] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6); // Top 6
    }, [deals]);

    if (!data.length) return <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">No data available</div>;

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Deals" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
