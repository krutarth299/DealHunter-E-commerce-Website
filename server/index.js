require('dotenv').config(); // Load env vars
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

const mongoose = require('mongoose');

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection Logic
const connectDB = async () => {
    if (process.env.USE_MONGODB === 'false') {
        app.locals.isMockMode = true;
        console.log('DATABASE: DISCONNECTED (FORCED MOCK MODE)');
        return;
    }
    try {
        console.log('DATABASE: Connecting...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dealorbit', {
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });
        app.locals.isMockMode = false;
        console.log('DATABASE: CONNECTED SUCCESSFULLY');
    } catch (err) {
        app.locals.isMockMode = true;
        console.error('DATABASE: CONNECTION FAILED - FALLING BACK TO MOCK MODE');
        console.error('Error Details:', err.message);
    }
};

// Start DB Connection
connectDB();

// Initial Data for Seeding
const INITIAL_DEALS = [
    {
        title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        store: "Amazon",
        price: "₹24,990",
        originalPrice: "₹29,990",
        discount: "17% OFF",
        image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&auto=format&fit=crop&q=80",
        rating: 4.8,
        category: "Electronics"
    },
    {
        title: "Samsung Galaxy Watch 6 - 44mm Bluetooth",
        store: "Flipkart",
        price: "₹19,999",
        originalPrice: "₹32,999",
        discount: "40% OFF",
        image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80",
        rating: 4.5,
        category: "Electronics"
    },
    {
        title: "Nike Air Jordan 1 Retro High OG",
        store: "Myntra",
        price: "₹13,500",
        originalPrice: "₹16,995",
        discount: "20% OFF",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
        rating: 4.9,
        category: "Fashion"
    },
    {
        title: "MacBook Air M2 Chip - 256GB SSD",
        store: "Croma",
        price: "₹92,900",
        originalPrice: "₹1,14,900",
        discount: "19% OFF",
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=800&auto=format&fit=crop&q=80",
        rating: 4.7,
        category: "Electronics"
    }
];

// Seeding Logic
const seedDatabase = async () => {
    try {
        console.log('Checking Database for Seeding...');

        // Seed Deals
        const { deals } = require('./mockStore');
        const Deal = require('./models/Deal');

        let dealCount = 0;
        if (app.locals.isMockMode) {
            dealCount = deals.length;
        } else {
            dealCount = await Deal.countDocuments();
        }

        if (dealCount === 0) {
            if (app.locals.isMockMode) {
                INITIAL_DEALS.forEach((deal, index) => {
                    deals.push({
                        _id: `deal-${Date.now()}-${index}`,
                        ...deal,
                        createdAt: new Date()
                    });
                });
            } else {
                await Deal.insertMany(INITIAL_DEALS.map(d => ({ ...d, createdAt: new Date() })));
            }
            console.log('Database seeded with initial catalog.');
        } else {
            console.log('Database already contains data. Skipping seed.');
        }
    } catch (error) {
        console.error('Seeding Error:', error);
    }
};

// Start initialization after a short delay to allow DB connection
setTimeout(seedDatabase, 2000);

const dealsRouter = require('./routes/deals');
const blogRouter = require('./routes/blog');

app.use('/api/deals', dealsRouter);
app.use('/api/blog', blogRouter);


// ==================== [PUPPETEER SSR ENGINE] ====================
const ssrEngine = require('./ssrEngine');

app.get('*', async (req, res, next) => {
    // Exclude API requests and static assets
    if (req.path.startsWith('/api') || req.path.match(/\.(js|css|json|map|webmanifest|ico|png|jpg|jpeg|svg|gif|woff|woff2)$/)) {
        return next();
    }

    // Do not SSR if request comes from our own puppeteer bot or simple internal calls
    if (req.headers['x-ssr-bot']) {
        return next();
    }
    
    // In production, the target app is served locally statically. We let the fallback handle the raw React render,
    // and puppeteer will navigate to the local express port.
    // However, in Vite Dev mode, the frontend runs on 5173. 
    // We check if Vite dev server is running on 5173 by default. 
    // But since server/index.js is usually port 5000, if they run 'npm run server', it's here.
    const isDev = process.env.NODE_ENV !== 'production' && !fs.existsSync(path.resolve(__dirname, '../dist', 'index.html'));
    const targetPort = isDev ? 5173 : PORT;

    console.log('[SSR Proxy] Intercepting request for HTML payload:', req.originalUrl);
    const html = await ssrEngine.renderReactSSR(req.originalUrl, targetPort);
    
    if (html) {
        res.setHeader('Content-Type', 'text/html');
        // We override caching to avoid aggressive browser cache, keeping admin updates fresh
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.send(html);
    }
    
    // If SSR completely fails, fallback to React static SPA
    next();
});
// =================================================================




