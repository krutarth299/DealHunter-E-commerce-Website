const DEFAULT_AFFILIATE_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'];

const DEFAULT_CATEGORY_PATHS = {
    Electronics: ['electronics', 'mobiles', 'laptops', 'appliances', 'gadgets'],
    Fashion: ['fashion', 'men', 'women', 'clothing', 'footwear'],
    Beauty: ['beauty', 'personal-care', 'makeup', 'skin-care'],
    'Home & Kitchen': ['home-kitchen', 'home', 'kitchen', 'furniture'],
    Baby: ['baby', 'kids', 'toys'],
    Health: ['health', 'pharmacy', 'wellness'],
    Grocery: ['grocery', 'supermarket', 'food'],
    Travel: ['travel', 'flights', 'hotels'],
    Furniture: ['furniture', 'home-decor']
};

const DEFAULT_PRICE_MAPPING = {
    dealPrice: ['salePrice', 'currentPrice', 'sellingPrice', 'price'],
    mrp: ['mrp', 'originalPrice', 'listPrice', 'strikePrice'],
    discount: 'calculated-from-mrp-and-deal-price'
};

const DEFAULT_VALIDATION_RULES = [
    'title-required',
    'valid-product-url-required',
    'deal-price-greater-than-zero',
    'mrp-must-not-be-lower-than-deal-price',
    'product-owned-image-required',
    'reject-duplicates-by-canonical-url-source-id-title'
];

const DEFAULT_DUPLICATE_KEYS = ['canonicalProductUrl', 'sourceProductId', 'storeName+normalizedTitle'];

