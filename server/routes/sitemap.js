import express from 'express';
import Deal from '../models/Deal.js';
import Blog from '../models/Blog.js';
import { slugifyProductTitle } from '../../src/utils/productUrls.js';
import { couponsEnabled } from '../config/features.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const DEFAULT_SITE_ORIGIN = 'https://dealsphere.com';
const SITEMAP_CACHE_TTL_MS = Math.max(0, Number(process.env.SITEMAP_CACHE_TTL_MS || 5 * 60 * 1000));
const SITEMAP_CACHE_CONTROL = process.env.SITEMAP_CACHE_CONTROL || 'public, max-age=300, stale-while-revalidate=3600';
const SITEMAP_PAGE_SIZE = Math.min(50000, Math.max(1, Number(process.env.SITEMAP_PAGE_SIZE || 50000)));

const sitemapCache = new Map();

export const clearSitemapCache = () => {
    sitemapCache.clear();
};

export const triggerSitemapUpdate = () => {
    // Clear in-memory cache instantly
    clearSitemapCache();
    
    // Spawn background process to update manual links JSON
    const scriptPath = path.resolve(__dirname, '../generate-manual-sitemap.js');
    exec(`node "${scriptPath}"`, { env: process.env }, (error, stdout, stderr) => {
        if (error) {
            console.error('[SITEMAP_UPDATE] Failed to run automated sitemap script:', error.message);
            return;
        }
        console.log('[SITEMAP_UPDATE] Automated sitemap successfully generated.');
    });
};

const stripTrailingSlash = (value = '') => String(value || '').replace(/\/+$/, '');

const getSiteOrigin = () => stripTrailingSlash(
    process.env.SITE_URL
    || process.env.SITE_ORIGIN
    || process.env.PUBLIC_SITE_URL
    || process.env.VITE_SITE_URL
    || process.env.VITE_SITE_ORIGIN
    || process.env.FRONTEND_URL
    || DEFAULT_SITE_ORIGIN
);

const escapeXml = (value = '') => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toIsoDate = (value) => {
    const date = value ? new Date(value) : new Date();
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
};

const getSlug = (value = '') => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const absoluteUrl = (path = '/') => {
    const normalized = String(path || '/').startsWith('/') ? String(path || '/') : `/${path}`;
    return `${getSiteOrigin()}${normalized}`;
};

const sendXml = (res, xml) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', SITEMAP_CACHE_CONTROL);
    res.status(200).send(xml);
};

const sendText = (res, text) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', SITEMAP_CACHE_CONTROL);
    res.status(200).send(text);
};

const makeUrlNode = ({ loc, lastmod, changefreq, priority }) => (
    `<url><loc>${escapeXml(loc)}</loc><lastmod>${escapeXml(toIsoDate(lastmod))}</lastmod><changefreq>${escapeXml(changefreq)}</changefreq><priority>${escapeXml(priority)}</priority></url>`
);

const makeUrlSet = (entries = []) => (
    `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(makeUrlNode).join('')}</urlset>`
);

const makeSitemapIndex = (entries = []) => (
    `${XML_HEADER}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => (
        `<sitemap><loc>${escapeXml(absoluteUrl(entry.path))}</loc><lastmod>${escapeXml(toIsoDate(entry.lastmod))}</lastmod></sitemap>`
    )).join('')}</sitemapindex>`
);

const uniqueByLoc = (entries = []) => {
    const seen = new Set();
    return entries.filter((entry) => {
        if (!entry?.loc || seen.has(entry.loc)) return false;
        seen.add(entry.loc);
        return true;
    });
};

const chunkEntries = (entries = []) => {
    const chunks = [];
    for (let index = 0; index < entries.length; index += SITEMAP_PAGE_SIZE) {
        chunks.push(entries.slice(index, index + SITEMAP_PAGE_SIZE));
    }
    return chunks.length ? chunks : [[]];
};

const latestTimestamp = (entries = []) => entries.reduce((latest, entry) => {
    const timestamp = new Date(entry?.lastmod || 0).getTime();
    return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest;
}, 0) || Date.now();

const parsePriceNumber = (value) => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getDealId = (deal = {}) => String(deal._id || deal.id || deal.dealId || '').trim();

const isIndexableDeal = (deal = {}) => (
    Boolean(getDealId(deal))
    && Boolean(String(deal.title || deal.displayTitle || deal.cardTitle || '').trim())
    && !deal.isExpired
    && deal.validationStatus !== 'rejected'
    && parsePriceNumber(deal.dealPrice || deal.price) > 0
);

const getDealSlug = (deal = {}) => {
    const id = getDealId(deal);
    const title = deal.slug || deal.displayTitle || deal.fullTitle || deal.cardTitle || deal.title || '';
    const titleSlug = slugifyProductTitle(title);
    return id ? `${titleSlug}-${id}` : titleSlug;
};