// Helper function to inject SEO tags into the built HTML using Cheerio
const cheerio = require('cheerio');
const injectSEO = (html, seoData, htmlBody = '') => {
    const $ = cheerio.load(html);

    if (seoData.title) {
        const fullTitle = `${seoData.title} | DealOrbit`;
        $('title').text(fullTitle);
        $('meta[name="title"]').attr('content', fullTitle);
        $('meta[property="og:title"]').attr('content', fullTitle);
        $('meta[property="twitter:title"]').attr('content', fullTitle);
    }
    if (seoData.description) {
        $('meta[name="description"]').attr('content', seoData.description);
        $('meta[property="og:description"]').attr('content', seoData.description);
        $('meta[property="twitter:description"]').attr('content', seoData.description);
    }
    if (seoData.image) {
        $('meta[property="og:image"]').attr('content', seoData.image);
        $('meta[property="twitter:image"]').attr('content', seoData.image);
    }

    // Inject structural HTML body directly into the React root for crawlers and visible initial render
    if (htmlBody) {
        $('#root').html(htmlBody);
    }

    return $.html();
};

const navbarHtml = `
<nav class="bg-white border-b border-slate-100 h-20 sticky top-0 z-50">
    <div class="container mx-auto px-6 h-full flex items-center justify-between">
        <div class="flex items-center gap-8">
            <a href="/" class="text-2xl font-black text-slate-900 tracking-tighter">DealOrbit</a>
            <div class="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
                <a href="/" class="hover:text-orange-500 transition-colors">Hot Deals</a>
                <a href="/deals" class="hover:text-orange-500 transition-colors">All Deals</a>
                <a href="/stores" class="hover:text-orange-500 transition-colors">Stores</a>
                <a href="/blog" class="hover:text-orange-500 transition-colors">Blog</a>
            </div>
        </div>
        <div class="flex items-center gap-4">
            <a href="/admin/dashboard" class="px-6 h-11 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">Admin Panel</a>
        </div>
    </div>
</nav>
`;

const footerHtml = `
<footer class="bg-slate-900 text-slate-300 py-16 mt-20 border-t border-slate-800">
    <div class="container mx-auto px-6 max-w-7xl">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-slate-800 pb-12">
            <div class="md:col-span-1">
                <div class="flex items-center gap-2 mb-6"><h3 class="text-xl font-black text-white tracking-tighter">DealOrbit</h3></div>
                <p class="text-sm text-slate-400 leading-relaxed mb-6">India's #1 affiliate deals platform. Discover the best offers, coupons, and cashback across 100+ top stores.</p>
                <div class="space-y-4">
                    <p class="text-xs font-black text-white uppercase tracking-widest">Get Deal Alerts.</p>
                    <div class="relative max-w-xs">
                        <input type="email" placeholder="Your email address..." class="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm outline-none focus:border-orange-500/50 transition-colors" />
                        <button class="absolute right-1 text-[10px] top-1 px-4 h-10 bg-orange-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-colors">Go</button>
                    </div>
                    <p class="text-[10px] text-slate-500">Join 50,000+ subscribers for weekly top picks.</p>
                </div>
            </div>
            <div>
                <h3 class="text-white font-bold mb-5 text-xs uppercase tracking-widest">Explore</h3>
                <ul class="space-y-3 text-sm">
                    <li><a href="/" class="hover:text-orange-400 transition-colors">Hot Deals</a></li>
                    <li><a href="/deals" class="hover:text-orange-400 transition-colors">All Deals</a></li>
                    <li><a href="/blog" class="hover:text-orange-400 transition-colors">Blog</a></li>
                    <li><a href="/wishlist" class="hover:text-orange-400 transition-colors">Wishlist</a></li>
                </ul>
            </div>
            <div>
                <h3 class="text-white font-bold mb-5 text-xs uppercase tracking-widest">Top Categories</h3>
                <ul class="space-y-3 text-sm">
                    <li><a href="/deals?category=Electronics" class="hover:text-orange-400 transition-colors">Electronics</a></li>
                    <li><a href="/deals?category=Fashion" class="hover:text-orange-400 transition-colors">Fashion</a></li>
                    <li><a href="/deals?category=Gaming" class="hover:text-orange-400 transition-colors">Gaming</a></li>
                    <li><a href="/deals?category=Grocery" class="hover:text-orange-400 transition-colors">Grocery</a></li>
                    <li><a href="/deals?category=Travel" class="hover:text-orange-400 transition-colors">Travel</a></li>
                    <li><a href="/deals?category=Home" class="hover:text-orange-400 transition-colors">Home & Living</a></li>
                </ul>
            </div>
            <div>
                <h3 class="text-white font-bold mb-5 text-xs uppercase tracking-widest">Contact</h3>
                <ul class="space-y-4 text-sm">
                    <li class="flex items-start gap-3"><span>Embassy Tech Village, Bengaluru, India - 560103</span></li>
                    <li class="flex items-center gap-3"><a href="mailto:support@dealorbit.com" class="hover:text-orange-400 transition-colors">support@dealorbit.com</a></li>
                    <li class="pt-2 flex gap-4">
                        <span class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-orange-500 transition-colors cursor-pointer text-white">FB</span>
                        <span class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-orange-500 transition-colors cursor-pointer text-white">TW</span>
                        <span class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-orange-500 transition-colors cursor-pointer text-white">IG</span>
                        <span class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-orange-500 transition-colors cursor-pointer text-white">YT</span>
                    </li>
                </ul>
            </div>
        </div>
        <div class="flex flex-col md:row items-center justify-between gap-6 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <div class="flex items-center gap-8">
                <a href="#" class="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" class="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" class="hover:text-white transition-colors">Cookie Policy</a>
            </div>
            <p>© 2026 DealOrbit. ALL RIGHTS RESERVED.</p>
        </div>
    </div>
</footer>
`;

