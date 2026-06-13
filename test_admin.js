import puppeteer from 'puppeteer';

(async () => {
    console.log('Starting puppeteer...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    page.on('request', req => console.log('REQUEST:', req.url()));
    page.on('response', res => {
        if (!res.ok() || res.headers()['content-type']?.includes('text/html')) {
            console.log('RESPONSE TEXT/HTML OR FAIL:', res.url(), res.headers()['content-type']);
        }
    });

    console.log('Navigating to http://127.0.0.1:5174/admin ...');
    
    try {
        await page.goto('http://127.0.0.1:5174/admin', { waitUntil: 'networkidle2', timeout: 10000 });
        console.log('Page loaded successfully!');
        
        const content = await page.content();
        console.log('HTML Length:', content.length);
        
        // Check if root is empty
        const rootContent = await page.$eval('#root', el => el.innerHTML).catch(() => 'ROOT NOT FOUND');
        console.log('Root content length:', rootContent.length);
        if (rootContent.length < 100) {
            console.log('Root content preview:', rootContent);
        }
        
    } catch (e) {
        console.log('Navigation failed:', e.message);
    }

    await browser.close();
})();
