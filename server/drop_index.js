import mongoose from 'mongoose';
import 'dotenv/config';

async function dropIndex() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dealsphere');
        console.log('Connected to MongoDB');
        
        const collection = mongoose.connection.collection('deals');
        
        try {
            await collection.dropIndex('dedupeKey_unique');
            console.log('Dropped dedupeKey_unique');
        } catch (e) {}

        try {
            await collection.dropIndex('titleStoreKey_unique');
            console.log('Dropped titleStoreKey_unique');
        } catch (e) {}

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

dropIndex();
