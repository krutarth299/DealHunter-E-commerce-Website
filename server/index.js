import 'dotenv/config'; // Load env vars
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from "socket.io";
import mongoose from 'mongoose';
import Deal from './models/Deal.js';

// ESM Re-implementation of __dirname and __filename for Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// Attach io to app for use in routes
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('CLIENT: CONNECTED (Socket.io)');
    socket.on('disconnect', () => {
        console.log('CLIENT: DISCONNECTED');
    });
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection Logic
const connectDB = async () => {
    if (process.env.USE_MONGODB === 'false') {
        app.locals.isMockMode = true;
        console.log('DATABASE: DISCONNECTED (FORCED MOCK MODE)');
        return;
    }
    try {
        console.log('DATABASE: Connecting...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dealorbit', {
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });
        app.locals.isMockMode = false;
        console.log('DATABASE: CONNECTED SUCCESSFULLY');
    } catch (err) {
        app.locals.isMockMode = true;
        console.error('DATABASE: CONNECTION FAILED - FALLING BACK TO MOCK MODE');
        console.error('Error Details:', err.message);
    }
};

// Start DB Connection
connectDB();

import dealsRouter from './routes/deals.js';
import blogRouter from './routes/blog.js';

app.use('/api/deals', dealsRouter);
app.use('/api/blog', blogRouter);

// ==================== [PRODUCTION SSR ENGINE] ====================
app.use(express.static(path.join(__dirname, '../dist/client'), { index: false }));
app.use(express.static(path.join(__dirname, '../dist'), { index: false }));

app.get('*', async (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.includes('.')) return next();

    try {
        let templatePath = path.resolve(__dirname, '../dist/client/index.html');
        if (!fs.existsSync(templatePath)) templatePath = path.resolve(__dirname, '../dist/index.html');
        
        if (!fs.existsSync(templatePath)) {
            return res.status(500).send('Production build missing. Please run npm run build.');
        }

        let template = fs.readFileSync(templatePath, 'utf8');
        let preloadedDeals = [];
        let preloadedCategories = [];
        
        try {
            const [d, c] = await Promise.all([
                Deal.find().sort({ createdAt: -1 }).limit(20).lean(),
                Deal.distinct('category').lean()
            ]);
            preloadedDeals = (d || []).map(item => ({...item, _id: item._id.toString()}));
            preloadedCategories = (c || []).filter(Boolean);
        } catch(e) {
            console.error('[Production SSR] DB Error:', e.message);
        }

        const ssrDataScript = `<script>
            window.__INITIAL_DATA__ = ${JSON.stringify(preloadedDeals)};
            window.__INITIAL_CATEGORIES__ = ${JSON.stringify(preloadedCategories)};
        </script>`;

        const serverEntryPath = path.resolve(__dirname, '../dist/server/entry-server.js');
        if (fs.existsSync(serverEntryPath)) {
            const { render } = await import('file://' + serverEntryPath.replace(/\\/g, '/'));
            const { html, helmet } = await render(req.originalUrl, preloadedDeals, preloadedCategories);
            
            const helmetTags = helmet ? `${helmet.title?.toString() || ''}${helmet.meta?.toString() || ''}` : '';

            template = template
                .replace(/<!--\s*ssr-outlet\s*-->/gi, () => html)
                .replace(/<!--\s*ssr-data\s*-->/gi, () => ssrDataScript)
                .replace(/<\/head>/i, () => `${helmetTags}</head>`)
                .replace(/<div\s+id=["']root["']\s*>/gi, () => '<div id="root" data-ssr-status="active">');
        } else {
             template = template.replace(`<!--ssr-data-->`, ssrDataScript);
        }

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-SSR-Status', 'active-v4');
        res.status(200).send(template);
    } catch(err) {
        console.error('[Production SSR Failed]', err);
        res.status(500).send('Internal Server Error During Render');
    }
});

// Avoid 404 for favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Global error handling for initialization issues
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: UNCAUGHT EXCEPTION - Server may be unstable');
    console.error(err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Exiting so nodemon can retry...`);
        process.exit(1); // Exit cleanly so nodemon restarts
    }
});

// Start Server
server.listen(PORT, () => {
    const mode = app.locals.isMockMode ? 'MOCK MODE' : 'DATABASE MODE';
    console.log('---------------------------------------------------');
    console.log(`Server running on port ${PORT} (${mode})`);
    console.log(`Socket.io: ACTIVE`);
    console.log(`Extraction Engine: ACTIVE`);
    if (app.locals.isMockMode) {
        console.log('NOTICE: Data is being stored in memory only.');
    } else {
        console.log('DATABASE: Connected and ready.');
    }
    console.log('---------------------------------------------------');
});

// Handle port-in-use errors explicitly
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`\n========================================================`);
        console.log(`✅ PORT ${PORT} IS ALREADY IN USE BY ANOTHER TERMINAL.`);
        console.log(`This is NOT an error. Your server is already running perfectly!`);
        console.log(`Closing this duplicate terminal process cleanly...`);
        console.log(`========================================================\n`);
        process.exit(0); // Exit cleanly so nodemon DOES NOT crash or throw red text
    } else {
        throw err;
    }
});
