import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { getAffiliateSettings, applyAffiliateSettingsToDeal } from './utils/affiliate-links.js';
import { normalizeDealForResponse } from './utils/deal-normalizer.js';
import { groupDealsIntoListings } from './utils/product-identity.js';
import AffiliateSetting from './models/AffiliateSetting.js';
import Deal from './models/Deal.js';
import Blog from './models/Blog.js';
import Freebie from './models/Freebie.js';
import logger from './utils/logger.js';
import { getSitemapData } from './routes/sitemap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE_DEAL_QUERY = { validationStatus: 'accepted', isExpired: { $ne: true } };
const SSR_PROJECTION = { title: 1, slug: 1, image: 1, price: 1, dealPrice: 1, mrp: 1, store: 1, category: 1, createdAt: 1 };

export const handleSSR = async (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.includes('.')) return next();

    try {
        let templatePath = path.resolve(__dirname, '../dist/client/index.html');
        if (!fs.existsSync(templatePath)) templatePath = path.resolve(__dirname, '../dist/index.html');
        
        // If dist is missing (which happens in pure development), serve the source index.html
        if (!fs.existsSync(templatePath)) {
            templatePath = path.resolve(__dirname, '../index.html');
            if (!fs.existsSync(templatePath)) {
                return res.status(500).send('Production build and dev index missing.');
            }
            // For dev mode without dist, just serve the raw index.html and let Vite handle it
            return res.status(200).send(fs.readFileSync(templatePath, 'utf8'));
        }

        let template = fs.readFileSync(templatePath, 'utf8');
        let preloadedDeals = [];
        let preloadedCategories = [];
        
        try {
            const affiliateSettings = await getAffiliateSettings(AffiliateSetting, false, req.app.locals);
            
            const [d, c] = await Promise.all([
                Deal.find(LIVE_DEAL_QUERY, SSR_PROJECTION).sort({ createdAt: -1 }).limit(20).lean(),
                Deal.distinct('category', LIVE_DEAL_QUERY)
            ]);

            preloadedDeals = groupDealsIntoListings((d || []).map(item => 
                normalizeDealForResponse(applyAffiliateSettingsToDeal({ deal: item, settings: affiliateSettings }))
            )).slice(0, 20);
            preloadedCategories = (c || []).filter(Boolean);
            
        } catch(e) {
            logger.error('SSR_DATA', e.message);
        }

        let ssrSitemapHtml = '';
        try {
            const sitemapData = await getSitemapData(req);
            const allLinks = [
                ...(sitemapData.pages || []),
                ...(sitemapData.products || []),
                ...(sitemapData.categories || []),
                ...(sitemapData.stores || []),
                ...(sitemapData.blogs || [])
            ];
            
            const seenLocs = new Set();
            const anchors = [];
            for (const link of allLinks) {
                if (link && link.loc && !seenLocs.has(link.loc)) {
                    seenLocs.add(link.loc);
                    anchors.push(`<a href="${link.loc}"></a>`);
                }
            }
            ssrSitemapHtml = `<div id="seo-sitemap-links" style="display:none;" aria-hidden="true">${anchors.join('')}</div>`;
        } catch (error) {
            logger.error('SSR_SITEMAP', error.message);
        }

        const ssrDataScript = `<script>
            window.__INITIAL_DATA__ = ${JSON.stringify(preloadedDeals).replace(/</g, '\\u003c')};
            window.__INITIAL_CATEGORIES__ = ${JSON.stringify(preloadedCategories).replace(/</g, '\\u003c')};
        </script>`;

        let dynamicSeoTags = '';
        const rawUrl = req.originalUrl.split('?')[0];

        let ssrBlogDataScript = '';

        if (rawUrl === '/blog') {
            try {
                const blogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 }).limit(100).lean();
                // Pass to SSR process
                global.__INITIAL_BLOGS__ = blogs;
                ssrBlogDataScript = `window.__INITIAL_BLOGS__ = ${JSON.stringify(blogs).replace(/</g, '\\u003c')};`;

                const title = 'DealSphere Blog | Buying Guides, Savings Tips & Live Deal Roundups';
                const description = 'Read live deal roundups, shopping guides, category savings tips, and store-specific buying advice powered by DealSphere data.';
                const keywords = 'Deals, Offers, Amazon, Flipkart, Tech Deals, Gadgets, Shopping Guides, DealSphere Blog';
                const image = 'https://dealsphere.com/og-image.jpg'; // Assuming default site OG image
                const url = 'https://dealsphere.com/blog';

                const schema = {
                    "@context": "https://schema.org",
                    "@type": "Blog",
                    "name": title,
                    "description": description,
                    "url": url,
                    "publisher": {
                        "@type": "Organization",
                        "name": "DealSphere"
                    }
                };

                dynamicSeoTags = `
                    <title data-rh="true">${title}</title>
                    <meta data-rh="true" name="description" content="${description}">
                    <meta data-rh="true" name="keywords" content="${keywords}">
                    <meta data-rh="true" property="og:title" content="${title}">
                    <meta data-rh="true" property="og:description" content="${description}">
                    <meta data-rh="true" property="og:url" content="${url}">
                    <meta data-rh="true" property="og:type" content="website">
                    <meta data-rh="true" name="twitter:card" content="summary_large_image">
                    <meta data-rh="true" name="twitter:title" content="${title}">
                    <meta data-rh="true" name="twitter:description" content="${description}">
                    <script data-rh="true" type="application/ld+json">${JSON.stringify(schema)}</script>
                `;
            } catch (err) {
                logger.error('BLOG_INDEX_SEO', err.message);
            }
        } else if (rawUrl.startsWith('/blog/')) {
            try {
                const slug = rawUrl.split('/')[2];
                if (slug) {
                    const blogPost = await Blog.findOne({ slug }).lean();
                    if (blogPost) {
                        // Pass to SSR process
                        global.__INITIAL_BLOG__ = blogPost;
                        ssrBlogDataScript = `window.__INITIAL_BLOG__ = ${JSON.stringify(blogPost).replace(/</g, '\\u003c')};`;

                        const title = blogPost.seoTitle || blogPost.title || 'DealSphere Blog';
                        const description = (blogPost.seoDescription || blogPost.summary || '').replace(/"/g, '&quot;');
                        const keywords = (blogPost.seoKeywords?.length ? blogPost.seoKeywords : (blogPost.tags || [])).join(', ').replace(/"/g, '&quot;');
                        let image = blogPost.featuredImage || blogPost.image || '';
                        if (image && !image.startsWith('http')) image = 'https://dealsphere.com' + image;
                        const url = `https://dealsphere.com/blog/${slug}`;
                        
                        const schema = {
                            "@context": "https://schema.org",
                            "@type": "BlogPosting",
                            "headline": title,
                            "description": description,
                            "image": image,
                            "author": { "@type": "Person", "name": blogPost.author || "DealHunter Team" },
                            "publisher": { "@type": "Organization", "name": "DealSphere" },
                            "mainEntityOfPage": url,
                            "keywords": keywords
                        };
                        
                        dynamicSeoTags = `
                            <title data-rh="true">${title}</title>
                            <meta data-rh="true" name="description" content="${description}">
                            <meta data-rh="true" name="keywords" content="${keywords}">
                            <meta data-rh="true" property="og:title" content="${title}">
                            <meta data-rh="true" property="og:description" content="${description}">
                            <meta data-rh="true" property="og:image" content="${image}">
                            <meta data-rh="true" property="og:url" content="${url}">
                            <meta data-rh="true" property="og:type" content="article">
                            <meta data-rh="true" name="twitter:card" content="summary_large_image">
                            <meta data-rh="true" name="twitter:title" content="${title}">
                            <meta data-rh="true" name="twitter:description" content="${description}">
                            <meta data-rh="true" name="twitter:image" content="${image}">
                            <script data-rh="true" type="application/ld+json">${JSON.stringify(schema)}</script>
                        `;
                    }
                }
            } catch (seoErr) {
                logger.error('DYNAMIC_SEO', seoErr.message);
            }
        } else if (rawUrl === '/freebies') {
            try {
                const freebies = await Freebie.find({ status: 'active' }).sort({ createdAt: -1 }).limit(100).lean();
                const types = [...new Set(freebies.map(f => f.type).filter(Boolean))];
                
                global.__INITIAL_FREEBIES__ = { items: freebies, types };
                ssrBlogDataScript += `window.__INITIAL_FREEBIES__ = ${JSON.stringify({ items: freebies, types }).replace(/</g, '\\u003c')};`;

                const title = '100% Free Games, Software, and Samples | DealSphere Freebies';
                const description = 'Discover the best daily freebies including free PC games, premium software licenses, and physical product samples. 100% free with no hidden costs.';
                const keywords = 'Freebies, Free Games, Free Software, Free Samples, Giveaways, DealSphere Freebies';
                const url = 'https://dealsphere.com/freebies';

                const schema = {
                    "@context": "https://schema.org",
                    "@type": "CollectionPage",
                    "name": title,
                    "description": description,
                    "url": url
                };

                dynamicSeoTags = `
                    <title data-rh="true">${title}</title>
                    <meta data-rh="true" name="description" content="${description}">
                    <meta data-rh="true" name="keywords" content="${keywords}">
                    <meta data-rh="true" property="og:title" content="${title}">
                    <meta data-rh="true" property="og:description" content="${description}">
                    <meta data-rh="true" property="og:url" content="${url}">
                    <meta data-rh="true" property="og:type" content="website">
                    <meta data-rh="true" name="twitter:card" content="summary_large_image">
                    <meta data-rh="true" name="twitter:title" content="${title}">
                    <meta data-rh="true" name="twitter:description" content="${description}">
                    <script data-rh="true" type="application/ld+json">${JSON.stringify(schema)}</script>
                `;
            } catch (err) {
                logger.error('FREEBIES_INDEX_SEO', err.message);
            }
        } else if (rawUrl.startsWith('/freebies/')) {
            try {
                const slug = rawUrl.split('/')[2];
                if (slug) {
                    const freebie = await Freebie.findOne({ slug }).lean();
                    if (freebie) {
                        global.__INITIAL_FREEBIE__ = freebie;
                        ssrBlogDataScript += `window.__INITIAL_FREEBIE__ = ${JSON.stringify(freebie).replace(/</g, '\\u003c')};`;

                        const title = freebie.seoTitle || `${freebie.title} - 100% Free`;
                        const description = (freebie.seoDescription || freebie.description || '').replace(/"/g, '&quot;');
                        const keywords = (freebie.seoKeywords?.length ? freebie.seoKeywords : ['freebie', 'free stuff', 'giveaway']).join(', ').replace(/"/g, '&quot;');
                        let image = freebie.image || '';
                        if (image && !image.startsWith('http')) image = 'https://dealsphere.com' + image;
                        const url = `https://dealsphere.com/freebies/${slug}`;
                        
                        const schema = {
                            "@context": "https://schema.org",
                            "@type": "Product",
                            "name": freebie.title,
                            "description": description,
                            "image": image,
                            "offers": {
                                "@type": "Offer",
                                "price": "0.00",
                                "priceCurrency": "INR",
                                "availability": freebie.status === 'active' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                                "url": url
                            }
                        };
                        
                        dynamicSeoTags = `
                            <title data-rh="true">${title}</title>
                            <meta data-rh="true" name="description" content="${description}">
                            <meta data-rh="true" name="keywords" content="${keywords}">
                            <meta data-rh="true" property="og:title" content="${title}">
                            <meta data-rh="true" property="og:description" content="${description}">
                            <meta data-rh="true" property="og:image" content="${image}">
                            <meta data-rh="true" property="og:url" content="${url}">
                            <meta data-rh="true" property="og:type" content="product">
                            <meta data-rh="true" name="twitter:card" content="summary_large_image">
                            <meta data-rh="true" name="twitter:title" content="${title}">
                            <meta data-rh="true" name="twitter:description" content="${description}">
                            <meta data-rh="true" name="twitter:image" content="${image}">
                            <script data-rh="true" type="application/ld+json">${JSON.stringify(schema)}</script>
                        `;
                    }
                }
            } catch (seoErr) {
                logger.error('DYNAMIC_SEO', seoErr.message);
            }
        }

        const serverEntryPath = path.resolve(__dirname, '../dist/server/entry-server.js');
        if (fs.existsSync(serverEntryPath)) {
            // Check if we are running the module runner accidentally
            const entryUrl = 'file://' + serverEntryPath.replace(/\\/g, '/');
            const { render } = await import(entryUrl);
            const { html, helmet } = await render(req.originalUrl, preloadedDeals, preloadedCategories);
            
            // Clean up globals after render
            delete global.__INITIAL_BLOGS__;
            delete global.__INITIAL_BLOG__;
            delete global.__INITIAL_FREEBIES__;
            delete global.__INITIAL_FREEBIE__;

            const helmetTags = helmet ? [
                helmet.title?.toString() || '',
                helmet.meta?.toString() || '',
                helmet.link?.toString() || '',
                helmet.script?.toString() || ''
            ].filter(Boolean).join('\n') : '';

            // Using callback functions in replace to avoid string mangling by `$` characters
            template = template
                .replace(/<!--\s*ssr-head\s*-->/gi, () => dynamicSeoTags + helmetTags)
                .replace(/<!--\s*ssr-outlet\s*-->/gi, () => html)
                .replace(/<!--\s*ssr-data\s*-->/gi, () => ssrDataScript + '\n<script>' + ssrBlogDataScript + '</script>')
                .replace(/<!--\s*ssr-sitemap\s*-->/gi, () => ssrSitemapHtml)
                .replace(/<div\s+id=["']root["']\s*>/gi, () => '<div id="root" data-ssr-status="active">');
        } else {
            // If no SSR entry exists (dev mode CSR), still inject dynamic SEO and data
            delete global.__INITIAL_BLOGS__;
            delete global.__INITIAL_BLOG__;
            delete global.__INITIAL_FREEBIES__;
            delete global.__INITIAL_FREEBIE__;

            if (dynamicSeoTags) {
                template = template.replace(/<\/head>/i, () => dynamicSeoTags + '\n<script>' + ssrBlogDataScript + '</script>\n</head>');
            }
        }

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(template);
    } catch(err) {
        logger.error('SSR_ENGINE', err.message);
        res.status(500).send('Internal Server Error: ' + err.message);
    }
};
