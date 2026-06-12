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
          if (req.url.startsWith('/api') || req.url.includes('.') || req.url.includes('/socket.io')) return next();
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

            const { render } = await server.ssrLoadModule('/src/entry-server.jsx');
            const { html, helmet } = await render(req.url, preloadedDeals, preloadedCategories);
            
            const helmetTags = helmet ? [
                helmet.title?.toString() || '',
                helmet.meta?.toString() || '',
                helmet.link?.toString() || ''
            ].filter(Boolean).join('\n') : '';

            const ssrDataScript = `<script>
                window.__INITIAL_DATA__ = ${JSON.stringify(preloadedDeals)};
                window.__INITIAL_CATEGORIES__ = ${JSON.stringify(preloadedCategories)};
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
      }
    }
  }
});
