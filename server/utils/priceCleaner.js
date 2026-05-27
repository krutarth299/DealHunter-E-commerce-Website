/**
 * Utility to clean and parse price strings into numbers
 */
export const cleanPrice = (text = '') => {
    if (typeof text === 'number') return text;
    
    const cleaned = String(text || '')
        .replace(/[^\d.]/g, '') // Keep digits and dots
        .trim();
    
    if (!cleaned) return 0;
    
    const price = parseFloat(cleaned);
    return isFinite(price) ? Math.round(price) : 0;
};

/**
 * Validates if a price is within a reasonable range
 */
export const isValidPrice = (price) => {
    const p = typeof price === 'number' ? price : cleanPrice(price);
    return p > 5 && p < 2000000;
};

/**
 * Safely calculates discount percentage
 */
export const calculateDiscount = (mrp, dealPrice) => {
    const m = cleanPrice(mrp);
    const d = cleanPrice(dealPrice);
    
    if (m > 0 && d > 0 && m > d) {
        return Math.round(((m - d) / m) * 100);
    }
    return 0;
};