const getDealsForSitemap = async (req) => {
    const dealsSource = await Deal.find({
            isExpired: { $ne: true },
            validationStatus: { $ne: 'rejected' },
            title: { $exists: true, $ne: '' }
        })
            .select({
                title: 1,
                shortTitle: 1,
                fullTitle: 1,
                slug: 1,
                displayTitle: 1,
                cardTitle: 1,
                store: 1,
                storeName: 1,
                storeSlug: 1,
                category: 1,
                categorySlug: 1,
                dealPrice: 1,
                price: 1,
                isExpired: 1,
                validationStatus: 1,
                updatedAt: 1,
                createdAt: 1,
                lastFetchedAt: 1,
                publishedAt: 1,
                lastSyncedAt: 1
            })
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean();

    return dealsSource.filter(isIndexableDeal);
};

const buildStaticPageEntries = () => {
    const now = new Date();
    const entries = [
        { loc: absoluteUrl('/'), lastmod: now, changefreq: 'daily', priority: '1.0' },
        { loc: absoluteUrl('/deals'), lastmod: now, changefreq: 'daily', priority: '0.9' },
        { loc: absoluteUrl('/stores'), lastmod: now, changefreq: 'daily', priority: '0.8' },
        { loc: absoluteUrl('/blog'), lastmod: now, changefreq: 'weekly', priority: '0.7' },
        { loc: absoluteUrl('/about'), lastmod: now, changefreq: 'monthly', priority: '0.6' },
        { loc: absoluteUrl('/contact'), lastmod: now, changefreq: 'monthly', priority: '0.6' },
        { loc: absoluteUrl('/privacy-policy'), lastmod: now, changefreq: 'monthly', priority: '0.4' },
        { loc: absoluteUrl('/terms'), lastmod: now, changefreq: 'monthly', priority: '0.4' }
    ];

    if (couponsEnabled) {
        entries.splice(2, 0, { loc: absoluteUrl('/coupons'), lastmod: now, changefreq: 'daily', priority: '0.8' });
    }

    return uniqueByLoc(entries);
};

const buildProductEntries = (deals = []) => uniqueByLoc(
    deals.map((deal) => ({
        loc: absoluteUrl(`/product/${encodeURIComponent(getDealSlug(deal))}`),
        lastmod: deal.updatedAt || deal.lastFetchedAt || deal.createdAt || new Date(),
        changefreq: 'daily',
        priority: '0.9'
    }))
);

const buildCategoryEntries = (deals = []) => {
    const categoryMap = new Map();
    deals.forEach((deal) => {
        const category = String(deal.category || '').trim();
        const slug = String(deal.categorySlug || getSlug(category)).trim();
        if (!category || !slug) return;
        const existing = categoryMap.get(slug) || { slug, lastmod: 0 };
        const timestamp = new Date(deal.updatedAt || deal.lastSyncedAt || deal.publishedAt || deal.lastFetchedAt || deal.createdAt || 0).getTime();
        existing.lastmod = Math.max(existing.lastmod, Number.isFinite(timestamp) ? timestamp : 0);
        categoryMap.set(slug, existing);
    });

    return [...categoryMap.values()].map((entry) => ({
        loc: absoluteUrl(`/category/${encodeURIComponent(entry.slug)}`),
        lastmod: entry.lastmod || new Date(),
        changefreq: 'daily',
        priority: '0.8'
    }));
};

const buildStoreEntries = (deals = []) => {
    const storeMap = new Map();
    deals.forEach((deal) => {
        const store = String(deal.storeName || deal.store || '').trim();
        const slug = String(deal.storeSlug || getSlug(store)).trim();
        if (!store || !slug) return;
        const existing = storeMap.get(slug) || { slug, lastmod: 0 };
        const timestamp = new Date(deal.updatedAt || deal.lastSyncedAt || deal.publishedAt || deal.lastFetchedAt || deal.createdAt || 0).getTime();
        existing.lastmod = Math.max(existing.lastmod, Number.isFinite(timestamp) ? timestamp : 0);
        storeMap.set(slug, existing);
    });

    return [...storeMap.values()].map((entry) => ({
        loc: absoluteUrl(`/store/${encodeURIComponent(entry.slug)}`),
        lastmod: entry.lastmod || new Date(),
        changefreq: 'daily',
        priority: '0.8'
    }));
};

const getBlogsForSitemap = async (req) => {
    const blogsSource = await Blog.find({
            status: 'published',
            slug: { $exists: true, $ne: '' },
            title: { $exists: true, $ne: '' }
        })
            .select({
                slug: 1,
                updatedAt: 1,
                createdAt: 1,
                publishedAt: 1
            })
            .sort({ publishedAt: -1, updatedAt: -1 })
            .lean();

    return blogsSource.filter((blog) => blog?.slug && getSlug(blog.slug));
};

const buildBlogEntries = (blogs = []) => uniqueByLoc(
    blogs.map((post) => ({
        loc: absoluteUrl(`/blog/${encodeURIComponent(getSlug(post.slug))}`),
        lastmod: post.updatedAt || post.publishedAt || post.createdAt || new Date(),
        changefreq: 'weekly',
        priority: '0.7'
    }))
);

