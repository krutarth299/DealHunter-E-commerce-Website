const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const PROFILES = [
    { type: 'Desktop_Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', platform: 'Win32' },
    { type: 'Mobile_Flipkart', ua: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 FlipkartApp/23.0.0', platform: 'Linux armv8l' },
    { type: 'Mobile_iPhone', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', platform: 'iPhone' },
    { type: 'Mobile_S23', ua: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l' },
    { type: 'Desktop_Mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', platform: 'MacIntel' },
    { type: 'Residential_Win', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', platform: 'Win32' },
    { type: 'Mobile_Myntra', ua: 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36 Myntra/13.0.0', platform: 'Linux armv8l' }
];

const getRandomProfile = () => PROFILES[Math.floor(Math.random() * PROFILES.length)];

const injectStealth = async (page, profile) => {
    const prof = profile || getRandomProfile();
    await page.evaluateOnNewDocument((p) => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {}, loadTimes: function () { }, csi: function () { }, app: {} };

        Object.defineProperty(navigator, 'language', { get: () => 'en-IN' });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-GB', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'platform', { get: () => p.platform || 'Win32' });
        Object.defineProperty(window, 'devicePixelRatio', { get: () => (p.ua.includes('Mobile') ? 3 : 1) });

        // Randomized hardware fingerprints
        const cores = [4, 8, 12, 16];
        const mem = [8, 16, 32];
        const core = cores[Math.floor(Math.random() * cores.length)];
        const memory = mem[Math.floor(Math.random() * mem.length)];
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => core });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => memory });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => (p.ua.includes('Mobile') ? 5 : 0) });

        // Connection API
        const connection = {
            onchange: null,
            effectiveType: '4g',
            rtt: 50,
            downlink: 10,
            saveData: false
        };
        Object.defineProperty(navigator, 'connection', { get: () => connection });

        // AppVersion
        const appVer = p.ua.replace('Mozilla/', '');
        Object.defineProperty(navigator, 'appVersion', { get: () => appVer });

        // Fake plugins/mime types
        const makePlugin = (name, filename, description) => ({
            name, filename, description, 0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: '' }
        });
        const plugins = [
            makePlugin('Chrome PDF Plugin', 'internal-pdf-viewer', 'Portable Document Format'),
            makePlugin('Chrome PDF Viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', 'Portable Document Format'),
            makePlugin('Native Client', 'internal-nacl-plugin', '')
        ];
        Object.defineProperty(navigator, 'plugins', { get: () => plugins });
        Object.defineProperty(navigator, 'mimeTypes', { get: () => ({ length: 1, item: () => ({ type: 'application/pdf' }), namedItem: () => ({ type: 'application/pdf' }) }) });

        // WebGL fingerprinting
        try {
            const getParam = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function (param) {
                if (param === 37445) return 'Intel Inc.';
                if (param === 37446) return 'Intel(R) Iris(TM) Graphics 6100';
                return getParam.call(this, param);
            };
        } catch (_) { }

        // Mute automation detection
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    }, prof);
};

module.exports = {
    sleep,
    PROFILES,
    getRandomProfile,
    injectStealth
};