export const AFFILIATE_STORE_SOURCES = [
    {
        store: 'Amazon',
        tier: 1,
        domain: 'amazon.in',
        homeUrl: 'https://www.amazon.in',
        category: 'Multi-category',
        categories: ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Grocery'],
        enabledByDefault: true,
        affiliateReady: true,
        affiliateParams: ['tag']
    },
    {
        store: 'Flipkart',
        tier: 1,
        domain: 'flipkart.com',
        homeUrl: 'https://www.flipkart.com',
        category: 'Multi-category',
        categories: ['Electronics', 'Fashion', 'Home', 'Appliances'],
        enabledByDefault: true,
        affiliateReady: true,
        affiliateParams: ['affExtParam']
    },
    {
        store: 'Myntra',
        tier: 1,
        domain: 'myntra.com',
        homeUrl: 'https://www.myntra.com',
        category: 'Fashion',
        categories: ['Fashion', 'Footwear', 'Beauty', 'Accessories'],
        enabledByDefault: true,
        affiliateReady: true,
        affiliateParams: ['utm_affiliate', 'utm_source']
    },
    {
        store: 'Nykaa',
        tier: 1,
        domain: 'nykaa.com',
        homeUrl: 'https://www.nykaa.com',
        category: 'Beauty',
        categories: ['Beauty', 'Personal Care', 'Fashion'],
        enabledByDefault: true,
        affiliateReady: true,
        affiliateParams: ['utm_source', 'utm_medium']
    },
    {
        store: 'Tata CLiQ',
        aliases: ['Tata Cliq', 'TataCliq'],
        tier: 1,
        domain: 'tatacliq.com',
        homeUrl: 'https://www.tatacliq.com',
        category: 'Lifestyle',
        categories: ['Fashion', 'Electronics', 'Beauty', 'Luxury'],
        enabledByDefault: true,
        affiliateReady: true,
        affiliateParams: ['utm_source', 'utm_medium']
    },
    {
        store: 'Croma',
        tier: 1,
        domain: 'croma.com',
        homeUrl: 'https://www.croma.com',
        category: 'Electronics',
        categories: ['Electronics', 'Appliances', 'Accessories'],
        enabledByDefault: true,
        affiliateReady: true,
        affiliateParams: ['utm_source', 'utm_medium']
    },
    {
        store: 'Reliance Digital',
        tier: 1,
        domain: 'reliancedigital.in',
        homeUrl: 'https://www.reliancedigital.in',
        category: 'Electronics',
        categories: ['Electronics', 'Appliances', 'Mobiles'],
        enabledByDefault: true,
        affiliateReady: true,
        affiliateParams: ['utm_source', 'utm_medium']
    },
    {
        store: 'FirstCry',
        tier: 1,
        domain: 'firstcry.com',
        homeUrl: 'https://www.firstcry.com',
        category: 'Baby',
        categories: ['Baby', 'Kids', 'Toys', 'Fashion'],
        enabledByDefault: true,
        affiliateReady: true,
        affiliateParams: ['utm_source', 'utm_medium']
    },
    {
        store: 'Purplle',
        tier: 2,
        domain: 'purplle.com',
        homeUrl: 'https://www.purplle.com',
        category: 'Beauty',
        categories: ['Beauty', 'Personal Care'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'Lenskart',
        tier: 2,
        domain: 'lenskart.com',
        homeUrl: 'https://www.lenskart.com',
        category: 'Eyewear',
        categories: ['Eyewear', 'Fashion', 'Accessories'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'Snapdeal',
        tier: 2,
        domain: 'snapdeal.com',
        homeUrl: 'https://www.snapdeal.com',
        category: 'Multi-category',
        categories: ['Fashion', 'Home', 'Electronics'],
        enabledByDefault: true,
        affiliateReady: true
    },
    {
        store: 'Tata 1mg',
        tier: 2,
        domain: '1mg.com',
        homeUrl: 'https://www.1mg.com',
        category: 'Health',
        categories: ['Pharmacy', 'Health', 'Personal Care'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'PharmEasy',
        tier: 2,
        domain: 'pharmeasy.in',
        homeUrl: 'https://pharmeasy.in',
        category: 'Health',
        categories: ['Pharmacy', 'Health'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'BigBasket',
        tier: 2,
        domain: 'bigbasket.com',
        homeUrl: 'https://www.bigbasket.com',
        category: 'Grocery',
        categories: ['Grocery', 'Home Essentials'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'Pepperfry',
        tier: 2,
        domain: 'pepperfry.com',
        homeUrl: 'https://www.pepperfry.com',
        category: 'Furniture',
        categories: ['Furniture', 'Home & Kitchen'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'Urban Ladder',
        tier: 2,
        domain: 'urbanladder.com',
        homeUrl: 'https://www.urbanladder.com',
        category: 'Furniture',
        categories: ['Furniture', 'Home & Kitchen'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'IKEA India',
        aliases: ['IKEA'],
        tier: 2,
        domain: 'ikea.com',
        homeUrl: 'https://www.ikea.com/in/en/',
        category: 'Home & Kitchen',
        categories: ['Furniture', 'Home & Kitchen'],
        enabledByDefault: false,
        affiliateReady: false
    },
    {
        store: 'Zepto',
        tier: 3,
        domain: 'zeptonow.com',
        homeUrl: 'https://www.zeptonow.com',
        category: 'Grocery',
        categories: ['Grocery', 'Quick Commerce'],
        enabledByDefault: false,
        affiliateReady: false
    },
    {
        store: 'Blinkit',
        tier: 3,
        domain: 'blinkit.com',
        homeUrl: 'https://blinkit.com',
        category: 'Grocery',
        categories: ['Grocery', 'Quick Commerce'],
        enabledByDefault: false,
        affiliateReady: false
    },
    {
        store: 'JioMart',
        tier: 3,
        domain: 'jiomart.com',
        homeUrl: 'https://www.jiomart.com',
        category: 'Grocery',
        categories: ['Grocery', 'Electronics', 'Fashion'],
        enabledByDefault: false,
        affiliateReady: false
    },
    {
        store: 'MakeMyTrip',
        tier: 3,
        domain: 'makemytrip.com',
        homeUrl: 'https://www.makemytrip.com',
        category: 'Travel',
        categories: ['Travel', 'Hotels', 'Flights'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'ixigo',
        tier: 3,
        domain: 'ixigo.com',
        homeUrl: 'https://www.ixigo.com',
        category: 'Travel',
        categories: ['Travel', 'Flights', 'Trains'],
        enabledByDefault: false,
        affiliateReady: true
    },
    {
        store: 'Yatra',
        tier: 3,
        domain: 'yatra.com',
        homeUrl: 'https://www.yatra.com',
        category: 'Travel',
        categories: ['Travel', 'Flights', 'Hotels'],
        enabledByDefault: false,
        affiliateReady: true
    }
];

const normalized = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const getEnabledStoreSources = () => {
    const explicitlyEnabled = new Set(
        String(process.env.ENABLED_STORE_SOURCES || '')
            .split(',')
            .map((item) => normalized(item))
            .filter(Boolean)
    );

    return AFFILIATE_STORE_SOURCES.filter((source) => (
        source.enabledByDefault || explicitlyEnabled.has(normalized(source.store))
    ));
};

export const getStoreSourceByName = (store = '') => {
    const key = normalized(store);
    return AFFILIATE_STORE_SOURCES.find((source) => (
        normalized(source.store) === key
        || (source.aliases || []).some((alias) => normalized(alias) === key)
    ));
};

export const getStoreSourceByUrl = (url = '') => {
    const text = String(url || '').toLowerCase();
    return AFFILIATE_STORE_SOURCES.find((source) => (
        text.includes(source.domain)
        || (source.aliases || []).some((alias) => text.includes(normalized(alias)))
    ));
};

export const getStoreHomeUrlMap = () => (
    Object.fromEntries(
        AFFILIATE_STORE_SOURCES
            .map((source) => [source.store, source.homeUrl])
    )
);

export const getStoreIntegrationConfig = (source = {}) => ({
    ...source,
    storeName: source.store,
    baseURL: source.homeUrl,
    affiliateParams: source.affiliateParams || DEFAULT_AFFILIATE_PARAMS,
    affiliateLinkHandler: source.affiliateLinkHandler || {
        type: 'query-param',
        supportedParams: source.affiliateParams || DEFAULT_AFFILIATE_PARAMS,
        networkCompatible: true
    },
    priceMapping: source.priceMapping || DEFAULT_PRICE_MAPPING,
    validationRules: source.validationRules || DEFAULT_VALIDATION_RULES,
    duplicateKeys: source.duplicateKeys || DEFAULT_DUPLICATE_KEYS
});
