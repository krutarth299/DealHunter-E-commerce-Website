const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dealsphere';
    console.log("Connecting to MongoDB at:", mongoUri);
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected successfully!");

        // Define a schema/model for Deals if not already defined
        const dealSchema = new mongoose.Schema({}, { strict: false });
        const Deal = mongoose.model('Deal', dealSchema, 'deals');

        const total = await Deal.countDocuments();
        console.log("Total deals in database:", total);

        const stores = await Deal.distinct('storeName');
        console.log("Distinct store names:", stores);

        // Fetch sample deals for each store
        for (const store of stores) {
            const sample = await Deal.findOne({ storeName: store });
            console.log(`\nStore: ${store}`);
            console.log(`  Title: ${sample.title}`);
            console.log(`  Product URL: ${sample.productUrl || sample.link}`);
            console.log(`  Deal Price: ${sample.dealPrice || sample.price}`);
            console.log(`  MRP: ${sample.mrp || sample.originalPrice}`);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