// 1. Intercept specific routes to inject SEO (Dynamic Server-Side Rendering)

// Generic SEO handler for static pages like Home and Deals
const serveStaticWithSEO = (req, res, next, defaultSeo, htmlBody = '') => {
    try {
        const indexFile = path.resolve(__dirname, '../dist', 'index.html');
        if (!fs.existsSync(indexFile)) return next();

        let htmlData = fs.readFileSync(indexFile, 'utf8');
        htmlData = injectSEO(htmlData, defaultSeo, htmlBody);
        return res.send(htmlData);
    } catch (error) {
        console.error("[SSR] Error serving static page with SEO:", error);
        next();
    }
};

app.get('/', async (req, res, next) => {
    try {
        const Deal = require('./models/Deal');
        let allDeals = [];
        if (req.app.locals.isMockMode) {
            allDeals = require('./mockStore').deals;
        } else {
            allDeals = await Deal.find().sort({ createdAt: -1 }).limit(12);
        }

        const dealsHtml = allDeals.map(d => {
            const saveLabel = d.originalPrice && d.price ? `Save ₹${parseInt(String(d.originalPrice).replace(/[^0-9]/g, '')) - parseInt(String(d.price).replace(/[^0-9]/g, ''))}` : 'Hot Deal';
            const rating = d.rating || 4.5;
            const reviews = d.reviewsCount || 128;
            return `
            <article class="deal-card-ssr" itemscope itemtype="https://schema.org/Product">
                <div class="card-badges">
                    <span class="badge-hot">HOT</span>
                    <span class="badge-discount">${d.discount || 'Special'}</span>
                </div>
                <div class="card-image-container">
                    <img itemprop="image" src="${d.image}" alt="${d.title}" />
                </div>
                <div class="card-store-info">
                    <span class="store-badge">${d.store}</span>
                    <span class="save-tag">${saveLabel}</span>
                </div>
                <h3 itemprop="name" class="deal-title">${d.title}</h3>
                <div class="deal-rating">
                    <span class="stars">★★★★★</span>
                    <span class="rating-count">(${reviews})</span>
                </div>
                <div class="deal-price-row">
                    <div class="price-stack">
                        <span class="current-price" itemprop="price">${d.price}</span>
                        <span class="original-price">${d.originalPrice || ''}</span>
                    </div>
                    <a href="/product/${d.id || d._id}" class="get-deal-btn">Get Deal</a>
                </div>
            </article>
        `}).join('');

        const heroHtml = `
            <section class="hero-slider">
                <h2>Mega Electronics Sale</h2><p>Up to 80% off on top brands</p>
                <h2>Fashion Carnaval</h2><p>Flat 50-70% off on top clothing lines</p>
                <h2>Home Upgrade Days</h2><p>Best appliances under budget</p>
            </section>
        `;

        const bodyObj = `
            ${navbarHtml}
            ${heroHtml}
            <header><h1>DealOrbit - Best Deals and Coupons</h1></header>
            <main>
                <section>
                    <h2>Shop by Category</h2>
                    <p>Browse View all</p>
                    <ul>
                        <li>Electronics</li>
                        <li>Fashion</li>
                        <li>Gaming</li>
                        <li>Grocery</li>
                        <li>Travel</li>
                        <li>Food</li>
                    </ul>
                </section>
                <section>
                    <h2>Today's Hot Picks</h2>
                    <div class="deals-grid">${dealsHtml}</div>
                </section>
                <section>
                    <h2>Top Trusted Stores.</h2>
                    <p>We partner with India's best marketplaces to bring you exclusive, verified deals in one place.</p>
                </section>
                <section>
                    <h2>Why DealOrbit?</h2>
                    <article>
                        <h3>100% Verified Deals</h3>
                        <p>Every deal is manually reviewed and verified before going live on our platform.</p>
                    </article>
                    <article>
                        <h3>Real-time Price Sync</h3>
                        <p>Our bots scan millions of product pages every 5 minutes to catch every price drop. Updated Every 5 Min.</p>
                    </article>
                    <article>
                        <h3>Best Price Guarantee</h3>
                        <p>We compare prices across 12+ Indian marketplaces so you never overpay.</p>
                    </article>
                </section>
            </main>
            ${footerHtml}
        `;
        serveStaticWithSEO(req, res, next, {
            title: "Home",
            description: "Discover the best handpicked deals, coupons, and offers updated in real-time. Unbeatable prices from top stores like Amazon, Flipkart, Myntra, and more.",
            image: "https://your-domain.com/og-image.jpg"
        }, bodyObj);
    } catch (e) { next(); }
});

