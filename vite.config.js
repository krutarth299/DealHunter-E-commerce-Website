
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs';
import path from 'path';

function seoPlugin() {
    return {
        name: 'html-seo-inject-middleware',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                let url = req.originalUrl || req.url || '/';
                const withoutQuery = url.split('?')[0];

                // Skip static assets, APIs, and dev files
                if (req.method !== 'GET' || withoutQuery.includes('.') || withoutQuery.startsWith('/@') || withoutQuery.startsWith('/src') || withoutQuery.startsWith('/node_modules') || withoutQuery.startsWith('/api')) {
                    return next();
                }

                // ONLY run SSR if explicitly requested via ?seo=true or if it's a known crawler
                // This prevents the "laggy" feeling during normal development/browsing
                const isSeoRequest = url.includes('seo=true');
                const userAgent = req.headers['user-agent'] || '';
                const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(userAgent);

                if (!isSeoRequest && !isBot) {
                    return next();
                }

                // If this request comes from our own Puppeteer bot, bypass to let Vite serve the raw React App
                if (req.headers['x-ssr-bot']) {
                    return next();
                }

                try {
                    // Import the SSR Engine dynamically to avoid ESM/CJS conflicts at top level
                    // Our server/ssrEngine.js is CommonJS exported
                    const ssrEngineUrl = path.resolve(__dirname, 'server', 'ssrEngine.js');
                    if (fs.existsSync(ssrEngineUrl)) {
                        const { renderReactSSR } = await import('file://' + encodeURI(ssrEngineUrl.replace(/\\/g, '/')));
                        
                        // Let puppeteer fetch from localhost 5173 
                        const port = server.config.server.port || 5173;
                        console.log('[Vite SSR] Requesting Puppeteer render for:', url);
                        
                        const html = await renderReactSSR(url, port);
                        
                        if (html) {
                            res.setHeader('Content-Type', 'text/html');
                            res.setHeader('Cache-Control', 'no-store, max-age=0');
                            res.statusCode = 200;
                            res.end(html);
                            return;
                        }
                    }
                } catch(err) {
                    console.error('[Vite SSR Error] Puppeteer failed, falling back to CSR:', err);
                }

                next();
            });
        }
    }
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), seoPlugin()],
    server: {
        host: '127.0.0.1',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    build: {
        target: 'es2015'
    }
})
