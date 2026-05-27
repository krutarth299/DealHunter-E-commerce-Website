import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractRelianceDigital } from './extractors/reliancedigital.js';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    const link = 'https://www.reliancedigital.in/voltas-1-5-ton-3-star-inverter-split-ac-183v-vectra-platina-100-grooved-copper-4-way-swing-/p/493838274';
    
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 8000)); // allow SPA to render
    
    try {
        const data = await extractRelianceDigital(page);
        console.log('EXTRACTED DATA:', JSON.stringify(data, null, 2));
    } catch(err) {
        console.error(err);
    }
    
    await browser.close();
}
run();
