export const AFFILIATE_STORE_PROFILES = {
    Amazon: { domain: 'amazon.in', tier: 1, category: 'Multi-category', tagline: 'Live Amazon deals from your catalog' },
    Flipkart: { domain: 'flipkart.com', tier: 1, category: 'Multi-category', tagline: 'Live Flipkart deals from your catalog' },
    Croma: { domain: 'croma.com', tier: 1, category: 'Electronics', tagline: 'Live electronics and appliance deals' },
    'Reliance Digital': { domain: 'reliancedigital.in', tier: 1, category: 'Electronics', tagline: 'Live Reliance Digital electronics offers' },
    FirstCry: { domain: 'firstcry.com', tier: 1, category: 'Baby', tagline: 'Live baby, kids and parenting deals' },
    Purplle: { domain: 'purplle.com', tier: 2, category: 'Beauty', tagline: 'Beauty and personal care offers' },
    Lenskart: { domain: 'lenskart.com', tier: 2, category: 'Eyewear', tagline: 'Eyewear and accessories offers' },
    'Tata 1mg': { domain: '1mg.com', tier: 2, category: 'Health', tagline: 'Pharmacy and health offers' },
    PharmEasy: { domain: 'pharmeasy.in', tier: 2, category: 'Health', tagline: 'Medicine and healthcare offers' },
    BigBasket: { domain: 'bigbasket.com', tier: 2, category: 'Grocery', tagline: 'Live supermarket offers' },
    Pepperfry: { domain: 'pepperfry.com', tier: 2, category: 'Furniture', tagline: 'Furniture and home decor offers' },
    'Urban Ladder': { domain: 'urbanladder.com', tier: 2, category: 'Furniture', tagline: 'Furniture and home decor offers' },
    'IKEA India': { domain: 'ikea.com', tier: 2, category: 'Home & Kitchen', tagline: 'Home furnishing offers' },
    Zepto: { domain: 'zeptonow.com', tier: 3, category: 'Grocery', tagline: 'Quick-commerce grocery offers' },
    Blinkit: { domain: 'blinkit.com', tier: 3, category: 'Grocery', tagline: 'Live grocery and essentials offers' },
    JioMart: { domain: 'jiomart.com', tier: 3, category: 'Grocery', tagline: 'Grocery, fashion and electronics offers' },
    MakeMyTrip: { domain: 'makemytrip.com', tier: 3, category: 'Travel', tagline: 'Flights, hotels and travel promotions' },
    ixigo: { domain: 'ixigo.com', tier: 3, category: 'Travel', tagline: 'Travel booking offers' },
    Yatra: { domain: 'yatra.com', tier: 3, category: 'Travel', tagline: 'Travel and hotel offers' },
};

export const STORE_DETECTION_PATTERNS = [
    ...Object.entries(AFFILIATE_STORE_PROFILES).map(([name, profile]) => ({
        name,
        patterns: [profile.domain, name].filter(Boolean)
    })),
    { name: 'IKEA India', patterns: ['ikea.com/in', 'ikea india'] },
    { name: 'Tata 1mg', patterns: ['1mg.com', 'tata 1mg', '1mg'] }
];

const normalizeStoreKey = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const getStoreProfile = (store = '') => {
    const direct = AFFILIATE_STORE_PROFILES[store];
    if (direct) return direct;

    const normalized = normalizeStoreKey(store);
    const matched = Object.entries(AFFILIATE_STORE_PROFILES).find(([name]) => normalizeStoreKey(name) === normalized);
    return matched?.[1] || null;
};

export const getStoreLogoUrl = (store = '', fallbackDomain = '') => {
    const profile = getStoreProfile(store);
    const domain = profile?.domain || fallbackDomain || `${String(store || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
};
