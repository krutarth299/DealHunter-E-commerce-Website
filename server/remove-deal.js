import mongoose from 'mongoose';
import fs from 'fs';

async function main() {
    await mongoose.connect('mongodb://localhost:27017/dealsphere');
    const Deal = mongoose.model('Deal', new mongoose.Schema({}, { strict: false, collection: 'deals' }));
    
    const deals = await Deal.find({}, { title: 1, fullTitle: 1, shortTitle: 1, url: 1, originalTitle: 1, productUrl: 1, description: 1 });
    let output = '';
    
    for (const d of deals) {
        output += `ID: ${d._id}\n`;
        output += `Title: ${d.title}\n`;
        output += `FullTitle: ${d.fullTitle}\n`;
        output += `ShortTitle: ${d.shortTitle}\n`;
        output += `OrigTitle: ${d.originalTitle}\n`;
        output += `URL: ${d.url || d.productUrl}\n`;
        output += `Desc: ${String(d.description).substring(0, 50)}\n`;
        output += `-------------------------------------------\n`;
    }
    
    fs.writeFileSync('all-deals-dump.txt', output);
    console.log('Dumped to all-deals-dump.txt');
    
    process.exit(0);
}
main().catch(console.error);
