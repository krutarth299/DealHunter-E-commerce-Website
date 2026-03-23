export const optimizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    let optimized = url;

    try {
        // Amazon: Remove resolution modifiers for original high-res quality
        // e.g. ._AC_SY200_, ._SL160_, ._SR160,160_, etc.
        if (url.includes('amazon.in') || url.includes('amazon.com') || url.includes('media-amazon.com')) {
            optimized = url.replace(/\._[A-Z0-9,_%]+_\./, '.');
            // If the regex didn't change anything, try another common pattern
            if (optimized === url) {
                optimized = url.replace(/\.\_\w+\_\.jpg/i, '.jpg');
            }
            // Ensure we don't accidentally remove the extension if it wasn't a modifier
            if (!optimized.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
                optimized = url; // fallback
            }
        }
        
        // Flipkart: Replace dynamic dimensions with HD values
        if (url.includes('flipkart.com')) {
            optimized = url.replace('{@width}', '1000').replace('{@height}', '1000').replace(/q=\d+/, 'q=100');
        }

        // Myntra: Ensure high resolution
        if (url.includes('myntassets.com')) {
            // Myntra uses w_ and h_ or fixed dimensions like h_480,w_360
            optimized = url
                .replace(/w_\d+/, 'w_1080')
                .replace(/h_\d+/, 'h_1440')
                .replace(/q_\d+/, 'q_100')
                .replace('h_480', 'h_1440')
                .replace('w_360', 'w_1080');
        }

        // Ajio: Ensure high resolution
        if (url.includes('ajio.com')) {
            optimized = url.replace(/w_\d+/, 'w_800').replace(/h_\d+/, 'h_800');
        }
    } catch (e) {
        return url;
    }

    return optimized;
};

// Standard junk image filter to exclude icons, logos, etc.
export const JUNK_IMAGE_REGEX = /logo|icon|sprite|pixel|loading|placeholder|banner|nav|menu|button|spacer|gif|svg|avatar|profile|captcha|bot|delivery|shipping|portal|pingportal/i;

/**
 * Robustly selects the main product image from a deal object.
 * Follows the rule: Favor the first element of images[] that is NOT junk, 
 * falling back to the image property if it's NOT junk.
 */
export const getMainProductImage = (deal) => {
    if (!deal) return '/no-image.png';

    // 1. Try images array
    if (deal.images && Array.isArray(deal.images)) {
        const validImages = deal.images.filter(img => img && typeof img === 'string' && !JUNK_IMAGE_REGEX.test(img));
        if (validImages.length > 0) return optimizeImageUrl(validImages[0]);
    }

    // 2. Try single image property
    if (deal.image && typeof deal.image === 'string' && !JUNK_IMAGE_REGEX.test(deal.image)) {
        return optimizeImageUrl(deal.image);
    }

    // 3. Last resort: first available image even if junk-ish (or fallback)
    if (deal.images && deal.images.length > 0) return optimizeImageUrl(deal.images[0]);
    
    return deal.image ? optimizeImageUrl(deal.image) : '/no-image.png';
};
