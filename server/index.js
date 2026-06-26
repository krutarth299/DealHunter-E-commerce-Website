import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from "socket.io";
import mongoose from 'mongoose';
import { handleSSR } from './ssr-engine.js';
import { requestLogger } from './middlewares/loggerMiddleware.js';
import logger from './utils/logger.js';

// Routers
import dealsRouter from './routes/deals.js';
import blogRouter from './routes/blog.js';
import adminRouter from './routes/admin.js';
import storesRouter from './routes/stores.js';
import sitemapRouter from './routes/sitemap.js';
import freebieRouter from './routes/freebie.js';

import portManager from './utils/portManager.js';
import { extractProduct } from './extractors/index.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

console.log('[SOCKET_INIT] Socket.IO server prepared');


// App configuration
app.set('socketio', io);
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dealsphere', {
            serverSelectionTimeoutMS: 2000
        });
        logger.info('DB', 'Connected to MongoDB');
    } catch (err) {
        logger.error('DB', 'MongoDB connection failed: ' + err.message);
        process.exit(1);
    }
};
connectDB();

// API Routes
app.use('/api/deals', dealsRouter);
app.use('/api/admin/deals', dealsRouter);

// MAGIC FETCH ROUTE (Direct Mount for maximum reliability)
app.post('/api/admin/deals/fetch-deal', async (req, res) => {
    console.log('[MAGIC_FETCH_REQUEST]', req.body.url);
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

        const result = await extractProduct(url);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('[MAGIC_FETCH_ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.use('/api/blog', blogRouter);
app.use('/api/admin', adminRouter);
app.use('/api/stores', storesRouter);
app.use('/api/freebies', freebieRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, timestamp: Date.now() }));

app.use('/', sitemapRouter);

// Static files
app.use(express.static(path.join(__dirname, '../dist/client'), { index: false }));
app.use(express.static(path.join(__dirname, '../dist'), { index: false }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// SSR Engine
app.get('*', handleSSR);

const startServer = async () => {
    const DEFAULT_PORT = process.env.PORT || 5000;
    const resolvedPort = await portManager.setupPort(DEFAULT_PORT);
    
    // Save the port to a shared file for Vite proxy
    try {
        const portConfigPath = path.join(__dirname, '../.server-port.json');
        fs.writeFileSync(portConfigPath, JSON.stringify({ port: resolvedPort }));
    } catch (e) {
        console.warn('[PORT_CONFIG] Could not save port config:', e.message);
    }

    server.listen(resolvedPort, () => {
        console.log(`[SERVER_STARTED] Server running on port ${resolvedPort}`);
        logger.info('SERVER', `Running on port ${resolvedPort}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[CRITICAL] Port ${resolvedPort} is already in use after check. This shouldn't happen.`);
            process.exit(1);
        } else {
            console.error('[CRITICAL] Server failed to start:', err.message);
        }
    });
};

startServer();


// Prevent crashes from stopping the entire server
process.on('unhandledRejection', (reason, promise) => {
    logger.error('SYSTEM', `Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
    logger.error('SYSTEM', `Uncaught Exception: ${error.message}`);
    // Optional: Only exit on truly critical errors
});

// Socket.io
io.on('connection', (socket) => {
    console.log(`[SOCKET_CONNECTED] Client: ${socket.id} | Origin: ${socket.handshake.headers.origin || 'unknown'}`);
    logger.info('SOCKET', `Client connected: ${socket.id}`);
    
    socket.on('error', (err) => {
        console.error(`[SOCKET_ERROR] Client ${socket.id}: ${err.message}`);
        logger.error('SOCKET', `Socket error for ${socket.id}: ${err.message}`);
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`[SOCKET_DISCONNECTED] Client: ${socket.id} | Reason: ${reason}`);
        logger.info('SOCKET', `Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
});

io.on('error', (err) => {
    console.error(`[SOCKET_CRITICAL] Server error: ${err.message}`);
    logger.error('SOCKET', `Server-level socket error: ${err.message}`);
});