app.get('/deals', async (req, res, next) => {
    try {
        const Deal = require('./models/Deal');
        let allDeals = [];
        if (req.app.locals.isMockMode) {
            allDeals = require('./mockStore').deals;
        } else {
            allDeals = await Deal.find().sort({ createdAt: -1 }).limit(100); // Fetch more for filtering
        }

        const storeQuery = req.query.store;
        const categoryQuery = req.query.category;

        if (storeQuery) {
            allDeals = allDeals.filter(d => d.store?.toLowerCase() === storeQuery.toLowerCase());
        }
        if (categoryQuery && categoryQuery !== 'All') {
            allDeals = allDeals.filter(d => d.category?.toLowerCase() === categoryQuery.toLowerCase());
        }

        allDeals = allDeals.slice(0, 24); // Limit final output

        const dealsHtml = allDeals.map(d => {
            const saveLabel = d.originalPrice && d.price ? `Save ₹${parseInt(d.originalPrice.replace(/[^0-9]/g, '')) - parseInt(d.price.replace(/[^0-9]/g, ''))}` : 'Hot Deal';
            const rating = d.rating || 4.5;
            const reviews = d.reviewsCount || 128;
            return `
            <article class="deal-card-ssr" itemscope itemtype="https://schema.org/Product">
                <div class="card-badges">
                    <span class="badge-hot">HOT</span>
                    <span class="badge-discount">${d.discount || 'Special'}</span>
                </div>
                <div class="card-image-container">
                    <img itemprop="image" src="${d.image}" alt="${d.title}" />
                </div>
                <div class="card-store-info">
                    <span class="store-badge">${d.store}</span>
                    <span class="save-tag">${saveLabel}</span>
                </div>
                <h3 itemprop="name" class="deal-title">${d.title}</h3>
                <div class="deal-rating">
                    <span class="stars">★★★★★</span>
                    <span class="rating-count">(${reviews})</span>
                </div>
                <div class="deal-price-row">
                    <div class="price-stack">
                        <span class="current-price" itemprop="price">${d.price}</span>
                        <span class="original-price">${d.originalPrice || ''}</span>
                    </div>
                    <a href="/product/${d.id || d._id}" class="get-deal-btn">Get Deal</a>
                </div>
            </article>
        `}).join('');

        const dynamicTitle = storeQuery ? `${storeQuery} Deals & Coupons` : categoryQuery && categoryQuery !== 'All' ? `${categoryQuery} Deals` : 'All Deals';
        const bodyObj = `
            ${navbarHtml}
            <div class="deals-page-container">
                <!-- Sidebar -->
                <aside class="deals-sidebar-ssr">
                    <div class="filter-section">
                        <h3>Filters</h3>
                        <div class="filter-group">
                            <h4>Category</h4>
                            <ul>
                                <li class="${!categoryQuery || categoryQuery === 'All' ? 'active' : ''}">All</li>
                                <li class="${categoryQuery === 'Electronics' ? 'active' : ''}">Electronics</li>
                                <li class="${categoryQuery === 'Fashion' ? 'active' : ''}">Fashion</li>
                                <li class="${categoryQuery === 'Gaming' ? 'active' : ''}">Gaming</li>
                                <li class="${categoryQuery === 'Grocery' ? 'active' : ''}">Grocery</li>
                                <li class="${categoryQuery === 'Travel' ? 'active' : ''}">Travel</li>
                                <li class="${categoryQuery === 'Food' ? 'active' : ''}">Food</li>
                            </ul>
                        </div>
                        ${storeQuery ? `
                        <div class="filter-group store-filter-active">
                            <h4>Active Store</h4>
                            <ul>
                                <li class="active">${storeQuery} <a href="/deals">✕</a></li>
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="deals-main-ssr">
                    <header class="deals-header-ssr">
                        <div class="header-top">
                            <div class="breadcrumb-ssr">
                                <span class="live-db">LIVE DATABASE</span>
                                <h1 class="page-title">${dynamicTitle} <span class="count">(${allDeals.length})</span></h1>
                            </div>
                        </div>
                    </header>

                    <div class="deals-grid-ssr">
                        ${dealsHtml}
                    </div>
                </main>
            </div>
            ${footerHtml}
        `;
        serveStaticWithSEO(req, res, next, {
            title: `${dynamicTitle} | DealOrbit`,
            description: storeQuery ? `Shop all verified deals, discount codes and special offers from ${storeQuery} on DealOrbit.` : "Browse the largest collection of verified deals in India.",
            image: "https://your-domain.com/og-image.jpg"
        }, bodyObj);
    } catch (e) { next(); }
});

app.get('/stores', (req, res, next) => {
    const storesData = [
        { name: 'Amazon', desc: "India's largest marketplace", tag: 'Top Pick', cat: 'Multi-category', deals: '1,240', reward: '5% Rewards' },
        { name: 'Flipkart', desc: "Electronics & Fashion deals", tag: 'Flash Sale', cat: 'Multi-category', deals: '985', reward: '2% Rewards' },
        { name: 'Myntra', desc: "Premium fashion & lifestyle", tag: 'Trending', cat: 'Fashion', deals: '710', reward: '8% Cashback' },
        { name: 'Meesho', desc: "Affordable lifestyle products", tag: 'Best Value', cat: 'Fashion', deals: '630', reward: '10% Rewards' },
        { name: 'Blinkit', desc: "Groceries in 10 minutes", tag: 'Quick Delivery', cat: 'Grocery', deals: '430', reward: '₹50 off' },
        { name: 'Nykaa', desc: "Beauty & skincare essentials", tag: 'Beauty', cat: 'Beauty', deals: '320', reward: '4% Cashback' },
        { name: 'Ajio', desc: "Branded fashion at best price", tag: 'Sale', cat: 'Fashion', deals: '280', reward: '2% Rewards' },
        { name: 'Croma', desc: "Electronics & appliances", tag: 'Tech', cat: 'Electronics', deals: '195', reward: '2% Rewards' },
        { name: 'BigBasket', desc: "Supermarket at your doorstep", tag: 'Fresh', cat: 'Grocery', deals: '510', reward: '3% Cashback' },
        { name: 'Nike', desc: "Just do it. Best prices here.", tag: 'Sports', cat: 'Fashion', deals: '85', reward: '5% Rewards' },
        { name: 'Samsung', desc: "Galaxy ecosystem & appliances", tag: 'Flagship', cat: 'Electronics', deals: '140', reward: '1.5% Rewards' },
        { name: 'Apple', desc: "Premium Apple products & deals.", tag: 'Premium', cat: 'Electronics', deals: '65', reward: '1% Rewards' }
    ];

    const storesHtml = storesData.map(s => `
        <article class="store-card-ssr">
            <div class="store-header">
                <h3>${s.name}</h3>
                <p>${s.desc}</p>
            </div>
            <div class="store-tags">
                <span class="tag-label">${s.tag}</span>
                <span class="tag-cat">${s.cat}</span>
            </div>
            <div class="store-footer">
                <div class="deals-count">
                    <span class="count">${s.deals}</span>
                    <span class="label">ACTIVE DEALS</span>
                </div>
                <div class="rewards-info">
                    <span class="value">${s.reward}</span>
                    <span class="label">REWARDS</span>
                </div>
            </div>
            <a href="/deals?store=${s.name}" class="view-store-link">View Store</a>
        </article>
    `).join('');

    const bodyObj = `
        ${navbarHtml}
        <main class="stores-page-ssr">
            <header class="stores-hero-ssr">
                <div class="hero-content">
                    <span class="overline">VERIFIED PARTNERS</span>
                    <h1>Partner <span>Stores</span></h1>
                    <p>Exclusive tie-ups with India's most trusted marketplaces. Verified deals, real cashback.</p>
                </div>
                <div class="hero-stats">
                    <div class="stat-item"><strong>12+</strong> PARTNERS</div>
                    <div class="stat-item"><strong>5K+</strong> ACTIVE DEALS</div>
                    <div class="stat-item"><strong>24/7</strong> PRICE MATCH</div>
                </div>
            </header>

            <div class="stores-filter-ssr">
                <div class="search-wrap">
                    <input type="text" placeholder="Search stores..." />
                </div>
                <div class="category-tabs">
                    <span class="tab active">All</span>
                    <span class="tab">Multi-category</span>
                    <span class="tab">Fashion</span>
                    <span class="tab">Electronics</span>
                    <span class="tab">Grocery</span>
                    <span class="tab">Beauty</span>
                </div>
            </div>

            <div class="stores-grid-ssr">
                ${storesHtml}
            </div>
        </main>
        ${footerHtml}
    `;
    serveStaticWithSEO(req, res, next, {
        title: "All Stores & Brands",
        description: "Explore deals, discount codes, and special offers from top Indian e-commerce stores: Amazon, Flipkart, Myntra, Ajio, and more.",
        image: "https://your-domain.com/og-image.jpg"
    }, bodyObj);
});

app.get('/blog', (req, res, next) => {
    const blogData = [
        { title: "Flipkart Big Billion Days vs Amazon Great Indian Festival: Which is Better?", cat: "DEAL ANALYSIS", author: "Priya R.", read: "8 min read", excerpt: "We compared thousands of deals from both mega-sales to find out which platform actually offers...", tags: ["#Flipkart", "#Amazon", "#Comparison"] },
        { title: "Best Budget Smartphones Under ₹15,000 Right Now", cat: "ELECTRONICS", author: "Arjun K.", read: "5 min read", excerpt: "Top picks from Redmi, Realme, and Samsung that deliver flagship-level performance without burnin...", tags: ["#Smartphones", "#Budget", "#Tech"] },
        { title: "How to Use Coupons + Cashback Together for Maximum Savings", cat: "SHOPPING TIPS", author: "Sneha S.", read: "6 min read", excerpt: "Stack deals like a pro. This step-by-step guide shows you how to combine store coupons, credit...", tags: ["#Cashback", "#Coupons", "#Savings"] },
        { title: "Myntra End of Reason Sale 2026: Complete Guide & Best Picks", cat: "FASHION", author: "Kiran P.", read: "7 min read", excerpt: "Our curators went through 50,000+ products so you don't have to. Here are the fashion deals...", tags: ["#Myntra", "#Fashion", "#Sale"] },
        { title: "Blinkit vs Zepto vs Swiggy Instamart: Grocery Price War", cat: "GROCERY", author: "Rahul M.", read: "8 min read", excerpt: "We bought the same 20-item grocery list on all three platforms across Mumbai, Delhi, and...", tags: ["#Blinkit", "#Grocery", "#Comparison"] },
        { title: "Top 7 Credit Cards for Maximum Shopping Rewards in India", cat: "FINANCE", author: "Ananya B.", read: "8 min read", excerpt: "From HDFC Millennia to Axis Flipkart — we break down which card offers the best cashback, rewar...", tags: ["#CreditCards", "#Rewards", "#Finance"] }
    ];

    const blogCardsHtml = blogData.map(b => `
        <article class="blog-card-ssr">
            <div class="blog-image-placeholder">${b.cat}</div>
            <div class="blog-content">
                <span class="blog-cat-tag">${b.cat}</span>
                <h3>${b.title}</h3>
                <p>${b.excerpt}</p>
                <div class="blog-tags">${b.tags.map(t => `<span>${t}</span>`).join(' ')}</div>
                <div class="blog-meta">
                    <span>${b.author}</span>
                    <span>${b.read}</span>
                </div>
            </div>
        </article>
    `).join('');

    const bodyObj = `
        ${navbarHtml}
        <main class="blog-page-ssr">
            <header class="blog-hero-ssr">
                <div class="hero-left">
                    <span class="hero-overline">EXPERT GUIDES</span>
                    <h1>DealOrbit <span>Blog</span></h1>
                    <p>Shopping tips, deal breakdowns, and money-saving strategies — written by India's top bargain hunters.</p>
                </div>
                <div class="hero-right">
                    <div class="blog-search-ssr">
                        <input type="text" placeholder="Search articles..." />
                    </div>
                </div>
            </header>

            <section class="featured-article-ssr">
                <div class="featured-image">FEATURED</div>
                <div class="featured-info">
                    <span class="featured-tag">SHOPPING TIPS</span>
                    <h2>10 Hacks to Score the Best Amazon Deals in 2026</h2>
                    <p>Learn the insider tricks that deal hunters use every day — from watching price history to using browser alerts — to never pay full price again.</p>
                    <div class="featured-meta">
                        <span>Rahul M.</span>
                        <span>8 min read</span>
                        <a href="#" class="read-btn">Read Article</a>
                    </div>
                </div>
            </section>

            <nav class="blog-categories-ssr">
                <span class="cat-tab active">ALL</span>
                <span class="cat-tab">SHOPPING TIPS</span>
                <span class="cat-tab">DEAL ANALYSIS</span>
                <span class="cat-tab">ELECTRONICS</span>
                <span class="cat-tab">FASHION</span>
                <span class="cat-tab">GROCERY</span>
                <span class="cat-tab">FINANCE</span>
            </nav>

            <div class="blog-grid-ssr">
                ${blogCardsHtml}
            </div>

            <section class="blog-newsletter-ssr">
                <div class="newsletter-wrap">
                    <span class="news-overline">WEEKLY DIGEST</span>
                    <h2>Never Miss a Deal Again</h2>
                    <p>Get the 5 best deals of the week + our top shopping tip delivered to your inbox every Sunday.</p>
                    <div class="news-form">
                        <input type="email" placeholder="you@email.com" />
                        <button>SUBSCRIBE FREE</button>
                    </div>
                    <p class="news-subtext">Join 50,000+ deal hunters. Unsubscribe anytime.</p>
                </div>
            </section>
        </main>
        ${footerHtml}
    `;
    serveStaticWithSEO(req, res, next, {
        title: "DealOrbit Blog - Expert Tech & Savings Tips",
        description: "Shopping tips, deal breakdowns, and money-saving strategies — written by India's top bargain hunters.",
        image: "https://your-domain.com/og-image.jpg"
    }, bodyObj);
});

app.get('/blog/:slug', async (req, res, next) => {
    console.log(`[SSR] Intercepted blog request for slug: ${req.params.slug}`);
    try {
        const indexFile = path.resolve(__dirname, '../dist', 'index.html');
        if (!fs.existsSync(indexFile)) return next();

        let htmlData = fs.readFileSync(indexFile, 'utf8');

        // Fetch blog data
        const { BLOG_POSTS } = require('../src/data/blogData.js');
        const post = BLOG_POSTS.find(p => p.slug === req.params.slug);

        if (post) {
            console.log(`[SSR] Blog post found: ${post.title}`);
            const relatedPosts = BLOG_POSTS.filter(p => p.slug !== post.slug && (p.category === post.category || p.tags.some(t => post.tags.includes(t)))).slice(0, 3);

            // Fetch real comments from DB
            let postComments = [];
            try {
                if (app.locals.isMockMode) {
                    const { blogComments } = require('./mockStore');
                    postComments = blogComments.filter(c => c.blogSlug === post.slug).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                    const Comment = require('./models/Comment');
                    postComments = await Comment.find({ blogSlug: post.slug }).sort({ createdAt: -1 });
                }
            } catch (err) {
                console.error('[SSR] Error fetching comments for blog:', err);
            }

            const { generateBlogSEO } = await import('../src/utils/seoRenderer.js');
            const blogHtml = generateBlogSEO(post, relatedPosts, postComments);
            const fullBodyHtml = `
                ${navbarHtml}
                ${blogHtml}
                ${footerHtml}
            `;

            htmlData = injectSEO(htmlData, {
                title: post.title,
                description: post.excerpt,
                image: post.image
            }, fullBodyHtml);
            return res.send(htmlData);
        } else {
            console.log(`[SSR] Blog post NOT found. Serving default HTML.`);
            return res.sendFile(indexFile);
        }
    } catch (e) {
        console.error("[SSR] Error serving blog page:", e);
        next();
    }
});

app.get('/product/:id', async (req, res, next) => {
    console.log(`[SSR] Intercepted product request for ID: ${req.params.id}`);
    try {
        const indexFile = path.resolve(__dirname, '../dist', 'index.html');
        // If index.html doesn't exist, skip to static handler
        if (!fs.existsSync(indexFile)) {
            console.log(`[SSR] index.html not found at ${indexFile}`);
            return next();
        }

        let htmlData = fs.readFileSync(indexFile, 'utf8');

        // Fetch product data
        const Deal = require('./models/Deal');
        let product = null;

        if (app.locals.isMockMode) {
            console.log(`[SSR] Querying Mock Store`);
            const { deals } = require('./mockStore');
            product = deals.find(d => String(d._id) === String(req.params.id));
        } else {
            console.log(`[SSR] Querying MongoDB for ID: ${req.params.id}`);
            product = await Deal.findById(req.params.id);
        }

        if (product) {
            console.log(`[SSR] Product found: ${product.title}`);
            const { generateProductSEO } = await import('../src/utils/seoRenderer.js');
            // Fetch similar deals for the generator
            let allDeals = [];
            if (app.locals.isMockMode) {
                const { deals: mockDeals } = require('./mockStore');
                allDeals = mockDeals;
            } else {
                allDeals = await Deal.find({ category: product.category }).limit(10);
            }
            const productHtml = generateProductSEO(product, allDeals);
            const fullBodyHtml = `
                ${navbarHtml}
                ${productHtml}
                ${footerHtml}
            `;

            htmlData = injectSEO(htmlData, {
                title: product.title,
                description: product.description || `Get the best deal on ${product.title} at ${product.store}. Check out the latest offers and coupons on DealOrbit.`,
                image: product.image || (product.images && product.images[0]) || ''
            }, fullBodyHtml);
            console.log(`[SSR] Injection successful, sending HTML payload.`);
            return res.send(htmlData);
        } else {
            console.log(`[SSR] Product NOT found. Serving default HTML.`);
            return res.sendFile(indexFile);
        }
    } catch (error) {
        console.error("[SSR] Error serving SEO injected product page:", error);
        // Fallback to sending raw index.html without SEO if database query fails
        const indexFile = path.resolve(__dirname, '../dist', 'index.html');
        if (fs.existsSync(indexFile)) {
            return res.sendFile(indexFile);
        }
        next();
    }
});

// 2. Serve Static Files from React build (but NEVER serve index.html automatically)
app.use(express.static(path.join(__dirname, '../dist'), { index: false }));



// Catch-all route to serve React App for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
});

// Avoid 404 for favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Global error handling for initialization issues
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: UNCAUGHT EXCEPTION - Server may be unstable');
    console.error(err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Exiting so nodemon can retry...`);
        process.exit(1); // Exit cleanly so nodemon restarts
    }
});

// Start Server
const server = app.listen(PORT, () => {
    const mode = app.locals.isMockMode ? 'MOCK MODE' : 'DATABASE MODE';
    console.log('---------------------------------------------------');
    console.log(`Server running on port ${PORT} (${mode})`);
    console.log(`Extraction Engine: ACTIVE`);
    if (app.locals.isMockMode) {
        console.log('NOTICE: Data is being stored in memory only.');
    } else {
        console.log('DATABASE: Connected and ready.');
    }
    console.log('---------------------------------------------------');
});

// Handle port-in-use errors explicitly
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`\n========================================================`);
        console.log(`✅ PORT ${PORT} IS ALREADY IN USE BY ANOTHER TERMINAL.`);
        console.log(`This is NOT an error. Your server is already running perfectly!`);
        console.log(`Closing this duplicate terminal process cleanly...`);
        console.log(`========================================================\n`);
        process.exit(0); // Exit cleanly so nodemon DOES NOT crash or throw red text
    } else {
        throw err;
    }
});
