import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { extractProduct } from '../extractors/index.js';
import Deal from '../models/Deal.js';

dotenv.config();

const urlsToTest = [
    'https://mamaearth.in/product/onion-hair-oil-for-hair-fall-control-with-red-seed-extract-black-seed-oil-250ml',
    'https://thedermaco.com/product/1-hyaluronic-sunscreen-aqua-gel',
    'https://www.mcaffeine.com/products/coffee-body-scrub-with-coconut-100-gm',
    'https://dotandkey.com/products/vitamin-c-super-bright-moisturizer',
    'https://www.ajio.com/dnmx-mid-rise-skinny-jeans/p/441132644_midblue',
    'https://www.pepperfry.com/product/fuji-ergonomic-chair-in-black-colour-1979416.html',
    'https://www.netmeds.com/prescriptions/calpol-650mg-tablet-15-s',
    'https://www.muscleblaze.com/sv/muscleblaze-biozyme-performance-whey/SP-88334',
    'https://www.gonoise.com/products/noise-colorfit-pro-4-alpha-smartwatch'
];

async function seed() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsphere');
    console.log("Connected!");

    for (let i = 0; i < urlsToTest.length; i++) {
        const url = urlsToTest[i];
        console.log(`\n[${i+1}/${urlsToTest.length}] Fetching ${url}`);
        const res = await extractProduct(url);
        
        if (res.success && res.data && res.data.title && res.data.title !== 'Undefined') {
            const data = res.data;
            console.log("✅ SUCCESS:", data.title.substring(0, 50) + "...", "| Price:", data.dealPrice, "| MRP:", data.mrp);
            
            // Calculate discount
            let discountPercent = 0;
            const price = parseFloat(data.dealPrice) || 0;
            const mrp = parseFloat(data.mrp) || 0;
            if (mrp > price && price > 0) {
                discountPercent = Math.round(((mrp - price) / mrp) * 100);
            }

            try {
                // Check if exists
                const exists = await Deal.findOne({ link: url });
                if (exists) {
                    console.log("-> Deal already exists in DB, skipping insert.");
                    continue;
                }

                const newDeal = new Deal({
                    title: data.title,
                    originalTitle: data.title,
                    store: data.store || 'Other',
                    category: data.category || 'Electronics',
                    description: data.description || '',
                    mrp: mrp || price,
                    price: price || mrp,
                    dealPrice: price,
                    discountPercent: discountPercent,
                    image: data.imageUrl || (data.images && data.images[0]) || '',
                    images: data.images || [],
                    link: url,
                    originalLink: url,
                    productUrl: url,
                    canonicalProductUrl: url,
                    isVerified: true,
                    publishedAt: new Date()
                });

                await newDeal.save();
                console.log("-> ✅ Saved to Database!");
            } catch(e) {
                console.log("-> ❌ Error saving to DB:", e.message);
            }
        } else {
            console.log("❌ FAILED to extract proper data:", res.message || res.data);
        }
    }

    console.log("\nFinished seeding new stores.");
    process.exit(0);
}

seed();
