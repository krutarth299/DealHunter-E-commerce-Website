import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { getAffiliateSettings, applyAffiliateSettingsToDeal } from './utils/affiliate-links.js';
import { normalizeDealForResponse } from './utils/deal-normalizer.js';
import { groupDealsIntoListings } from './utils/product-identity.js';
import AffiliateSetting from './models/AffiliateSetting.js';
import Deal from './models/Deal.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE_DEAL_QUERY = { validationStatus: 'accepted', isExpired: { $ne: true } };
const SSR_PROJECTION = { title: 1, slug: 1, image: 1, price: 1, dealPrice: 1, mrp: 1, store: 1, category: 1, createdAt: 1 };

export const handleSSR = async (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.includes('.')) return next();

    try {
        let templatePath = path.resolve(__dirname, '../dist/client/index.html');
        if (!fs.existsSync(templatePath)) templatePath = path.resolve(__dirname, '../dist/index.html');
        
        if (!fs.existsSync(templatePath)) {
            return res.status(500).send('Production build missing.');
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

        const ssrDataScript = `<script>
            window.__INITIAL_DATA__ = ${JSON.stringify(preloadedDeals)};
            window.__INITIAL_CATEGORIES__ = ${JSON.stringify(preloadedCategories)};
        </script>`;

        const serverEntryPath = path.resolve(__dirname, '../dist/server/entry-server.js');
        if (fs.existsSync(serverEntryPath)) {
            const { render } = await import('file://' + serverEntryPath.replace(/\\/g, '/'));
            const { html, helmet } = await render(req.originalUrl, preloadedDeals, preloadedCategories);
            
            const helmetTags = helmet ? [
                helmet.title?.toString() || '',
                helmet.meta?.toString() || '',
                helmet.link?.toString() || ''
            ].join('') : '';

            template = template
                .replace(/<!--\s*ssr-head\s*-->/gi, helmetTags)
                .replace(/<!--\s*ssr-outlet\s*-->/gi, html)
                .replace(/<!--\s*ssr-data\s*-->/gi, ssrDataScript)
                .replace(/<div\s+id=["']root["']\s*>/gi, '<div id="root" data-ssr-status="active">');
        }

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(template);
    } catch(err) {
        logger.error('SSR_ENGINE', err.message);
        res.status(500).send('Internal Server Error');
    }
};
