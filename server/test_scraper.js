import { extractProduct } from './extractors/index.js';
(async () => {
    try {
        const product = await extractProduct('https://www.amazon.in/dp/B0FKHBN2M5', 'amazon');
        console.log(JSON.stringify(product, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
