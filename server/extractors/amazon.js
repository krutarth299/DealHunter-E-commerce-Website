import * as cheerio from 'cheerio';

export async function extractAmazon(page) {
    // Wait for the product title to guarantee core DOM is ready
    await page.waitForSelector('#productTitle', { timeout: 15000 }).catch(() => {});
    
    // Wait a brief moment for dynamic scripts to inject prices if any
    await new Promise(r => setTimeout(r, 2000));

    let html;
    try {
        html = await page.content();
    } catch (e) {
        console.log("Could not get page content directly, page might have crashed.");
        return { success: false, message: e.message };
    }

    const $ = cheerio.load(html);
    const getText = (sel) => $(sel).first().text().trim();

    // Image extraction
    const imageList = [];
    
    // THUMBNAILS
    $("#altImages img").each((i, img) => {
        let src = $(img).attr("src");
        if (!src) return;
        src = src.replace(/\._.*_\./, "."); // Get full resolution
        if (src.includes("m.media-amazon.com")) {
            imageList.push(src);
        }
    });

    // MAIN IMAGE
    const landing = $("#landingImage");
    if (landing.length > 0) {
        let dyn = landing.attr("data-a-dynamic-image");
        if (dyn) {
            try {
                const parsed = JSON.parse(dyn);
                const keys = Object.keys(parsed);
                if (keys.length > 0) {
                    imageList.unshift(keys[0]);
                }
            } catch(e){}
        } else {
            let main = landing.attr("src");
            if (main) {
                main = main.replace(/\._.*_\./, ".");
                imageList.unshift(main);
            }
        }
    }

    const finalImages = [...new Set(imageList)];

    // Price extraction
    const getPriceText = () => {
        const selectors = [
            "#corePriceDisplay_desktop_feature_div .a-price-whole",
            "#corePriceDisplay_desktop_feature_div .a-offscreen",
            "#corePrice_desktop .a-price-whole",
            "#corePrice_desktop .a-offscreen",
            ".a-price .a-offscreen",
            ".a-price-whole",
            "#priceblock_ourprice",
            "#priceblock_dealprice"
        ];
        for (const sel of selectors) {
            const txt = $(sel).first().text().trim();
            if (txt && txt.replace(/[^\d]/g, '')) return txt;
        }
        return '';
    };

    const rawPrice = getPriceText().replace(/[\.,]\d{2}$/, '').replace(/[^\d]/g, '');

    // MRP extraction
    const getMrpText = () => {
        const selectors = [
            ".a-text-strike",
            ".aok-nowrap.a-text-strike",
            "#corePriceDisplay_desktop_feature_div .a-text-price span[aria-hidden='true']",
            "#corePriceDisplay_desktop_feature_div .a-price.a-text-price .a-offscreen",
            "#corePrice_desktop .a-text-price span[aria-hidden='true']",
            "span.a-price.a-text-price span.a-offscreen"
        ];
        for (const sel of selectors) {
            const txt = $(sel).first().text().trim();
            if (txt && txt.replace(/[^\d]/g, '')) return txt;
        }
        return '';
    };

    const rawMrp = getMrpText().replace(/[\.,]\d{2}$/, '').replace(/[^\d]/g, '');

    return {
        title: getText("#productTitle"),
        store: "Amazon",
        category: getText("#wayfinding-breadcrumbs_feature_div"),
        description: getText("#feature-bullets"),
        mrp: rawMrp,
        price: rawPrice,
        images: finalImages
    };
}
