import React, { createContext, useContext, useState, useEffect } from 'react';

const RecentlyViewedContext = createContext();

export const RecentlyViewedProvider = ({ children }) => {
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem('recentlyViewed');
        if (stored) {
            try {
                setRecentlyViewed(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing recently viewed:", e);
            }
        }
    }, []);

    const addRecentlyViewed = (product) => {
        if (!product || (!product.id && !product._id)) return;
        
        setRecentlyViewed(prev => {
            const productId = product.id || product._id;
            // Remove if already exists to move it to front
            const filtered = prev.filter(p => (p.id || p._id) !== productId);
            const updated = [product, ...filtered].slice(0, 10); // Keep last 10
            localStorage.setItem('recentlyViewed', JSON.stringify(updated));
            return updated;
        });
    };

    const clearRecentlyViewed = () => {
        setRecentlyViewed([]);
        localStorage.removeItem('recentlyViewed');
    };

    return (
        <RecentlyViewedContext.Provider value={{ recentlyViewed, addRecentlyViewed, clearRecentlyViewed }}>
            {children}
        </RecentlyViewedContext.Provider>
    );
};

export const useRecentlyViewed = () => {
    const context = useContext(RecentlyViewedContext);
    if (!context) {
        throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
    }
    return context;
};
