const http = require('http');
const https = require('https');
const fs = require('fs');
const zlib = require('zlib');

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchUrl(res.headers.location));
            }
            let stream = res;
            if (res.headers['content-encoding'] === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            }
            let data = '';
            stream.on('data', chunk => data += chunk);
            stream.on('end', () => resolve(data));
            stream.on('error', err => reject(err));
        }).on('error', err => reject(err));
    });
}

async function getLinks() {
    try {
        console.log("Fetching FirstCry sitemap...");
        const fc = await fetchUrl('https://www.firstcry.com/sitemaps/product/product-detail-2.xml');
        const fcLinks = [...fc.matchAll(/<loc>(https:\/\/www\.firstcry\.com\/[^\/]+\/[^\/]+\/\d+\/product-detail)<\/loc>/g)].map(m => m[1]);
        console.log("FirstCry Link:", fcLinks[0] || "None");

        console.log("\nFetching Reliance Digital sitemap...");
        const rd = await fetchUrl('https://www.reliancedigital.in/sitemap.xml');
        // usually points to other sitemaps like product sitemap
        const rdMaps = [...rd.matchAll(/<loc>(https:\/\/www\.reliancedigital\.in\/[^<]*product[^<]*)<\/loc>/gi)].map(m => m[1]);
        if (rdMaps.length > 0) {
            const rdProdMap = await fetchUrl(rdMaps[rdMaps.length-1]);
            const rdLinks = [...rdProdMap.matchAll(/<loc>(https:\/\/www\.reliancedigital\.in\/[^\/]+\/p\/\d+)<\/loc>/gi)].map(m => m[1]);
            console.log("Reliance Link:", rdLinks[0] || "None");
        } else {
            console.log("Reliance product sitemap not found.");
        }

        console.log("\nFetching Snapdeal sitemap...");
        const sd = await fetchUrl('https://www.snapdeal.com/sitemap/sitemap.xml');
        const sdMaps = [...sd.matchAll(/<loc>(https:\/\/www\.snapdeal\.com\/sitemap\/product[^<]*)<\/loc>/gi)].map(m => m[1]);
        if (sdMaps.length > 0) {
            const sdProdMap = await fetchUrl(sdMaps[sdMaps.length-1]);
            const sdLinks = [...sdProdMap.matchAll(/<loc>(https:\/\/www\.snapdeal\.com\/product\/[^\/]+\/\d+)<\/loc>/gi)].map(m => m[1]);
            console.log("Snapdeal Link:", sdLinks[0] || "None");
        } else {
            console.log("Snapdeal product sitemap not found.");
        }

        console.log("\nFetching TataCliq sitemap...");
        const tc = await fetchUrl('https://www.tatacliq.com/sitemap.xml');
        const tcMaps = [...tc.matchAll(/<loc>(https:\/\/www\.tatacliq\.com\/sitemap_products[^<]*)<\/loc>/gi)].map(m => m[1]);
        if (tcMaps.length > 0) {
            const tcProdMap = await fetchUrl(tcMaps[tcMaps.length-1]);
            const tcLinks = [...tcProdMap.matchAll(/<loc>(https:\/\/www\.tatacliq\.com\/[^\/]+\/p-mp\d+)<\/loc>/gi)].map(m => m[1]);
            console.log("TataCliq Link:", tcLinks[0] || "None");
        } else {
            console.log("TataCliq product sitemap not found.");
        }
        
    } catch(e) {
        console.error("Error:", e.message);
    }
}

getLinks();
