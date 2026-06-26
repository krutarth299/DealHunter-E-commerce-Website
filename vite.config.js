import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-ssr',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const accept = req.headers.accept || '';
          if (
            !accept.includes('text/html') ||
            req.url.startsWith('/api') ||
            req.url.includes('/socket.io') ||
            req.url.includes('sitemap') ||
            req.url === '/robots.txt'
          ) {
            return next();
          }

          try {
            let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
            template = await server.transformIndexHtml(req.url, template);

            let preloadedDeals = [];
            let preloadedCategories = [];
            try {
              // Fetch data from local backend API to populate SSR
              const apiRes = await fetch('http://127.0.0.1:5000/api/deals/homepage');
              if (apiRes.ok) {
                const data = await apiRes.json();
                if (data.success && data.data) {
                  preloadedDeals = data.data.deals || [];
                  preloadedCategories = data.data.categories || [];
                }
              }
            } catch (err) {
              console.error('[Dev SSR] Failed to fetch data from backend:', err.message);
            }

            let ssrBlogDataScript = '';
            
            console.log('[Dev SSR] Handling URL:', req.url);

            try {
              if (req.url === '/blog' || req.url === '/blog/') {
                  const apiRes = await fetch('http://127.0.0.1:5000/api/blog?limit=100');
                  if (apiRes.ok) {
                      const data = await apiRes.json();
                      global.__INITIAL_BLOGS__ = data.items || [];
                      ssrBlogDataScript += `\nwindow.__INITIAL_BLOGS__ = ${JSON.stringify(data.items || []).replace(/</g, '\\u003c')};`;
                  }
              } else if (req.url.startsWith('/blog/')) {
                  const slug = req.url.split('/')[2];
                  if (slug) {
                      const apiRes = await fetch(`http://127.0.0.1:5000/api/blog/${slug}`);
                      if (apiRes.ok) {
                          const data = await apiRes.json();
                          global.__INITIAL_BLOG__ = data;
                          ssrBlogDataScript += `\nwindow.__INITIAL_BLOG__ = ${JSON.stringify(data).replace(/</g, '\\u003c')};`;
                      }
                  }
              } else if (req.url === '/freebies' || req.url === '/freebies/') {
                  const apiRes = await fetch('http://127.0.0.1:5000/api/freebies');
                  if (apiRes.ok) {
                      const data = await apiRes.json();
                      global.__INITIAL_FREEBIES__ = data || { items: [], types: [] };
                      ssrBlogDataScript += `\nwindow.__INITIAL_FREEBIES__ = ${JSON.stringify(data || { items: [], types: [] }).replace(/</g, '\\u003c')};`;
                  }
              } else if (req.url.startsWith('/freebies/')) {
                  const slug = req.url.split('/')[2];
                  if (slug) {
                      const apiRes = await fetch(`http://127.0.0.1:5000/api/freebies/${slug}`);
                      if (apiRes.ok) {
                          const data = await apiRes.json();
                          global.__INITIAL_FREEBIE__ = data;
                          ssrBlogDataScript += `\nwindow.__INITIAL_FREEBIE__ = ${JSON.stringify(data).replace(/</g, '\\u003c')};`;
                      }
                  }
              }
            } catch (err) {
              console.error('[Dev SSR] Failed to fetch blog data:', err.message);
            }

            const { render } = await server.ssrLoadModule('/src/entry-server.jsx');
            const { html, helmet } = await render(req.url, preloadedDeals, preloadedCategories);

            delete global.__INITIAL_BLOGS__;
            delete global.__INITIAL_BLOG__;
            delete global.__INITIAL_FREEBIES__;
            delete global.__INITIAL_FREEBIE__;

            const helmetTags = helmet ? [
              helmet.title?.toString() || '',
              helmet.meta?.toString() || '',
              helmet.link?.toString() || '',
              helmet.script?.toString() || ''
            ].filter(Boolean).join('\n') : '';

            const ssrDataScript = `<script>
                window.__INITIAL_DATA__ = ${JSON.stringify(preloadedDeals)};
                window.__INITIAL_CATEGORIES__ = ${JSON.stringify(preloadedCategories)};${ssrBlogDataScript}
            </script>`;

            template = template
              .replace(/<!--\s*ssr-head\s*-->/gi, () => helmetTags)
              .replace(/<!--\s*ssr-outlet\s*-->/gi, () => html)
              .replace(/<!--\s*ssr-data\s*-->/gi, () => ssrDataScript)
              .replace(/<div\s+id=["']root["']\s*>/gi, () => '<div id="root" data-ssr-status="active">');

            res.setHeader('Content-Type', 'text/html');
            res.end(template);
          } catch (e) {
            server.ssrFixStacktrace(e);
            next(e);
          }
        });
      }
    }
  ],

  ssr: {
    noExternal: ['react-helmet-async']
  },

  server: {
    host: "127.0.0.1",
    port: 5173,

    watch: {
      usePolling: false,
      interval: 1000
    },

    hmr: {
      overlay: false
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000
      },
      "/socket.io": {
        target: "http://127.0.0.1:5000",
        ws: true
      },
      "^/sitemap.*": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      },
      "/robots.txt": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      }
    }
  }
});
