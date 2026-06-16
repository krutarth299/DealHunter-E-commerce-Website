import { extractProduct } from './server/extractors/index.js';

const TEST_URLS = {
  amazon1: 'https://www.amazon.in/boAt-Airdopes-141-Playtime-Resistance/dp/B09N3ZNHTY/',
  amazon2: 'https://www.amazon.in/All-new-Echo-Dot-4th-Gen/dp/B084K8S25N/',
  // flipkart: 'https://www.flipkart.com/leiox-silicone-press-release-earbuds-case-vivo-tws-3e-buds/p/itmab5e4d4fc3400?pid=HPPH7ZEQPHG8AUBF&lid=LSTHPPH7ZEQPHG8AUBFCIWC95&marketplace=FLIPKART',
  // croma: 'https://www.croma.com/apple-iphone-15-128gb-black-/p/300652',
  // reliancedigital: 'https://www.reliancedigital.in/apple-iphone-15-128-gb-black-/p/493832004',
  // firstcry: 'https://www.firstcry.com/pampers/pampers-premium-care-pants-diapers-medium-60-pieces/15291249/product-detail',
  // myntra: 'https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/1996777/buy'
};

async function testAll() {
  const results = {};
  
  for (const [store, url] of Object.entries(TEST_URLS)) {
    console.log(`\n================================`);
    console.log(`Testing ${store}...`);
    console.log(`URL: ${url}`);
    try {
      const res = await extractProduct(url);
      console.log(`Result for ${store}:`, JSON.stringify(res, null, 2));
      results[store] = res;
    } catch (e) {
      console.error(`Error testing ${store}:`, e.message);
      results[store] = { success: false, error: e.message };
    }
  }

  console.log(`\n================================`);
  console.log(`Testing complete!`);
  process.exit(0);
}

testAll();
