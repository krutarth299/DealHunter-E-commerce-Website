import { extractProduct } from './extractors/index.js';

const urls = {
    amazon: 'https://www.amazon.in/Apple-iPhone-13-128GB-Starlight/dp/B09G9D8KRQ',
    flipkart: 'https://www.flipkart.com/apple-iphone-13-starlight-128-gb/p/itmc9604f122ae7f',
    myntra: 'https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/1996777/buy',
    nykaa: 'https://www.nykaa.com/nykaa-cosmetics-matte-to-last-liquid-lipstick/p/309489',
    croma: 'https://www.croma.com/apple-iphone-13-128gb-starlight-/p/244424',
    reliancedigital: 'https://www.reliancedigital.in/apple-iphone-13-128-gb-starlight/p/491997699',
    snapdeal: 'https://www.snapdeal.com/product/bhawna-collection-loard-shiv-trishul/642921094034'
};

async function testAll() {
    for (const [store, url] of Object.entries(urls)) {
        console.log(`\n--- Testing ${store} ---`);
        try {
            const result = await extractProduct(url);
            if (!result.success) {
                console.error(`[FAIL] ${store}: ${result.message}`);
            } else {
                console.log(`[PASS] ${store} - Title: ${result.data.title.substring(0,30)} | Price: ${result.data.dealPrice}`);
            }
        } catch(err) {
             console.error(`[CRASH] ${store}: ${err.message}`);
        }
    }
    process.exit(0);
}
testAll();
