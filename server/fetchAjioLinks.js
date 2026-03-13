/**
 * ============================================================
 * Ajio Link Fetcher (Sitemap Crawler)
 * ============================================================
 * Follows Ajio's robots.txt instructions to fetch product links
 * through their official sitemaps.
 * ============================================================
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function fetchAjioLinks(limit = 20) {
    console.log('=================================================');
    console.log(' Ajio Link Fetcher - "Requesting Access"');
    console.log(' Following robots.txt & Sitemap guidelines...');
    console.log('=================================================');

    const sitemapUrl = 'https://www.ajio.com/medias/sys_master/sitemap/sitemap/Product-en-INR/Product-en-INR.xml';

    try {
        console.log(`\n[Sitemap] Fetching product list from: ${sitemapUrl}`);
        const res = await fetch(sitemapUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.google.com/'
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} - Access Denied by Ajio Protection`);
        }

        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        const links = [];

        $('loc').each((i, el) => {
            if (links.length < limit) {
                links.push($(el).text());
            }
        });

        console.log(`\n[SUCCESS] Successfully "negotiated" with Ajio's bot rules.`);
        console.log(`Found ${links.length} product links ready for extraction:\n`);

        links.forEach((link, idx) => {
            console.log(`${idx + 1}. ${link}`);
        });

        return links;
    } catch (err) {
        console.error(`\n[ERROR] Bot interaction failed: ${err.message}`);
        console.log('Possible cause: Akamai IP block or required cookies not present.');
    }
}

fetchAjioLinks(15);
