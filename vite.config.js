
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

function reactSSRPlugin() {
    return {
        name: 'native-react-ssr',
        configureServer(server) {
            // Register as a pre-middleware (before Vite's internal HTML server)
            server.middlewares.use(async (req, res, next) => {
                const url = req.originalUrl || '/';
                const pathName = url.split('?')[0];

                // Whitelist logic for SSR routes
                const isSsrRoute = pathName === '/' || 
                                   pathName === '/index.html' ||
                                   pathName.startsWith('/deals') || 
                                   pathName.startsWith('/product/') || 
                                   pathName.startsWith('/blog') || 
                                   pathName.startsWith('/stores') || 
                                   pathName.startsWith('/wishlist') || 
                                   pathName.startsWith('/admin') ||
                                   pathName.startsWith('/dashboard');

                if (req.method !== 'GET' || !isSsrRoute) {
                    return next();
                }

                try {
                    let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
                    template = await server.transformIndexHtml(url, template);

                    let preloadedDeals = [];
                    let preloadedCategories = [];
                    try {
                        const apiBase = 'http://127.0.0.1:5000/api/deals';
                        // Add a short timeout to prevent hanging the render
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);
                        
                        const [dRes, cRes] = await Promise.all([
                            fetch(apiBase, { signal: controller.signal }),
                            fetch(`${apiBase}/categories`, { signal: controller.signal })
                        ]).catch(() => [ { ok: false }, { ok: false } ]);
                        clearTimeout(timeoutId);

                        if (dRes.ok) preloadedDeals = await dRes.json();
                        if (cRes.ok) preloadedCategories = await cRes.json();
                    } catch (e) {
                         const { INITIAL_DEALS, INITIAL_CATEGORIES } = await server.ssrLoadModule('/src/data/initialDeals.js');
                         preloadedDeals = INITIAL_DEALS;
                         preloadedCategories = INITIAL_CATEGORIES || [];
                    }

                    const { render } = await server.ssrLoadModule('/src/entry-server.jsx');
                    const { html, helmet } = await render(url, preloadedDeals, preloadedCategories);
                    const helmetTags = helmet ? `${helmet.title?.toString() || ''}${helmet.meta?.toString() || ''}${helmet.link?.toString() || ''}` : '';

                    const ssrDataScript = `
                    <script id="__SSR_DATA__">
                        window.__INITIAL_DATA__ = ${JSON.stringify(preloadedDeals).replace(/</g, '\\u003c')};
                        window.__INITIAL_CATEGORIES__ = ${JSON.stringify(preloadedCategories).replace(/</g, '\\u003c')};
                    </script>`;

                    // Aggressive replacements using Broad Regex and function-based injection to avoid $ expansion issues
                    let finalHtml = template
                        .replace(/<!--\s*ssr-outlet\s*-->/gi, () => html)
                        .replace(/<!--\s*ssr-data\s*-->/gi, () => ssrDataScript)
                        .replace(/<\/head>/i, () => `${helmetTags}</head>`)
                        .replace(/<div\s+id=["']root["']\s*>/gi, () => '<div id="root" data-ssr-status="active">');

                    console.log(`[SSR ENGINE] Success: ${url} (Yield: ${html.length} chars)`);
                    
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html');
                    res.setHeader('X-SSR-Status', 'active-v3');
                    return res.end(finalHtml);
                } catch (err) {
                    console.error('[SSR ENGINE ERROR]', err);
                    server.ssrFixStacktrace(err);
                    next();
                }
            });
        }
    }
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), reactSSRPlugin()],
    server: {
        host: '127.0.0.1',
        port: 5173,
        hmr: {
            overlay: false
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    ssr: {
        noExternal: true
    },
    build: {
        target: 'es2015'
    }
})
