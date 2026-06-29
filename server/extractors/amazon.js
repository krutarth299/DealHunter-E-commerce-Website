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
        if (!src || src.includes('load_indicator_spinner') || src.includes('transparent-pixel')) return;
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

    // Helper to clean price strings
    const extractNumClean = (str) => {
        const match = String(str).match(/[0-9,]+(\.[0-9]+)?/);
        return match ? String(Math.round(parseFloat(match[0].replace(/,/g, '')))) : '';
    };

    // Robust Heuristic Price extraction
    const getPrices = () => {
        let prices = new Set();
        
        // Find the main product container
        let searchArea = $('body');
        const containers = ['#corePriceDisplay_desktop_feature_div', '#corePrice_desktop', '#centerCol', '#desktop_buybox'];
        for (const c of containers) {
            if ($(c).length > 0 && $(c).text().trim().length > 0) {
                searchArea = $(c);
                break;
            }
        }

        const selectors = [
            '.a-price-whole', 
            '.a-offscreen', 
            '.a-text-strike', 
            '.a-text-price span[aria-hidden="true"]',
            '#priceblock_ourprice',
            '#priceblock_dealprice'
        ];

        for (const sel of selectors) {
            searchArea.find(sel).each((i, el) => {
                const $el = $(el);
                // Skip related products, carousels, and hidden expanders
                if ($el.closest('.a-carousel').length === 0 && 
                    $el.closest('.a-expander-content').length === 0 &&
                    $el.closest('[id*="sims-consolidated"]').length === 0 &&
                    $el.closest('[data-a-carousel-options]').length === 0) {
                    
                    const num = extractNumClean($el.text());
                    if (num) prices.add(parseInt(num));
                }
            });
        }

        const priceArr = Array.from(prices).filter(p => p > 0).sort((a, b) => a - b);
        let dealPrice = '';
        let mrp = '';

        if (priceArr.length > 0) {
            dealPrice = String(priceArr[0]);
            mrp = String(priceArr[priceArr.length - 1]);
        }

        return { price: dealPrice, mrp: mrp };
    };

    const extracted = getPrices();
    let finalMrp = extracted.mrp;
    let finalPrice = extracted.price;

    // Ensure MRP is valid relative to Deal Price
    if (!finalMrp || parseInt(finalMrp) <= parseInt(finalPrice)) {
        finalMrp = finalPrice; // If no strike price, MRP = Deal Price
    }

    return {
        title: getText("#productTitle"),
        store: "Amazon",
        category: getText("#wayfinding-breadcrumbs_feature_div"),
        description: getText("#feature-bullets"),
        mrp: finalMrp,
        price: finalPrice,
        images: finalImages
    };
}
