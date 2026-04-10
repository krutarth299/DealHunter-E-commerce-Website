export const SITE_NAME = 'DealSphere';
export const SITE_TAGLINE = 'Smart Deals Around the World';
export const SITE_TITLE = `${SITE_NAME} - Verified Deals, Coupons & Price Drops`;
export const SITE_DESCRIPTION = 'Find verified online deals, live discounts, price drops and coupons from top stores like Amazon, Flipkart and Myntra.';
const configuredSiteOrigin = import.meta.env?.VITE_SITE_URL || import.meta.env?.VITE_SITE_ORIGIN || 'https://dealsphere.com';
export const SITE_ORIGIN = String(configuredSiteOrigin).replace(/\/+$/, '');
export const SITE_LOCALE = 'en_IN';
export const SITE_THEME_COLOR = '#0f172a';
export const SITE_TWITTER_HANDLE = '';
export const SITE_SOCIAL_IMAGE = '/og-dealsphere.svg';

export const makePageTitle = (title) => {
    const normalizedTitle = String(title || '').trim();

    if (!normalizedTitle) return SITE_TITLE;
    if (normalizedTitle.toLowerCase().includes(SITE_NAME.toLowerCase())) {
        return normalizedTitle;
    }

    return `${normalizedTitle} | ${SITE_NAME}`;
};
