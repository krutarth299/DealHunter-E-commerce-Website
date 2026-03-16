const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// HTML Components that match the React UI
const navbarHtml = `
<div class="hidden sm:flex bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2.5 items-center justify-center gap-4 border-b border-white/5 relative z-[60]">
    <span class="flex items-center gap-1.5 opacity-60">Limited Time Offer</span>
    <span class="w-1 h-1 rounded-full bg-slate-700"></span>
    <a href="#" class="flex items-center gap-2 hover:text-orange-400"><span class="bg-orange-600 text-[8px] px-1.5 py-0.5 rounded leading-none mr-1">NEW</span>Join our Telegram for Instant Deal Alerts</a>
    <span class="w-1 h-1 rounded-full bg-slate-700"></span>
    <span class="opacity-60 flex items-center gap-1.5">100% Verified Deals</span>
</div>
<nav class="bg-white/70 backdrop-blur-2xl border-b border-slate-100 h-20 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div class="flex items-center gap-8">
            <a href="/" class="flex items-center gap-3">
                <img src="/logo.png" class="h-12 w-auto object-contain" alt="DealOrbit" />
                <div class="flex flex-col">
                    <span class="text-2xl font-black tracking-tighter"><span class="text-[#1E3A8A]">Deal</span><span class="text-[#F97316]">Orbit</span></span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Smart Deals Everyday</span>
                </div>
            </a>
            <div class="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-widest text-slate-500">
                <a href="/" class="hover:text-orange-500">Hot Deals</a>
                <a href="/deals" class="hover:text-orange-500">All Deals</a>
                <a href="/stores" class="hover:text-orange-500">Stores</a>
                <a href="/blog" class="hover:text-orange-500">Blog</a>
            </div>
        </div>
        <div class="flex items-center gap-4">
            <a href="/admin/dashboard" class="px-6 h-11 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center shadow-lg shadow-orange-500/20">Admin Panel</a>
        </div>
    </div>
</nav>
`;

const footerHtml = `
<footer class="bg-slate-900 text-slate-300 py-20 border-t border-slate-800">
    <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-white/5 pb-12">
            <div class="col-span-1 md:col-span-1">
                <h3 class="text-2xl font-black text-white tracking-tighter mb-6">DealOrbit</h3>
                <p class="text-sm text-slate-400 leading-relaxed">India's #1 affiliate deals platform. Discover the best offers, coupons, and cashback across 100+ top stores.</p>
            </div>
            <div>
                <h4 class="text-white font-black text-xs uppercase tracking-widest mb-6">Explore</h4>
                <ul class="space-y-3 text-sm font-bold">
                    <li><a href="/" class="hover:text-orange-500">Hot Deals</a></li>
                    <li><a href="/deals" class="hover:text-orange-500">All Deals</a></li>
                    <li><a href="/stores" class="hover:text-orange-500">Stores</a></li>
                    <li><a href="/blog" class="hover:text-orange-500">Blog</a></li>
                </ul>
            </div>
            <div>
                <h4 class="text-white font-black text-xs uppercase tracking-widest mb-6">Categories</h4>
                <ul class="space-y-3 text-sm font-bold">
                    <li><a href="/deals?category=Electronics" class="hover:text-orange-500">Electronics</a></li>
                    <li><a href="/deals?category=Fashion" class="hover:text-orange-500">Fashion</a></li>
                    <li><a href="/deals?category=Grocery" class="hover:text-orange-500">Grocery</a></li>
                    <li><a href="/deals?category=Gaming" class="hover:text-orange-500">Gaming</a></li>
                </ul>
            </div>
            <div>
                <h4 class="text-white font-black text-xs uppercase tracking-widest mb-6">Contact</h4>
                <p class="text-sm">support@dealorbit.com</p>
                <p class="text-xs text-slate-500 mt-4 leading-relaxed">Embassy Tech Village, Bengaluru, India</p>
            </div>
        </div>
        <div class="text-[10px] font-black uppercase tracking-widest text-slate-500 flex justify-between">
            <p>&copy; 2026 DealOrbit. ALL RIGHTS RESERVED.</p>
            <div class="flex gap-4"><a href="#">Privacy</a><a href="#">Terms</a></div>
        </div>
    </div>
</footer>
`;

