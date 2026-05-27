export async function extractAmazon(page) {
    // Manual wait to let Amazon's heavy scripts inject dynamic content
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Wait for the product title to guarantee core DOM is ready
    await page.waitForSelector('#productTitle', { timeout: 20000 }).catch(() => {});

    // Wait for the dynamic image to fully populate
    await page.waitForFunction(() => {
        const img = document.querySelector("#landingImage");
        return img && img.getAttribute("data-a-dynamic-image");
    }, { timeout: 15000 }).catch(() => {});

    return await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || '';
        
        // Image extraction (REAL PRODUCT GALLERY STRATEGY)
        const imageList = [];
        
        // REAL PRODUCT GALLERY THUMBNAILS
        const thumbs = document.querySelectorAll("#altImages img");
        thumbs.forEach(img => {
            let src = img.src || img.getAttribute("src");
            if (!src) return;

            // REMOVE SMALL SIZE
            src = src.replace(/\._.*_\./, ".");

            // ONLY AMAZON CDN
            if (src.includes("m.media-amazon.com")) {
                imageList.push(src);
            }
        });

        // MAIN IMAGE FALLBACK
        const landing = document.querySelector("#landingImage");
        if (landing?.src) {
            let main = landing.src.replace(/\._.*_\./, ".");
            imageList.unshift(main);
        }

        const finalImages = [...new Set(imageList)];

        // Price cleaning
        const rawPrice = getText(".a-price-whole").replace(/[^\d]/g, '');
        const rawMrp = (getText(".a-price.a-text-price span[aria-hidden='true']") || getText(".priceBlockStrikePriceString")).replace(/[^\d]/g, '');

        return {
            title: getText("#productTitle"),
            store: "Amazon",
            category: getText("#wayfinding-breadcrumbs_feature_div"),
            description: getText("#feature-bullets"),
            mrp: rawMrp,
            price: rawPrice,
            images: finalImages
        };
    });
}
