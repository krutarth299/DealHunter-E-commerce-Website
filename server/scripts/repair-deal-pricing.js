import 'dotenv/config';
import mongoose from 'mongoose';
import Deal from '../models/Deal.js';
import { repairStoredDeals } from '../utils/deal-normalizer.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dealsphere';

const run = async () => {
    try {
        console.log('[PRICING_REPAIR] Connecting to MongoDB...');
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log('[PRICING_REPAIR] Connected. Starting repair...');

        const result = await repairStoredDeals(Deal);
        console.log(`[PRICING_REPAIR] Completed. scanned=${result.scanned} updated=${result.updated} invalidPricing=${result.invalidPricing ?? 0}`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('[PRICING_REPAIR] Failed:', error.message);
        try {
            await mongoose.disconnect();
        } catch (_) {
            // noop
        }
        process.exit(1);
    }
};

run();
