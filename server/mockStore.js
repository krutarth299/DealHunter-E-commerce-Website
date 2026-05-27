// Initial Deals (Hot Deals & Regular)
export const deals = [
    {
        _id: 'hot_1',
        title: "realme Buds T310 True Wireless in-Ear Earbuds with 46dB Hybrid ANC, 360° Spatial Audio",
        store: "Amazon",
        price: "₹2,199",
        originalPrice: "₹3,999",
        discount: "45% OFF",
        image: "https://m.media-amazon.com/images/I/41XzpmsbuOL._SY300_SX300_QL70_FMwebp_.jpg",
        rating: 4.5,
        category: "Audio",
        link: "https://amazon.in",
        createdAt: new Date()
    },
    {
        _id: 'hot_3',
        title: "PLIX - Guava Glow Regime with 10% Vitamin C Face Mini Serum (10ml) & Juicy Mini Cleanser",
        store: "Nykaa",
        price: "₹230",
        originalPrice: "₹399",
        discount: "42% OFF",
        image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&auto=format&fit=crop&q=80",
        rating: 4.4,
        category: "Beauty",
        link: "https://nykaa.com",
        createdAt: new Date()
    },
    {
        _id: 'hot_4',
        title: "Fanta Orange Soft Drink",
        store: "Blinkit",
        price: "₹40",
        originalPrice: "₹50",
        discount: "20% OFF",
        image: "https://cdn.grofers.com/da/cms-assets/cms/product/rc-upload-1770356946958-679.jpg",
        rating: 4.8,
        category: "Food",
        link: "https://blinkit.com",
        createdAt: new Date()
    },
    {
        _id: 'hot_5',
        title: "Muuchstac Ocean Face Wash for Men",
        store: "Nykaa",
        price: "₹281",
        originalPrice: "₹450",
        discount: "38% OFF",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80",
        rating: 4.3,
        category: "Beauty",
        link: "https://nykaa.com",
        createdAt: new Date()
    },
    {
        _id: 'deal_1',
        title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        store: "Amazon",
        price: "₹24,990",
        originalPrice: "₹29,990",
        discount: "17% OFF",
        image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&auto=format&fit=crop&q=80",
        rating: 4.8,
        category: "Audio",
        link: "https://amazon.in",
        createdAt: new Date()
    },
    {
        _id: 'deal_2',
        title: "Samsung Galaxy Watch 6 - 44mm Bluetooth",
        store: "Flipkart",
        price: "₹19,999",
        originalPrice: "₹32,999",
        discount: "40% OFF",
        image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80",
        rating: 4.5,
        category: "Electronics",
        link: "https://flipkart.com",
        createdAt: new Date()
    }
];

export const blogComments = [];
export const blogPosts = [];

export const autoFoundDeals = [
    {
        _id: 'auto_1',
        title: "realme GT 6T 5G (Fluid Silver, 8GB RAM, 128GB Storage) | Snapdragon 7+ Gen 3",
        store: "Amazon",
        category: "Electronics",
        imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80",
        mrp: 35999,
        dealPrice: 17999,
        discountPercent: 50,
        dealGrade: "good",
        productUrl: "https://amazon.in/dp/B0D3V7K34P",
        status: "pending",
        description: "Experience flagship performance with India's first Snapdragon 7+ Gen 3 processor, 120Hz LTPO AMOLED display, and 120W SuperVOOC charging.",
        createdAt: new Date()
    },
    {
        _id: 'auto_2',
        title: "OnePlus Nord CE4 Lite 5G (Super Canyon, 8GB RAM, 128GB Storage)",
        store: "Amazon",
        category: "Electronics",
        imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",
        mrp: 24999,
        dealPrice: 19999,
        discountPercent: 20,
        dealGrade: "medium",
        productUrl: "https://amazon.in/dp/B0D5Y7GHR2",
        status: "pending",
        description: "The OnePlus Nord CE4 Lite features a 50MP Sony LYT-600 camera, 80W SUPERVOOC fast charging, and a beautiful 120Hz AMOLED display.",
        createdAt: new Date()
    },
    {
        _id: 'auto_3',
        title: "boAt Wave Sigma Smartwatch with 2.01\" HD Display, Bluetooth Calling, 700+ Active Modes",
        store: "Flipkart",
        category: "Electronics",
        imageUrl: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
        mrp: 3499,
        dealPrice: 1299,
        discountPercent: 62,
        dealGrade: "good",
        productUrl: "https://flipkart.com/p/itmboatwave",
        status: "pending",
        description: "Smart wearable with massive 2.01-inch screen, premium metallic finish, and full health suite tracking.",
        createdAt: new Date()
    },
    {
        _id: 'auto_4',
        title: "Adidas Men's Ultrabounce Running Shoes (Core Black)",
        store: "Myntra",
        category: "Fashion",
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
        mrp: 4999,
        dealPrice: 3499,
        discountPercent: 30,
        dealGrade: "medium",
        productUrl: "https://myntra.com/adidas-ultrabounce",
        status: "pending",
        description: "Run further with these supportive Adidas running shoes, featuring lightweight bounce cushioning.",
        createdAt: new Date()
    },
    {
        _id: 'auto_5',
        title: "Philips QP2525/10 OneBlade Hybrid Trimmer & Shaver",
        store: "Nykaa",
        category: "Beauty",
        imageUrl: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=800&auto=format&fit=crop&q=80",
        mrp: 1899,
        dealPrice: 1299,
        discountPercent: 31,
        dealGrade: "medium",
        productUrl: "https://nykaa.com/philips-oneblade",
        status: "pending",
        description: "Unique OneBlade styling technology can trim, edge, and shave any length of hair with absolute safety.",
        createdAt: new Date()
    }
];
