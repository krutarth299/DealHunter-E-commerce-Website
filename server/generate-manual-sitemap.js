import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Deal from './models/Deal.js';
import { slugifyProductTitle } from '../src/utils/productUrls.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SITE_ORIGIN = 'https://dealsphere.com';

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

const absoluteUrl = (path = '/') => {
    const normalized = String(path || '/').startsWith('/') ? String(path || '/') : `/${path}`;
    return `${getSiteOrigin()}${normalized}`;
};

const getDealId = (deal = {}) => String(deal._id || deal.id || deal.dealId || '').trim();

const getDealSlug = (deal = {}) => {
    const id = getDealId(deal);
    const title = deal.slug || deal.displayTitle || deal.fullTitle || deal.cardTitle || deal.title || '';
    const titleSlug = slugifyProductTitle(title);
    return id ? `${titleSlug}-${id}` : titleSlug;
};

const parsePriceNumber = (value) => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const isIndexableDeal = (deal = {}) => (
    Boolean(getDealId(deal))
    && Boolean(String(deal.title || deal.displayTitle || deal.cardTitle || '').trim())
    && !deal.isExpired
    && deal.validationStatus !== 'rejected'
    && parsePriceNumber(deal.dealPrice || deal.price) > 0
);

async function generateManualLinks() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dealsphere', {
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('Fetching products...');
        const dealsSource = await Deal.find({
            isExpired: { $ne: true },
            validationStatus: { $ne: 'rejected' },
            title: { $exists: true, $ne: '' }
        }).lean();

        const validDeals = dealsSource.filter(isIndexableDeal);
        console.log(`Found ${validDeals.length} valid deals.`);

        const manualLinks = validDeals.map(deal => ({
            loc: absoluteUrl(`/product/${encodeURIComponent(getDealSlug(deal))}`),
            lastmod: deal.updatedAt || deal.lastFetchedAt || deal.createdAt || new Date(),
            changefreq: 'daily',
            priority: '0.9'
        }));

        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const outPath = path.join(dataDir, 'manual-sitemap.json');
        fs.writeFileSync(outPath, JSON.stringify(manualLinks, null, 2), 'utf-8');

        console.log(`Successfully generated manual links to ${outPath}`);
    } catch (error) {
        console.error('Error generating manual links:', error);
    } finally {
        await mongoose.disconnect();
    }
}

generateManualLinks();