const getCacheKey = (req) => `${getSiteOrigin()}|db`;

export const getSitemapData = async (req) => {
    const cacheKey = getCacheKey(req);
    const cached = sitemapCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const deals = await getDealsForSitemap(req);
    const pages = buildStaticPageEntries();
    const products = buildProductEntries(deals);
    const categories = buildCategoryEntries(deals);
    const stores = buildStoreEntries(deals);
    const blogs = buildBlogEntries(await getBlogsForSitemap(req));

    let manualProducts = [];
    try {
        const manualPath = path.join(__dirname, '../data/manual-sitemap.json');
        if (fs.existsSync(manualPath)) {
            const manualData = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
            if (Array.isArray(manualData)) {
                manualProducts = manualData;
            }
        }
    } catch (err) {
        console.error('Failed to read manual sitemap links:', err.message);
    }

    const allProducts = uniqueByLoc([...products, ...manualProducts]);

    const data = {
        pages,
        products: allProducts,
        categories,
        stores,
        blogs,
        lastmod: {
            pages: latestTimestamp(pages),
            products: latestTimestamp(allProducts),
            categories: latestTimestamp(categories),
            stores: latestTimestamp(stores),
            blogs: latestTimestamp(blogs)
        }
    };

    sitemapCache.set(cacheKey, {
        expiresAt: Date.now() + SITEMAP_CACHE_TTL_MS,
        data
    });

    return data;
};

const sendSitemapSet = (res, entries) => {
    sendXml(res, makeUrlSet(entries));
};

const sendChunkedSitemap = (res, entries, baseName, lastmod) => {
    const chunks = chunkEntries(entries);
    if (chunks.length <= 1) {
        sendSitemapSet(res, chunks[0]);
        return;
    }

    const indexEntries = chunks.map((_, index) => ({
        path: `/${baseName}-${index + 1}.xml`,
        lastmod
    }));
    sendXml(res, makeSitemapIndex(indexEntries));
};

const sendChunkPage = (res, entries, pageNumber) => {
    const chunks = chunkEntries(entries);
    if (!Number.isFinite(pageNumber) || pageNumber < 1 || pageNumber > chunks.length) {
        res.status(404).send('Not Found');
        return;
    }
    sendSitemapSet(res, chunks[pageNumber - 1]);
};

router.get('/robots.txt', (req, res) => {
    const disallowCouponPaths = couponsEnabled
        ? []
        : [
            'Disallow: /coupons',
            'Disallow: /coupons/*',
            'Disallow: /coupon',
            'Disallow: /coupon/*'
        ];

    sendText(res, [
        'User-agent: *',
        'Allow: /',
        '',
        'Disallow: /admin',
        'Disallow: /admin/*',
        'Disallow: /login',
        'Disallow: /discovery-admin',
        ...disallowCouponPaths,
        '',
        `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
        ''
    ].join('\n'));
});

router.get('/sitemap', (req, res) => {
    res.redirect(301, '/sitemap.xml');
});

router.get('/sitemap.xml', async (req, res, next) => {
    try {
        const data = await getSitemapData(req);
        sendXml(res, makeSitemapIndex([
            { path: '/sitemap-pages.xml', lastmod: data.lastmod.pages },
            { path: '/sitemap-products.xml', lastmod: data.lastmod.products },
            { path: '/sitemap-categories.xml', lastmod: data.lastmod.categories },
            { path: '/sitemap-stores.xml', lastmod: data.lastmod.stores },
            { path: '/sitemap-blogs.xml', lastmod: data.lastmod.blogs }
        ]));
    } catch (error) {
        next(error);
    }
});

router.get('/sitemap-pages.xml', async (req, res, next) => {
    try {
        const data = await getSitemapData(req);
        sendSitemapSet(res, data.pages);
    } catch (error) {
        next(error);
    }
});

router.get('/sitemap-products.xml', async (req, res, next) => {
    try {
        const data = await getSitemapData(req);
        sendChunkedSitemap(res, data.products, 'sitemap-products', data.lastmod.products);
    } catch (error) {
        next(error);
    }
});

router.get('/sitemap-products-:page.xml', async (req, res, next) => {
    try {
        const data = await getSitemapData(req);
        sendChunkPage(res, data.products, Number(req.params.page || 1));
    } catch (error) {
        next(error);
    }
});

router.get('/sitemap-categories.xml', async (req, res, next) => {
    try {
        const data = await getSitemapData(req);
        sendSitemapSet(res, data.categories);
    } catch (error) {
        next(error);
    }
});

router.get('/sitemap-stores.xml', async (req, res, next) => {
    try {
        const data = await getSitemapData(req);
        sendSitemapSet(res, data.stores);
    } catch (error) {
        next(error);
    }
});

router.get('/sitemap-blogs.xml', async (req, res, next) => {
    try {
        const data = await getSitemapData(req);
        sendSitemapSet(res, data.blogs);
    } catch (error) {
        next(error);
    }
});

export default router;
