/**
 * Scraper Utilities for DealSphere
 * Provides common helper functions for headless browser automation and bot detection evasion.
 */

/**
 * Pause execution for a specified duration.
 * @param {number} ms - Milliseconds to sleep.
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Curated browser profiles with realistic User-Agents and viewports.
 */
export const PROFILES = [
    {
        name: 'Desktop Chrome Windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
    },
    {
        name: 'Desktop Chrome Mac',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 }
    },
    {
        name: 'Desktop Edge Windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
        viewport: { width: 1366, height: 768 }
    },
    {
        name: 'Desktop Firefox Windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        viewport: { width: 1536, height: 864 }
    }
];

/**
 * Retrieve a random browser profile from the PROFILES list.
 * @returns {Object} A profile object containing name, userAgent, and viewport.
 */
export const getRandomProfile = () => PROFILES[Math.floor(Math.random() * PROFILES.length)];

/**
 * Inject common stealth properties into a Puppeteer page to evade basic bot detection.
 * Note: Use with puppeteer-extra-plugin-stealth for best results.
 * @param {Object} page - The Puppeteer page object.
 */
export const injectStealth = async (page) => {
    await page.evaluateOnNewDocument(() => {
        // Hide webdriver
        Object.defineProperty(navigator, 'webdriver', { get: () => false });

        // Mock Chrome runtime
        window.chrome = {
            runtime: {},
            app: {},
            csi: () => {},
            loadTimes: () => {}
        };

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
            ]
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
        });

        // Mock hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8
        });

        // Mock device memory
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8
        });
    });
};
