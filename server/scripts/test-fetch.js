import { extractProduct } from '../extractors/index.js';

async function test() {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL to test, e.g.: node scripts/test-fetch.js "https://..."');
        process.exit(1);
    }

    console.log(`Testing extraction for URL: ${url}`);
    const result = await extractProduct(url);
    console.log('\n--- Extraction Result ---');
    console.log(JSON.stringify(result, null, 2));
}

test();
