export async function extractMyntra(page) {
    await page.waitForSelector('.pdp-title', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    return await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || '';
        
        // Multiple images for Myntra
        const imageList = [];
        document.querySelectorAll(".image-grid-image").forEach(el => {
            const bg = el.style.backgroundImage;
            if (bg && bg.includes('url')) {
                imageList.push(bg.slice(5, -2));
            } else if (el.src && el.src.startsWith('http')) {
                imageList.push(el.src);
            }
        });

        const brand = getText(".pdp-title");
        const name = getText(".pdp-name");
        const title = brand ? `${brand} ${name}` : name;

        return {
            title: title,
            store: "Myntra",
            category: (() => {
                let cat = getText(".breadcrumbs-breadcrumb") || getText(".breadcrumbs-link") || getText(".breadcrumbs-item") || getText(".breadcrumbs-list");
                if (!cat) {
                    const links = Array.from(document.querySelectorAll('[class*="breadcrumb"] a, [class*="Breadcrumb"] a'));
                    if (links.length > 0) {
                        cat = links.map(a => a.innerText.trim()).filter(Boolean).join(' > ');
                    }
                }
                if (!cat) {
                    cat = getText(".breadcrumbs-base") || getText(".breadcrumbs-container");
                }
                if (!cat) {
                    // Script tag fallback (Myntra often has schema.org BreadcrumbList)
                    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                    for (const script of scripts) {
                        try {
                            const data = JSON.parse(script.innerText);
                            if (data['@type'] === 'BreadcrumbList' && data.itemListElement) {
                                cat = data.itemListElement.map(el => el.name || el.item?.name).filter(Boolean).join(' > ');
                                break;
                            }
                        } catch(e) {}
                    }
                }
                if (!cat) {
                    // URL Fallback
                    const pathParts = window.location.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        cat = pathParts[0].split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                    }
                }
                return cat || "Fashion";
            })(),
            description: getText(".pdp-product-description-content"),
            mrp: getText(".pdp-mrp"),
            price: getText(".pdp-price"),
            images: [...new Set(imageList)]
        };
    });
}