function renderDealCard(d) {
    const saveAmt = (d.originalPrice && d.price) ? parseInt(String(d.originalPrice).replace(/[^0-9]/g, '')) - parseInt(String(d.price).replace(/[^0-9]/g, '')) : 0;
    return `
    <article class="bg-white rounded-3xl border border-slate-100 overflow-hidden group shadow-sm">
        <div class="relative aspect-[4/3] bg-slate-50 flex items-center justify-center p-6">
            <span class="absolute top-4 left-4 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg">HOT</span>
            <img src="${d.image}" alt="${d.title}" class="w-full h-full object-contain mix-blend-multiply" />
        </div>
        <div class="p-5">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${d.store}</span>
                ${saveAmt > 0 ? `<span class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">SAVE ₹${saveAmt}</span>` : ''}
            </div>
            <h3 class="text-sm font-black text-slate-900 leading-tight mb-4 line-clamp-2">${d.title}</h3>
            <div class="flex items-center justify-between">
                <div>
                    <span class="text-lg font-black text-slate-900">${d.price}</span>
                    ${d.originalPrice ? `<span class="ml-2 text-xs text-slate-400 line-through">${d.originalPrice}</span>` : ''}
                </div>
                <a href="/product/${d.id || d._id}" class="h-9 px-4 bg-slate-900 text-white text-[10px] font-black rounded-xl flex items-center justify-center uppercase tracking-widest">View</a>
            </div>
        </div>
    </article>
    `;
}

const renderers = {
    '/': async (data) => {
        const deals = data.deals.slice(0, 12);
        return `
        <main class="bg-[#F8F9FA] min-h-screen">
            <!-- Hero Dummy -->
            <section class="bg-slate-900 text-white py-20 px-6 text-center overflow-hidden">
                <span class="text-orange-500 font-black text-xs uppercase tracking-widest mb-4 block">Unbeatable Deals</span>
                <h1 class="text-5xl font-black tracking-tighter mb-6">Smart Shopping <span class="text-orange-500">Starts Here.</span></h1>
                <p class="text-slate-400 max-w-xl mx-auto mb-10">Discover handpicked, 100% verified deals across 100+ top stores.</p>
            </section>

            <!-- Categories -->
            <section class="py-12 px-6 max-w-7xl mx-auto">
                <h2 class="text-2xl font-black mb-8 tracking-tighter">Shop by Category</h2>
                <div class="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-4">
                    ${['Electronics', 'Fashion', 'Mobiles', 'Home', 'Audio', 'Kitchen', 'Gaming', 'Grocery'].map(c => `
                        <div class="flex flex-col items-center gap-2">
                            <div class="w-full aspect-square bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-widest">${c.charAt(0)}</div>
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${c}</span>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- Latest Deals -->
            <section class="py-12 px-6 max-w-7xl mx-auto">
                <h2 class="text-2xl font-black mb-8 tracking-tighter">Today's Hot Picks</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${deals.map(renderDealCard).join('')}
                </div>
            </section>

            <!-- Stores Banner -->
            <section class="py-20 px-6">
                <div class="max-w-7xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white overflow-hidden relative">
                    <h2 class="text-4xl md:text-6xl font-black mb-6 tracking-tighter">Shop From The <span class="text-orange-500">World's Best.</span></h2>
                    <p class="text-slate-400 mb-10 max-w-md">We aggregate live prices and exclusive discount codes from 500+ trusted stores.</p>
                </div>
            </section>

            <!-- Why Us -->
            <section class="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
                <div class="text-center group"><div class="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 mx-auto mb-6 flex items-center justify-center font-black">1</div><h3 class="font-black mb-2">Verified Deals</h3><p class="text-sm text-slate-500">Every deal is manually reviewed.</p></div>
                <div class="text-center group"><div class="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 mx-auto mb-6 flex items-center justify-center font-black">2</div><h3 class="font-black mb-2">Real-time Watch</h3><p class="text-sm text-slate-500">Prices sync every 5 minutes.</p></div>
                <div class="text-center group"><div class="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 mx-auto mb-6 flex items-center justify-center font-black">3</div><h3 class="font-black mb-2">Best Price</h3><p class="text-sm text-slate-500">Guaranteed lowest pricing.</p></div>
            </section>
        </main>
        `;
    },
    '/deals': async (data) => {
        const deals = data.deals.slice(0, 24);
        return `
        <main class="bg-[#F8F9FA] min-h-screen py-12 px-6">
            <div class="max-w-7xl mx-auto">
                <h1 class="text-4xl font-black mb-8 tracking-tighter">All Live Deals <span class="text-slate-300">(${data.deals.length})</span></h1>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    ${deals.map(renderDealCard).join('')}
                </div>
            </div>
        </main>
        `;
    }
};

async function renderFullPage(req, apiData) {
    const url = req.path;
    const renderer = renderers[url] || renderers['/']; // Fallback to Home logic for unknown or we can make a Generic renderer
    
    let bodyHtml = await renderer(apiData);
    
    try {
        const indexFile = path.resolve(__dirname, '../dist', 'index.html');
        if (!fs.existsSync(indexFile)) return null;

        let html = fs.readFileSync(indexFile, 'utf8');
        const $ = cheerio.load(html);
        
        // Inject SEO logic could be here too, but let's focus on the body
        $('#root').html(`
            ${navbarHtml}
            ${bodyHtml}
            ${footerHtml}
        `);
        
        return $.html();
    } catch (e) {
        console.error("[Renderer] Error reading index.html:", e);
        return null;
    }
}

module.exports = { renderFullPage };
