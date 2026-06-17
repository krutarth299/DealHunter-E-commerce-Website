import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Deal from './models/Deal.js';

dotenv.config();

async function clean() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsphere');
    const res = await Deal.deleteMany({
        $or: [
            { title: /404 Not Found/i },
            { title: /Page Not Found/i },
            { title: /AJIO/ },
            { title: /NetMeds/i },
            { title: /Online Furniture Shopping/i },
            { store: 'Unknown Store' }
        ]
    });
    console.log("Deleted:", res);
    process.exit(0);
}
clean();
