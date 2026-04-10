/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useState } from 'react';
import { normalizeDealForUi } from '../utils/dealUi';

const RecentlyViewedContext = createContext();
const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_RECENTLY_VIEWED = 10;

const getBrowserStorage = () => {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    return storage && typeof storage.getItem === 'function' ? storage : null;
};

const sanitizeStoredProduct = (product = {}) => {
    const normalized = normalizeDealForUi(product);
    const productId = normalized.id || normalized._id || product.id || product._id;

    if (!productId || !normalized.title) {
        return null;
    }

    return {
        id: normalized.id || normalized._id || productId,
        _id: normalized._id || normalized.id || productId,
        title: normalized.title,
        image: normalized.image,
        images: normalized.images || [],
        store: normalized.store,
        storeName: normalized.storeName,
        category: normalized.category,
        dealPrice: normalized.dealPrice,
        price: normalized.price,
        mrp: normalized.mrp,
        originalPrice: normalized.originalPrice,
        discount: normalized.discount,
        discountPercent: normalized.discountPercent,
        productUrl: normalized.productUrl,
        link: normalized.link,
        affiliateLink: normalized.affiliateLink,
        affiliateOverrideLink: normalized.affiliateOverrideLink,
        createdAt: normalized.createdAt || product.createdAt || new Date().toISOString(),
        viewedAt: product.viewedAt || new Date().toISOString()
    };
};

const readStoredProducts = () => {
    const storage = getBrowserStorage();
    if (!storage) return [];

    const stored = storage.getItem(STORAGE_KEY) || storage.getItem('recentlyViewed');
    if (!stored) return [];

    try {
        const parsed = JSON.parse(stored);
        return (Array.isArray(parsed) ? parsed : [])
            .map((item) => sanitizeStoredProduct(item))
            .filter(Boolean)
            .slice(0, MAX_RECENTLY_VIEWED);
    } catch (error) {
        console.error('Error parsing recently viewed:', error);
        return [];
    }
};

export const RecentlyViewedProvider = ({ children }) => {
    const [recentlyViewed, setRecentlyViewed] = useState(readStoredProducts);

    const addRecentlyViewed = useCallback((product) => {
        const sanitizedProduct = sanitizeStoredProduct(product);
        if (!sanitizedProduct) return;

        setRecentlyViewed(prev => {
            const productId = sanitizedProduct.id || sanitizedProduct._id;

            if (prev.length > 0) {
                const firstId = prev[0]?.id || prev[0]?._id;
                if (firstId && String(firstId) === String(productId)) {
                    return prev;
                }
            }

            const filtered = prev.filter(p => (p.id || p._id) !== productId);
            const updated = [
                { ...sanitizedProduct, viewedAt: new Date().toISOString() },
                ...filtered
            ].slice(0, MAX_RECENTLY_VIEWED);
            getBrowserStorage()?.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearRecentlyViewed = useCallback(() => {
        setRecentlyViewed([]);
        getBrowserStorage()?.removeItem(STORAGE_KEY);
    }, []);

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
