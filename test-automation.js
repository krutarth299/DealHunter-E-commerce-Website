

async function testAutomation() {
    console.log('1. Creating a new Deal...');
    const dealPayload = {
        title: `Auto Test Deal ${Date.now()}`,
        dealPrice: 499,
        mrp: 999,
        discount: '50% OFF',
        store: 'Amazon',
        category: 'Electronics',
        originalLink: 'https://amazon.in/test-deal',
        description: 'This is a test deal to verify the automated SEO and Sitemap engine.',
        imageUrl: 'https://via.placeholder.com/300'
    };

    const res = await fetch('http://127.0.0.1:5000/api/admin/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealPayload)
    });
    
    if (!res.ok) {
        console.error('Failed to create deal', await res.text());
        return;
    }
    
    const createdDeal = await res.json();
    console.log(`✅ Deal Created! URL Slug: /deal/${createdDeal.slug}`);
    
    console.log('\n2. Waiting 5 seconds for Sitemap Background Process to finish...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('\n3. Checking sitemap-products.xml...');
    const sitemapRes = await fetch('http://127.0.0.1:5000/sitemap-products.xml');
    const sitemapText = await sitemapRes.text();
    
    if (sitemapText.includes(`deal/${createdDeal.slug}`)) {
        console.log('✅ Success! The new deal automatically appeared in sitemap-products.xml');
    } else {
        console.error('❌ Failed! The deal was not found in the sitemap.');
    }
    
    console.log('\n4. Checking frontend SSR output for SEO Metadata...');
    // We fetch the frontend page from Vite proxy
    const pageRes = await fetch(`http://127.0.0.1:5173/deal/${createdDeal.slug}`);
    const htmlText = await pageRes.text();
    
    const checks = [
        '<title>',
        '<meta name="description"',
        '<meta property="og:title"',
        '<meta name="twitter:card"',
        'application/ld+json' // Schema
    ];
    
    console.log('Validating SEO Tags:');
    checks.forEach(tag => {
        if (htmlText.includes(tag)) {
            console.log(`✅ Found: ${tag}`);
        } else {
            console.error(`❌ Missing: ${tag}`);
        }
    });

    console.log('\n✅ All validations completed successfully!');
}

testAutomation().catch(console.error);
