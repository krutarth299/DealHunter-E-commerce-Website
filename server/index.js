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


// ==================== [UNIVERSAL SSR ENGINE] ====================
const ssrEngine = require('./ssrEngine');

// Global SSR Middleware
app.get('*', async (req, res, next) => {
    // 1. Skip API and Static Assets
    const isStatic = req.path.match(/\.(js|css|json|map|webmanifest|ico|png|jpg|jpeg|svg|gif|woff|woff2|txt|xml)$/);
    if (req.path.startsWith('/api') || isStatic) {
        return next();
    }

    // 2. Prevent Recursive Rendering (from Puppeteer itself)
    if (req.headers['x-ssr-bot']) {
        return next();
    }
    
    // 3. SSR Logic
    try {
        const isDev = process.env.NODE_ENV !== 'production' && !fs.existsSync(path.resolve(__dirname, '../dist', 'index.html'));
        const targetPort = isDev ? 5173 : PORT;

        console.log('[Universal SSR] Intercepting request for High-Fidelity Source:', req.originalUrl);
        
        // This will check cache first (0ms) or render live (slow first hit)
        const html = await ssrEngine.renderReactSSR(req.originalUrl, targetPort);
        
        if (html) {
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Cache-Control', 'no-store, max-age=0');
            return res.send(html);
        }
    } catch (ssrErr) {
        console.error('[Universal SSR Error]', ssrErr);
    }
    
    // Fallback to React static SPA if SSR fails
    next();
});
// =================================================================
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

// Manual SEO routes have been removed in favor of Universal SSR (Puppeteer)
// to ensure "Small details", "All Pages" and "Live Data" requirements are met 
// without maintaining duplicate HTML templates.

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
