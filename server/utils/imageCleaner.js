/**
 * Utility to validate and sanitize product image URLs
 */

/**
 * Normalizes and validates a single image URL
 */
export const validateImageUrl = (url = '') => {
    if (!url || typeof url !== 'string') return null;
    
    const trimmed = url.trim();
    if (!trimmed.startsWith('http')) return null;
    
    const lower = trimmed.toLowerCase();
    
    // Filter out common junk
    if (
        lower.includes('icon') || 
        lower.includes('logo') || 
        lower.includes('plus') || 
        lower.includes('sprite') ||
        lower.includes('pixel') ||
        lower.includes('analytics') ||
        lower.includes('ads') ||
        lower.includes('placeholder') ||
        lower.endsWith('.svg') ||
        lower.includes('/svg')
    ) {
        return null;
    }
    
    return trimmed;
};

/**
 * Processes an array of image URLs: validates, optimizes, and deduplicates
 */
export const processImages = (images = []) => {
    if (!Array.isArray(images)) return [];
    
    const validated = images
        .map(img => validateImageUrl(img))
        .filter(Boolean);
        
    return [...new Set(validated)];
};

/**
 * Safely picks the primary image from a list
 */
export const getPrimaryImage = (images = [], fallback = '') => {
    const list = processImages(images);
    return list.length > 0 ? list[0] : (validateImageUrl(fallback) || '');
};
