import 'dotenv/config';
import mongoose from 'mongoose';
import fetch from 'node-fetch';
import Deal from '../models/Deal.js';
import { normalizeDealPayload } from '../utils/deal-normalizer.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dealsphere';
const apiBase = process.env.REEXTRACT_API_BASE || `http://127.0.0.1:${process.env.PORT || 5000}/api`;
const limit = Number(process.env.LIMIT || 0);
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 2));
const delayMs = Math.max(0, Number(process.env.DELAY_MS || 1000));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pickTargetUrl = (deal) => String(deal.productUrl || deal.link || '').trim();

const repairOneDeal = async (deal) => {
    const targetUrl = pickTargetUrl(deal);
    if (!targetUrl) {
        return { status: 'skipped', reason: 'missing_url', id: deal._id };
    }

    const response = await fetch(`${apiBase}/deals/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
    });

    const extracted = await response.json().catch(() => ({}));
    if (!response.ok) {
        return {
            status: 'failed',
            reason: extracted.message || `extract_http_${response.status}`,
            id: deal._id,
            url: targetUrl
        };
    }

    const normalized = normalizeDealPayload({
        ...deal,
        ...extracted,
        productUrl: deal.productUrl || targetUrl,
        link: deal.link || targetUrl,
        store: extracted.store || deal.store,
        storeName: extracted.storeName || deal.storeName || deal.store
    });

    if (!normalized.dealPrice || normalized.dealPrice <= 0) {
        return {
            status: 'failed',
            reason: 'invalid_reextracted_pricing',
            id: deal._id,
            url: targetUrl
        };
    }

    await Deal.updateOne(
        { _id: deal._id },
        {
            $set: {
                store: normalized.store,
                storeName: normalized.storeName,
                price: normalized.price,
                dealPrice: normalized.dealPrice,
                originalPrice: normalized.originalPrice,
                mrp: normalized.mrp,
                discount: normalized.discount,
                discountPercent: normalized.discountPercent,
                productUrl: normalized.productUrl || targetUrl
            }
        }
    );

    return {
        status: 'updated',
        id: deal._id,
        title: normalized.title,
        dealPrice: normalized.dealPrice,
        mrp: normalized.mrp,
        discount: normalized.discount
    };
};

const run = async () => {
    try {
        console.log('[PRICING_REEXTRACT] Connecting to MongoDB...');
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

        const query = {
            $or: [
                { dealPrice: { $lte: 0 } },
                { mrp: { $lte: 0 } },
                { price: { $in: ['', null] } },
                { originalPrice: { $in: ['', null] } }
            ]
        };

        let cursor = Deal.find(query).sort({ createdAt: -1 });
        if (limit > 0) {
            cursor = cursor.limit(limit);
        }

        const deals = await cursor.lean();
        console.log(`[PRICING_REEXTRACT] Found ${deals.length} invalid deals. apiBase=${apiBase} concurrency=${concurrency} delayMs=${delayMs}`);

        let updated = 0;
        let failed = 0;
        let skipped = 0;

        for (let i = 0; i < deals.length; i += concurrency) {
            const chunk = deals.slice(i, i + concurrency);
            const results = await Promise.all(chunk.map(repairOneDeal));

            for (const result of results) {
                if (result.status === 'updated') {
                    updated += 1;
                    console.log(`[PRICING_REEXTRACT][UPDATED] ${result.id} dealPrice=${result.dealPrice} mrp=${result.mrp} discount=${result.discount}`);
                } else if (result.status === 'skipped') {
                    skipped += 1;
                    console.warn(`[PRICING_REEXTRACT][SKIPPED] ${result.id} reason=${result.reason}`);
                } else {
                    failed += 1;
                    console.warn(`[PRICING_REEXTRACT][FAILED] ${result.id} reason=${result.reason} url=${result.url || ''}`);
                }
            }

            if (i + concurrency < deals.length && delayMs > 0) {
                await sleep(delayMs);
            }
        }

        console.log(`[PRICING_REEXTRACT] Completed. total=${deals.length} updated=${updated} failed=${failed} skipped=${skipped}`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('[PRICING_REEXTRACT] Fatal error:', error.message);
        try {
            await mongoose.disconnect();
        } catch (_) {
            // noop
        }
        process.exit(1);
    }
};

run();
