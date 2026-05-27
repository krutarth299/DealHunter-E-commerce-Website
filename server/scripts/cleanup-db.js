import 'dotenv/config';
import mongoose from 'mongoose';
import Deal from '../models/Deal.js';
import PriceSnapshot from '../models/PriceSnapshot.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dealsphere';

const badDealsQuery = {
    $or: [
        // Image issues: both image and imageUrl are missing, empty, or placeholder
        {
            $and: [
                {
                    $or: [
                        { image: { $in: [null, '', 'NO_PRODUCT_IMAGE'] } },
                        { image: { $regex: /placeholder|no-image|default-product|no_product_image|noimage/i } },
                        { image: { $not: /^(https?:\/\/|\/)/ } }
                    ]
                },
                {
                    $or: [
                        { imageUrl: { $exists: false } },
                        { imageUrl: { $in: [null, '', 'NO_PRODUCT_IMAGE'] } },
                        { imageUrl: { $regex: /placeholder|no-image|default-product|no_product_image|noimage/i } },
                        { imageUrl: { $not: /^(https?:\/\/|\/)/ } }
                    ]
                }
            ]
        },
        { dealPrice: { $lte: 0 } },
        { price: { $lte: 0 } },
        { $and: [ { mrp: { $gt: 0 } }, { $expr: { $gte: ["$dealPrice", "$mrp"] } } ] },
        { $and: [ { originalPrice: { $gt: 0 } }, { $expr: { $gte: ["$dealPrice", "$originalPrice"] } } ] },
        { $and: [ { mrp: { $gt: 0 } }, { $expr: { $gte: ["$price", "$mrp"] } } ] },
        { $and: [ { originalPrice: { $gt: 0 } }, { $expr: { $gte: ["$price", "$originalPrice"] } } ] },
        // Title issues: missing/empty, whitespace-only, no alphabetic letters, too short (< 8 chars), fake/test/dummy/incorrect names
        { title: { $in: [null, ''] } },
        { title: { $regex: /^\s*$/ } },
        { title: { $regex: /^[^a-zA-Z]*$/ } },
        { title: { $regex: /^(test|demo|fake|asdf|dummy|temp|untitled|unknown|n\/a|null|undefined|lorem|ipsum|product|charger|gopro|tws\s*ans)$/i } },
        { title: { $regex: /test product|fake deal|testing|asdfasdf|untitled|lorem ipsum/i } },
        { $expr: { $lt: [{ $strLenCP: { $ifNull: ["$title", ""] } }, 8] } }
    ]
};

const run = async () => {
    const clearAll = process.argv.includes('--all');

    try {
        console.log('[DB_CLEANUP] Connecting to MongoDB...');
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log('[DB_CLEANUP] Connected.');

        if (clearAll) {
            console.log('[DB_CLEANUP] Wiping all deals and price snapshots...');
            const dealResult = await Deal.deleteMany({});
            const snapshotResult = await PriceSnapshot.deleteMany({});
            console.log(`[DB_CLEANUP] Successfully cleared database. Deleted ${dealResult.deletedCount} deals and ${snapshotResult.deletedCount} price snapshots.`);
        } else {
            console.log('[DB_CLEANUP] Finding invalid/messed up deals...');
            const badDeals = await Deal.find(badDealsQuery).lean();
            if (badDeals.length > 0) {
                console.log(`[DB_CLEANUP] Found ${badDeals.length} invalid/messed up deals. Deleting...`);
                const result = await Deal.deleteMany({ _id: { $in: badDeals.map(d => d._id) } });
                console.log(`[DB_CLEANUP] Deleted ${result.deletedCount} invalid deals.`);
            } else {
                console.log('[DB_CLEANUP] No invalid/messed up deals found.');
            }
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('[DB_CLEANUP] Failed:', error.message);
        try {
            await mongoose.disconnect();
        } catch (_) {}
        process.exit(1);
    }
};

run();
